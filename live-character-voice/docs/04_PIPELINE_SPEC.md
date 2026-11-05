# 04 — Pipeline Spec (stage by stage)

All defaults live in `config/engine.yaml` so they can be tuned without code changes. Values below are **starting points**; tune them with measurements and record changes in `docs/BUILD_LOG.md`.

---

## 1. Ingest + Live-speed Feeder — `engine/ingest/`

**Input:** a video or audio file (`.mp4`, `.mkv`, `.mov`, `.wav`, `.mp3`).

**Steps**
1. Decode once with FFmpeg to **16 kHz mono float32** for analysis:
   `ffmpeg -i in.mp4 -vn -ac 1 -ar 16000 -f f32le -` (read into numpy).
   Also keep the original file untouched for the final render.
2. The **feeder** releases audio in chunks of `chunk_ms = 500` at real-time pace:
   - `t0 = time.monotonic()` at session start.
   - Chunk *k* covers media time `[k*0.5, (k+1)*0.5)` and is released when `time.monotonic() - t0 >= (k+1)*0.5`.
   - Use `asyncio.sleep` until the release time; never release early.
3. Each chunk is published as `AudioChunk(index, media_start, media_end, samples)`.

**Speed modes:** `speed=1.0` is the default and the only speed allowed for reported numbers. For development only: `speed=0` (as fast as possible, unit tests) and `speed>1` (e.g. 4 for quick UI smoke tests). Reports must state the speed used and refuse to call a run "live" unless speed was 1.0.

---

## 2. VAD + Line Segmenter — `engine/segment/`

This stage decides **when a line is ready**. It is the heart of the delay vs. quality trade-off.

**VAD:** Silero VAD on 512-sample frames (32 ms at 16 kHz) gives speech probability per frame. Speech when `p >= vad_threshold (0.5)`.

**A "line" closes when ANY of these happens:**
| Rule | Default | Why |
|---|---|---|
| Pause: silence after speech ≥ `end_silence_ms` | 350 ms | Natural end of a phrase |
| Max length: line duration ≥ `max_line_s` | 6.0 s | Prevents long monologues from piling up delay |
| Burst: short high-energy speech (≤ 1.2 s, loudness ≥ `burst_db` above running median) followed by ≥ 200 ms drop | +10 dB | Catches "Goal!", "Yes!", "What a save!" immediately |
| Speaker change (soft): embedding of the last 1.5 s differs strongly from the line so far (cosine < `split_sim`) | 0.45 | Splits when the other commentator takes over mid-flow (enabled from Milestone 3) |

When a line closes on max length, cut at the lowest-energy 32 ms frame in the last 1.0 s so words are not split.

**Minimum line:** discard speech segments shorter than `min_line_ms = 250` unless they qualify as a burst.

**Padding:** include `pad_ms = 120` of audio before and after the line for ASR (improves first/last word accuracy). Line times stored in the record are the unpadded ones.

**Output:** `LineCandidate(line_id, t_start, t_end, audio, close_reason)` → record + event `line.created`.

---

## 3. ASR — `engine/providers/free/asr_faster_whisper.py`

- Model: `small.en`, `device="cpu"`, `compute_type="int8"`, `cpu_threads=4` (tune), `beam_size=1`, `vad_filter=False` (we already did VAD), `word_timestamps=True`, `condition_on_previous_text=False`.
- **Prompting for continuity:** pass `initial_prompt` = last ~25 words of the previous two lines + a glossary (team names, player names from `config/glossary.txt`). This improves names and context. Keep it short.
- Output: `ASRResult(text, words=[(word, start, end, prob)], avg_logprob, no_speech_prob)`.
- Reject as noise if `no_speech_prob > 0.6` and text has < 2 characters.
- Post-process text: strip, collapse spaces, keep punctuation (TTS uses it for prosody).
- Fallback model if the per-line ASR time p95 > 1.5 s: `base.en`.

**Captions mode** (`source: captions`): read `.srt/.vtt`, align cues to lines by time overlap; if a cue overlaps two lines, split by word count proportion. Speaker ID and emotion still come from audio. Report must note captions mode and its built-in lag.

---

## 4. Speaker ID — `engine/providers/free/speaker_ecapa.py` + `engine/speakers/online_cluster.py`

**Embedding:** ECAPA embedding of the line audio (if line > 3 s, average embeddings of 1.5 s windows with 0.75 s hop). L2-normalise.

**Online clustering (our code):**
- Keep up to `max_speakers` centroids (POC 2, Pilot 3).
- New line: cosine similarity to each centroid.
  - If best ≥ `assign_sim (0.55)` → assign; update centroid with exponential moving average (`alpha = 0.1`), but only if the line is ≥ 1.0 s (short lines are noisy).
  - Else if fewer than `max_speakers` centroids exist and line ≥ 1.5 s → create a new speaker.
  - Else → assign best match, mark `confidence = low`.
- **Short-line rule:** lines < 0.8 s inherit the previous line's speaker unless best similarity to another speaker ≥ 0.7.
- **Optional enrollment (recommended for real clips):** `config/enroll.yaml` lists 5–15 s reference spans per commentator (`name`, `t_start`, `t_end`). Centroids are initialised from these and names come from here. The synthetic clip writes its own enroll file.
- Output: `speaker_id` (`S1`, `S2`, `S3` or enrolled name), `similarity`, `confidence`.

---

## 5. Emotion — `engine/providers/free/emotion_prosody.py`

**Features per line** (all cheap):
- `loudness_db`: RMS in dBFS, compared to a running median of the last 60 s (relative loudness matters, not absolute).
- `pitch_hz_median` and `pitch_range`: YIN (`librosa.yin`, fmin 70, fmax 400) on voiced frames, compared to that speaker's running median.
- `rate_wps`: words per second from ASR word timestamps.
- `text_cues`: exclamation marks, keywords list in `config/emotion_keywords.yaml` (e.g. goal, score, unbelievable, what a, save, wow, yes, no way).

**Score:** `arousal = 0.45*z(loudness) + 0.30*z(pitch) + 0.15*z(rate) + 0.10*text_cue_score`, clipped to [-2, 3].

**Labels:**
| arousal | label | meaning |
|---|---|---|
| < -0.5 | `calm` | quiet build-up, analysis |
| -0.5 … 0.8 | `neutral` | normal play-by-play |
| 0.8 … 1.8 | `excited` | big chance, good play |
| ≥ 1.8 | `peak` | goal, wicket, buzzer-beater |

Smooth with the previous line of the same speaker (`0.7*current + 0.3*previous`) unless the jump is upward (excitement must not be delayed). Output `EmotionResult(label, arousal, features)`.

---

## 6. Live Record — `engine/record/`

See `05_LIVE_RECORD_AND_PROTOCOL.md` for the exact schema. Key rules:
- Single source of truth for the session. Every stage writes its result + a wall-clock stamp into the line.
- Writes are done on the event loop thread only (stages return results; the orchestrator writes). No locks needed.
- Every write publishes an event. The TTS worker subscribes to `line.complete` (ASR + speaker + emotion all present).
- Reads by time: `lines_between(t_a, t_b)`, `last_n(speaker_id, n)`, `get(line_id)`.
- Checkpoint to `record.json` every 30 s and at the end.

---

## 7. TTS — `engine/providers/free/tts_kokoro.py` + `engine/tts/worker.py`

- Kokoro pipeline (`KPipeline(lang_code='a')` American / `'b'` British) loaded once per language; 24 kHz output.
- Voice for a line = `voice_map[speaker_id]` (set by config in POC, by the viewer in Pilot).
- **Delivery style from emotion** (see `08_VOICES_AND_EMOTION.md` for the full table): speed, gain, text shaping (e.g. add "!" for `peak`), optional small pitch shift.
- **Text normalisation:** expand numbers/scores ("2-1" → "two one"), keep names from the glossary, remove filler ("uh", "um").
- **Long lines:** split on punctuation into ≤ 2 sentences per synth call; concatenate with 60 ms gaps; start synthesis of the first part as soon as text is ready.
- **Worker pool:** `tts_workers = 2` threads. Order of completion may differ from line order; the scheduler handles ordering.
- **Cache:** `(line_id, voice_id, style_hash)` → wav path. Re-use when a viewer switches back to a voice.
- Output: `TTSResult(audio, sr, duration_s)`; record stamps `tts_ready_wall`.

---

## 8. Scheduler — `engine/schedule/`

Decides **when each generated line plays** and keeps delay from building up.

**Mode for A and B: `fast`** — play each line as soon as it is ready, but never before its own `t_start` (wall), never overlapping another line on the same output channel unless it is a different speaker and overlap ≤ 300 ms.

**Play time:**
`play_at = max(tts_ready_wall, previous_line_end_wall + gap_ms(80 ms))`

**Catch-up policy** (runs before each line is scheduled):
- `lag = play_at − wall_time_of(line.t_end)`
- If `lag > lag_soft (3.5 s)`: speed TTS playback up to 1.15× (time-stretch with `librosa.effects.time_stretch`, or re-synthesize with Kokoro `speed` +0.15).
- If `lag > lag_hard (6.0 s)`: drop lines with label `neutral` and duration < 1.2 s ("filler"), never drop `excited`/`peak`; if still behind, merge consecutive lines of the same speaker into one synth call.
- Every action is logged on the line (`schedule_action: none|speedup|dropped|merged`).

**Drift check:** every 60 s, fit a straight line to (media time → delay). Slope must stay ≈ 0. If slope > 0.02 s/s, log a warning in the record.

**Synced mode (render-only preview, not a product feature yet):** `play_at = wall_time_of(line.t_start) + D`, where `D` = the 95th-percentile delay of the run. Used only to produce `demo_synced.mp4`.

---

## 9a. Offline Renderer — `engine/render/`

Produces the demo files from the final record (after the live run):
- `demo_live.mp4`: original video; original audio **ducked** to `duck_gain = 0.25` (−12 dB) while a new voice line plays (80 ms ramps), plus new voice lines placed at their `play_at` media positions (as measured live).
- `demo_synced.mp4`: same, but lines placed at `t_start + D`, and the video delayed by `D` (pad start) so voices line up with the action.
- `voices_only.wav`: just the generated voices on the timeline (useful for judging voice quality).
- Implement mixing in numpy at 48 kHz, write WAV, mux with FFmpeg: `ffmpeg -i original.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k out.mp4`.
- Optional flag `--separate`: run Demucs offline on the original audio, use the "no vocals" stem instead of ducking → `demo_live_clean.mp4`. Not part of the live path. Label clearly in the report.

## 9b. Live Out (Pilot) — `app/`
See `06_BACKEND_SPEC.md` and `07_FRONTEND_SPEC.md`. The scheduler sends `audio_ready` messages with `play_at_media` so the browser plays each line at the right moment relative to the video.

---

## 10. Metrics + Report
See `09_TESTING_METRICS_REPORT.md`.

---

## Time budget per line (targets on 4 vCPU, to be measured)
| Step | Target p50 | Target p95 |
|---|---|---|
| Wait for line to close (end-of-speech detection) | 0.35 s | 0.5 s |
| ASR (`small.en`, ~3 s line) | 0.8 s | 1.5 s |
| Speaker + emotion (parallel to ASR) | 0.1 s | 0.3 s |
| TTS first audio (Kokoro, ~3 s of speech) | 0.8 s | 1.6 s |
| Scheduling + transport | 0.05 s | 0.2 s |
| **Total delay after line ends** | **≈ 2.1 s** | **≈ 3.8 s** |

These targets are estimates for planning. The first real numbers come from Milestone 7. If measured numbers miss the targets by a lot, the first levers are: smaller ASR model, shorter `max_line_s`, more `cpu_threads`, 2 TTS workers → 3.
