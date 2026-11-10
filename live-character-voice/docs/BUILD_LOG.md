# Build Log

## 2026-11-05 — M0: Environment and skeleton

**Environment (measured with `python -m engine.cli check`)**
- Python 3.12.3 in `.venv` (system default is 3.13.18, but `kokoro`/`misaki` require < 3.13).
- Node v22.23.4, npm 10.9.9, uv 0.11.32.
- FFmpeg 6.1.1, espeak-ng 1.51 (installed via apt this session), SoX 14.4.2, libsndfile 1.2.2.
- CPU count 4, RAM 15.7 GiB, no GPU.
- torch 2.15.0+cpu (CUDA not available, as intended), torchaudio 2.11.1+cpu.
- Network: huggingface.co OK, HF file download via CDN (us.aws.cdn.hf.co) OK, download.pytorch.org
  OK. No domains blocked.

**Decisions**
- The repo is not empty (it holds the unrelated "Think AI" Next.js project at the root, with its own
  `CLAUDE.md`, `app/` and `docs/`). The kit is built in the self-contained
  `live-character-voice/` folder so nothing existing is overwritten. CI lives at the repo root
  (`.github/workflows/live-character-voice-ci.yml`, GitHub only reads workflows there) and is
  path-filtered to this folder.
- CI workflow is stored at `ci/live-character-voice-ci.yml`: the push was refused because the Claude
  GitHub App lacks the `workflows` permission. The user must move it to `.github/workflows/` to activate.
- Python deps split into extras: core (light, CI), `models`, `api`, `dev`. CI installs core+dev only,
  so it never downloads torch or models. Verified in a separate clean venv: lint + tests pass.
- Frontend pinned to React 18 (per docs/03) with TypeScript 5.7, ESLint 9, Vite 6, Vitest 3. Newer
  majors (React 19, TS 7, ESLint 10) are out but not needed; Tailwind/Zustand/router are added in M9.
- `Emotion` uses `StrEnum` (Python 3.11+) — same JSON values as docs/05.
- Added `error` field to `Line` (docs/06 §6.7 says failed lines are marked with the message) and a
  `style.pitch_shift` config key (docs/08 §8.3).
- No `make clean` target (removal commands are blocked by the session's safety check; not needed).

**Results**
- `make lint`: ruff + ruff format + mypy --strict (18 files) pass; eslint + tsc pass.
- `make test`: pytest 6 passed; vitest 1 passed.

**Open issues**
- ⚠ Licences outside the CLAUDE.md permissive list: `espeak-ng` (GPL-3.0, required by Kokoro's
  phonemizer, used as a separate system library) and `soxr` (LGPL-2.1, pulled in by librosa; removed
  as a direct dependency, we resample with scipy). Both are prescribed or implied by the kit itself.
  Needs a decision from the user; Piper (also espeak-based) would not avoid it.
- torch 2.15.0 and torchaudio 2.11.1 versions differ (newest each on the CPU index). Both import;
  real functionality is verified in M1 when SpeechBrain/Kokoro run. Pin a matched pair if it breaks.

**`check` output**
```
== System ==
  python     3.12.3
  platform   Linux-6.18.44-fc-v236-x86_64-with-glibc2.39
  cpu_count  4
  memory     15.7 GiB
== Checks ==
  [OK  ] ffmpeg                                     ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023 the FFmpeg developers
  [OK  ] ffprobe                                    ffprobe version 6.1.1-3ubuntu5 Copyright (c) 2007-2023 the FFmpeg developers
  [OK  ] espeak-ng                                  eSpeak NG text-to-speech: 1.51  Data at: /usr/lib/x86_64-linux-gnu/espeak-ng-data
  [OK  ] sox                                        sox:      SoX v14.4.2
  [OK  ] node                                       v22.23.4
  [OK  ] npm                                        10.9.9
  [OK  ] py:numpy                                   2.5.4
  [OK  ] py:pydantic                                2.14.2
  [OK  ] py:torch                                   2.15.0+cpu
  [OK  ] py:torchaudio                              2.11.1+cpu
  [OK  ] py:faster-whisper                          1.2.1
  [OK  ] py:ctranslate2                             4.8.5
  [OK  ] py:speechbrain                             1.1.2
  [OK  ] py:kokoro                                  0.9.4
  [OK  ] py:silero-vad                              6.2.3
  [OK  ] py:librosa                                 1.0.0
  [OK  ] py:fastapi                                 0.162.0
  [OK  ] py:uvicorn                                 0.54.0
  [--  ] model:Systran/faster-whisper-small.en      not downloaded yet (M1)
  [--  ] model:Systran/faster-whisper-base.en       not downloaded yet (M1)
  [--  ] model:speechbrain/spkrec-ecapa-voxceleb    not downloaded yet (M1)
  [--  ] model:hexgrad/Kokoro-82M                   not downloaded yet (M1)
  [OK  ] net:huggingface.co                         OK (HTTP 200)
  [OK  ] net:huggingface.co (file download via CDN) OK (HTTP 200)
  [OK  ] net:download.pytorch.org                   OK (HTTP 200)
```


## 2026-11-05 — M1: Models + synthetic test clip

**Models** (`scripts/download_models.py`, `outputs/models.json`): faster-whisper small.en 486 MB,
base.en 148 MB, SpeechBrain ECAPA 89 MB, Kokoro-82M (+54 voice packs) 356 MB — all MIT/Apache-2.0.
All 6 catalog voices exist. Kokoro's G2P (misaki) also needs spaCy `en_core_web_sm` (MIT, from
github.com releases — reachable). torch 2.15 + torchaudio 2.11 work together (Kokoro, ECAPA run).

**Benchmark** (`outputs/bench.json`, 10 runs, ~3.299 s real lines from the clip, 4 vCPU):
| Model | isolated p50 / p95 | contended p50 / p95 |
|---|---|---|
| ASR small.en (int8, 4 thr) | 1.075 / 1.248 s | 2.705 / 3.038 s |
| ASR base.en (int8, 4 thr) | 0.448 / 0.54 s | 1.022 / 1.13 s |
| ECAPA embedding | 0.33 / 0.368 s | — |
| Kokoro TTS (~3 s line) | 0.835 / 0.944 s | 2.01 / 2.742 s |
"Contended" = measured while the other models run non-stop in background threads (worst case).
Kokoro real-time factor: 4.92× (audio seconds per wall second). Load times
(warm cache): {'asr_small.en': 2.65, 'asr_base.en': 0.68, 'ecapa': 2.14, 'kokoro': 5.88}.

**Decision:** ASR = **small.en** (isolated p95 1.248 s ≤ 1.5 s rule). Risk: under full
contention small.en p95 is 3.038 s; base.en stays the configured fallback and M7 decides
from real live runs.

**Synthetic clip** (`make synth`): `data/clips/synthetic_match.mp4` — 178.4 s, 62 lines (A 39,
B 23; calm 15, neutral 24, excited 13, peak 10), 1280x720 H.264 + 48 kHz AAC; ffprobe confirms
video + audio and duration. Includes 4 overlaps (−250…−350 ms), a mid-sentence speaker change
(gap 0), single-word shouts ("Save!", "Goal! Goal!"), three goals with crowd roars.
- Source voices `am_fenrir` (A), `bf_isabella` (B), `bm_fable` (C, Pilot) — none of them are output
  voices. Deviation from docs/09 §9.1's example (`am_michael`/`bf_emma`): those are in our voice
  catalog (Coach, The Pro), which the same doc forbids, so different Kokoro voices were used.
- Source emotion shaping (speed, level, pitch): calm 0.92/−3 dB/−0.5 st, neutral 1.0/0/0,
  excited 1.10/+4 dB/+1 st, peak 1.18/+9 dB/+2.5 st. Speech −21 dBFS RMS, crowd bed −28 dBFS,
  roars +10 dB after every peak line.
- Also written: `.truth.json`, `.vtt` captions (for captions mode), `config/enroll.synthetic.yaml`
  (first ~8 s of solo speech per speaker; supports multiple spans per speaker).
- Enrolled speakers keep ids S1/S2 and get display names from the enroll file (simpler voice_map).

**Tests:** 21 unit tests pass (text normalisation, style, captions parser, audio helpers, truth).


## 2026-11-05 — M2: Ingest, live-speed feeder, VAD, segmenter, live record

**Built:** `engine/ingest/` (FFmpeg decode, live-speed feeder with a session clock — chunks are
released only when the clock reaches their end), `engine/segment/` (streaming Silero VAD, frame
segmenter), `engine/record/` (RecordStore + asyncio event bus, ordered lines, checkpoints),
`engine/orchestrator.py` (full session wiring, stage-gated with `--stop-after`),
`python -m engine.cli poc` (writes record.json, lines.csv, metrics.json, run.log).

**First live run** (`outputs/20261105-050941_synthetic_match_m2`, speed 1.0, spec defaults):
lines ratio **0.726** (45/62) — target 0.8–1.3 missed; shouts on their own line 0/5.
Evidence (VAD probabilities inside every truth gap, `scripts/tune_segmenter.py`):
1. Excited commentary runs phrases together with 200–300 ms gaps (< end_silence 350 ms).
2. Crowd roars right after `peak` lines are scored as speech by Silero (mean p 0.81 in the gap),
   so pauses after a goal never reach 350 ms. Real crowds contain voices: a real-world effect.
3. Inside-line comma pauses reach 256 ms, so lowering end_silence to ~250 ms would split sentences.

**Fix (added rules, spec defaults kept):**
- `level_change`: at a micro-pause ≥ 96 ms, if the next 160 ms of speech is ≥ `level_split_db`
  (6 dB) louder/quieter than the line so far, close the line at the micro-pause. Isolates a shout
  that starts right after a phrase, and the end of a shout.
- `burst` end may also be an energy drop (level ≥ 6 dB below the shout for ≥ 200 ms) while the
  VAD stays on (crowd roar).
- Offline grid (end_silence 250/300/350 × level_split 5/6/off × burst_db 8/10): the spec defaults
  + level split 6 dB give ratio 0.903 with the fewest mid-line cuts among passing settings, so
  end_silence 350 ms and burst_db 10 dB are kept (no tuning to the synthetic clip's exact gaps).

**Accept run** (`outputs/20261105-051523_synthetic_match_m2`, speed 1.0):
| Check | Target | Result |
|---|---|---|
| lines ratio (out/truth) | 0.8–1.3 | **0.903** (56/62) ✅ |
| "GOAL!" / short shouts detected | all | **5/5** detected, 3/5 on their own line ✅ |
| run time vs clip duration | ±2 s | live part **178.38 s** for a 178.36 s clip ✅ (whole command 180.1 s incl. decode + VAD load) |
Close reasons: pause 43, level_change 6, burst 5, max_len 2. 6 lines still span two speakers
(4 scripted overlaps + the mid-sentence handover) — the speaker-change split arrives with M3.

**Also built ahead for later milestones** (tested in their milestones): online clustering,
scheduler maths, TTS worker + cache, renderer, metrics. 42 unit tests pass.

**Pilot clips generated:** `synthetic_match_3spk.mp4` (111 s, 36 lines, A/B/C) and
`synthetic_match_20min.mp4` (1299 s = 21.7 min, 432 lines; the generator now measures real audio
length instead of estimating words/s, which first produced only 16 min).


## 2026-11-05 — M3: ASR + speaker ID

**Built:** faster-whisper provider (glossary + last ~25 words as `initial_prompt`, noise rejection),
captions provider (SRT/VTT, word-proportional split), ECAPA provider (1.5 s windows averaged for
lines > 3 s), online clustering with the short-line rule and enrollment, speaker-change soft split.
ASR, speaker and prosody run concurrently per line; every stage is stamped and logged.

**Accept** (speed 1.0, `--stop-after understand`):
| Run | WER (≤ 15 %) | Speaker accuracy (≥ 85 %) |
|---|---|---|
| no enroll — `outputs/20261105-051931_synthetic_match_m3` | **10.9 %** ✅ | **92.9 %** ✅ (line-level 96.4 %) |
| enroll — `outputs/20261105-052242_synthetic_match_m3_enroll` | **11.2 %** ✅ | **93.8 %** ✅ (line-level 96.6 %) |
Stage timings (no enroll): close-wait p50 0.54 / p95 0.81 s, ASR p50 1.30 / p95 2.40 s,
speaker p50 0.23 / p95 0.57 s. With enrollment the speaker-change split fired twice (it needs
centroids to confirm a change). 24–27 lines are "low confidence" (best similarity < 0.55) but are
still assigned correctly in most cases.

## 2026-11-05 — M4: Emotion

**Built:** prosody provider — loudness vs 60 s running median, pitch (YIN) vs the speaker's running
median, words/s, keyword + "!" cues; weights 0.45/0.30/0.15/0.10; arousal clipped to [−2, 3];
smoothing with the same speaker's previous line except upward jumps.

**Measured & changed** (offline replay on the M3 lines, `scratchpad emo_eval`; same text/audio):
| Variant | exact | within one | peaks |
|---|---|---|---|
| spec: whole-line RMS, median pitch | 48.4 % | 96.8 % | 5/10 |
| loudest 1 s window + pitch p75 | **59.7 %** | 95.2 % | **7/10** |
| fixed scales (4 dB / 2 st / 1 wps per unit) | 45.2 % | 98.4 % | 4/10 |
Kept: loudness = loudest 1 s window (speech level of the most intense moment, not diluted by
pauses), pitch = 75th percentile of voiced frames, robust (MAD) z-scores. Spec thresholds kept.

**Accept** (final POC runs): within one step **96.8 %** ✅ (≥ 80 %), exact 59.7 %; peaks
**7/10** ❌ (target: every truth peak). Why: the 3 missed peaks ("Off the crossbar!", "Okafor
equalises…", "What a time to score…") are merged by the segmenter into longer lines that also hold
calmer speech or a crowd roar, so the line's arousal (0.5–1.4) stays below the 1.8 peak threshold.
Also Whisper almost never transcribes "!" (it writes "."), so the punctuation cue rarely fires.
Top fixes: (1) emotion per sub-line window with the TTS delivery switching mid-line, (2) better
peak isolation in the segmenter (lower level_split_db for very loud onsets), (3) a learned emotion
model (e.g. emotion2vec, licence to check) instead of rules.

## 2026-11-05 — M5: TTS + voices + emotion delivery

**Built:** Kokoro provider (per-language pipelines, sentence-chunked synthesis with 60 ms gaps,
silence trimmed, soft limiter at −1 dBFS), text normalisation (scores, numbers, ordinals, minutes,
fillers, glossary protection), style mapping (speed/gain/punctuation per emotion, intensity scaled
by arousal; pitch shift off by default), TTS worker pool with a `(line, voice, style)` cache,
3-second voice previews at API start-up, catch-up time-stretch (librosa, with a workaround for a
librosa 1.0 bug on some lengths at 1.15×).

**Measured & changed:** generated speech was 1.3–1.45× longer than the original lines → playback
fell behind on busy commentary. (1) Kokoro adds ~0.2–0.3 s silence at both ends → trimmed.
(2) Voices differ in pace: median TTS/original duration at speed 1.0 after trimming: bm_george
1.33, bm_lewis 1.22, am_michael 1.16, bf_emma 1.06, am_adam 1.04, af_bella 1.04 → `base_speed`
1.25 / 1.15 / 1.1 for the slow ones (`config/voices.yaml`). Final runs: TTS/original ratio p50 0.93.

**Accept** (final POC runs): every complete line got audio except 1 dropped filler (55/56) ✅;
`voices_only.wav` produced ✅; no clipping (0 files, max peak −2.4 dBFS) ✅; TTS p95 for a line
**3.28 s** ❌ (target 1.6 s). Isolated, Kokoro needs 0.81–0.84 s for a 3 s line (meets the target);
live it shares 4 vCPUs with Whisper (see M7).

## 2026-11-05 — M6: Scheduler + renderer

**Built:** fast-mode scheduler in line order (gap 80 ms, ≤ 300 ms cross-speaker overlap only where
the originals overlapped), catch-up (speed-up between lag 3.5 and 6 s, filler drop and same-speaker
merge beyond 6 s), drift check every 60 s, per-line error isolation (a failing line never stops the
session). Renderer: numpy mix at 48 kHz, ducking envelope (80 ms ramps, 150 ms hold), FFmpeg mux at
720p CRF 28 with an automatic size ladder, synced-mode render, optional Demucs path (`--separate`,
not installed by default).

**Deviation:** synced-mode D = p95 of (tts_ready − t_start), not p95 of the delay after t_end — only
then would 95 % of lines actually be ready when played at t_start + D (D ≈ 10.1–10.3 s here).

**Accept** (final runs): `demo_live.mp4` and `demo_synced.mp4` produced, durations match the clip
(+D for synced) ✅; ducking: original −12.04 dB inside voice lines vs 0.0 dB outside → depth
**12.0 dB** ✅ (≥ 9 dB, measured on the mix before encoding). Demo files 19.5 MB each (< 25 MB).

## 2026-11-05 — M7: Metrics + report → POC complete

**Built:** `engine/metrics/compute.py` (delay ready/play, stage breakdown, drift + 10-min
extrapolation, WER via jiwer with number normalisation, speaker accuracy by Hungarian matching on
10 ms grid, emotion exact/within-one/confusion/peaks, segmentation, coverage, schedule actions,
voice-quality checks), `report.md` (8 sections, human listen-test checklist) + `delay_over_time.png`,
`lines.csv`, `python -m engine.cli report --run …`.

**Delay tuning (every run live at speed 1.0, nothing else running unless noted):**
| Run | Change | median / p95 delay | ASR p50/p95 | TTS p50/p95 | WER |
|---|---|---|---|---|---|
| `…_poc1` | baseline: 4 ASR + 4 torch threads | 4.09 / 5.21 | 1.41 / 2.80 | 2.03 / 3.09 | 10.9 % |
| `…_poc2` | 2 + 2 threads (npm install ran meanwhile → confounded) | 4.68 / 6.63 | 1.85 / 3.85 | 2.13 / 3.27 | 10.9 % |
| `…_poc3_base` | ASR base.en | **3.54** / 4.65 | 0.77 / 1.71 | 2.09 / 3.26 | **19.8 %** ❌ |
| `…_poc4_lane` | one priority compute lane (ASR+TTS serial) | 8.86 / 11.75 (drift +0.03) | 5.09 queued | 3.34 | 11.4 % |
| `…_poc5_nolane` | incremental speaker-split embeddings | 4.25 / 5.49 | 1.52 / 3.19 | 2.04 / 3.24 | 10.9 % |
| `…_poc6_lane` | lane again, cheaper split | 8.59 / 10.83 | 4.51 queued | 3.26 | 11.4 % |
| `…_final1-3` | + feeder chunk 250 ms | **4.14** / 5.42 (median of 3) | 1.48 / 2.80 | 2.10 / 3.28 | 10.9 % |
| `…_distil1` | ASR distil-small.en | 5.59 / 25.4 | — | — | 137 % (hallucination) |
Findings: (a) the speaker-change check embedded the whole line-so-far every second (0.5–0.7 s CPU
for 4.5–6 s of audio) → now only the newest 1.5 s window (0.12 s); (b) running ASR and TTS
concurrently uses the 4 cores better than taking turns (lane) even though each call is slower;
(c) OMP_WAIT_POLICY=PASSIVE made no difference (thread spinning is not the cause); (d) G2P is 3 ms,
Kokoro's acoustic model is the TTS cost; ONNX Runtime fp32 is ~15 % faster at 2 threads and equal at
4 → kept as the optional `kokoro_onnx` provider, not the default; (e) Whisper word timestamps cost
only ~6 %; (f) distil-small.en hallucinates with an initial prompt and has 16–17 % WER without.
Final config: ASR small.en int8 4 threads, torch 4 threads, compute lane off, chunk 250 ms.

**Accept (POC), three runs `outputs/20261105-061712/062141/062601_synthetic_match_final1-3`:**
median delay **4.14 s ❌ (target ≤ 4.0, missed by 0.14 s)**, p95 5.42 s ✅, drift −0.0009 s/s ✅,
WER 10.9 % ✅, speaker accuracy 92.9 % ✅, crashes 0 ✅. Full table + top 3 fixes:
`outputs/poc_summary.md`. Demo files committed from the median run (`…_final2`).


## 2026-11-05 — M8: Backend API + WebSocket sessions

**Built:** `app/main.py` (FastAPI: health incl. RSS, voices, clips list/upload ≤ 2 GB, sessions
create/status/stop/record/lines.csv/report-as-HTML, static clips with HTTP Range (verified: 206),
TTS files, previews, built SPA served at `/`), `app/sessions.py` (models loaded once per process,
voice previews generated at start-up, ONE live session at a time → HTTP 409, an unstarted session
is replaced, metrics + report written at session end), `app/ws.py` (protocol of docs/05 §5.4:
session.ready/started, speaker.new/updated, line.complete, audio.ready with `play_at_media`,
metrics every 5 s, warning, session.ended; client start/set_voice/played/stop/ping→pong with
`server_wall`), `scripts/ws_client.py` (scripted session + scoring). 6 API unit tests (no models).

**Accept** (`scripts/ws_client.py`, `synthetic_match.mp4`, speed 1.0 → `outputs/pilot_m8/`):
| Check | Target | Result |
|---|---|---|
| line.complete received | ≥ 95 % of lines | **56/56 = 100 %** ✅ |
| audio.ready received | ≥ 95 % of lines | **55/55 = 100 %** ✅ (1 filler dropped by catch-up) |
| delay vs POC | within 10 % | p50 **4.18 s** vs 4.14 s (+1 %), p95 **5.33** vs 5.42 s (−2 %) ✅ |
WER 10.9 %, speaker accuracy 92.9 %, 0 crashes — identical to the CLI because it is the same engine.

**Memory finding:** server RSS grew 2.05 → 3.18 GB in the first session and +600 MB in the next.
Cause: native allocators (CTranslate2, torch, Kokoro allocate differently sized buffers per line)
across per-thread glibc arenas. Fixes: `MALLOC_ARENA_MAX=2` for the server (Makefile `dev`/`serve`,
devcontainer) → +739 MB then +248 MB per session (converging), plus `malloc_trim(0)` every 60 s
and at session end. Also: when the last viewer disconnects from a live session it is stopped after
15 s (an abandoned tab blocked the single session slot — found when the e2e session caused a 409).

## 2026-11-05 — M9: Web player

**Built** (`web/`, React 18 + TS strict + Vite + Tailwind 3 + Zustand + React Router 6):
Home (clips, upload, max commentators 2/3, enrollment option, backend health), Player (16:9 video,
"Start live playback" gesture, speaker cards with voice dropdown + preview, emotion chip with the
word + intensity meter, live transcript newest-first with per-line delay and catch-up markers,
delay HUD with LIVE badge, level sliders + ducking toggle, delay sparkline, CSV export, report
link), Report (iframe of the HTML report + downloads). Audio graph: video → MediaElementSource →
originalGain, TTS buffers → voiceGain; lines pre-loaded on `audio.ready`, started at
`ctx.currentTime + (play_at_media − video.currentTime)/rate`, ducking 80 ms / hold 150 ms with
merged overlaps, `played` reported back. Clock sync: ping/pong every 10 s, playbackRate nudges
±3 % beyond 300 ms, seek beyond 2 s. 13 vitest tests (doc message parsing, reducer, clock maths,
start-time maths, ducking envelope).

**Accept:** Playwright smoke (`web/e2e/smoke.mjs`, headless Chromium, speed 1.0, 3-speaker clip):
**SMOKE OK** — 21 transcript lines, 19 audio.ready, `set_voice` sent (switched to am_adam),
`played` sent by the browser, video at 65.3 s (H.264 plays in this Chromium). Committed:
`outputs/ui/player.png`, `outputs/ui/session.webm` (no audio — Playwright recordings are silent;
listen via the demo MP4s), `outputs/ui/smoke.json`. Note: with Chromium decoding + recording on the
same 4 vCPUs the delay in that session was higher (p50 5.8 s) than in headless runs.


## 2026-11-05 — M10: Voice switching, 3 commentators, stability → Pilot complete

**Built:** `set_voice` end-to-end (applies to every line whose TTS has not started; cache keyed by
line+voice+style), `max_speakers=3`, three-commentator synthetic clip (speaker C = `bm_fable`),
20-minute clip (21.7 min, 432 truth lines, names rotated each loop), voice-switch scoring in
`scripts/ws_client.py`, `scripts/pilot_report.py`, devcontainer for Codespaces
(`.devcontainer/live-character-voice/`), `make serve`, 5 integration tests (`make test-slow`, all
pass: each provider on a 3 s line + a 30 s end-to-end live run).

**Found & fixed during the stability runs:**
1. *Whisper hallucination* (20-min run #1, `outputs/pilot_20min_noguard`): a 0.16 s shout came
   back as 140 words (the initial prompt repeated) and another line as "Moreau, moreau, …"; their
   TTS took 23–32 s (max delay 39.8 s, WER 15.9 %). Fix: `engine/asr_guard.py` (drop words timed
   outside the audio, collapse ≥ 3 repeats, cap at 5 words/s + 3) and no context prompt for lines
   < 0.6 s. Run #2: max delay 7.9 s, WER 10.0 %.
2. *Memory:* RSS idle 1.9 GB → ~2.8 GB within the first minute of a session (models' working
   buffers), then a one-off +330 MB step mid-run #2 on the first very long line. Fixes:
   `MALLOC_ARENA_MAX=2`, `malloc_trim(0)` every 60 s, and warm-up with worst-case input sizes
   (6.5 s audio, a long sentence) at start-up. Run #3: +162 MB after the first minute.
3. *Abandoned sessions:* closing the browser left the single session slot busy (409 for the next
   viewer) → a live session with no viewers is stopped after 15 s.

**Accept (Pilot)** — `outputs/pilot_20261105/report.md`:
| Check | Target | Result |
|---|---|---|
| voice switch applies to the next unsynthesized line | ≥ 95 % | **56/56 = 100 %** (13 on the 3-speaker clip every 8 s + 43 on the 20-min run every 30 s) ✅ |
| 3-speaker accuracy | ≥ 85 % | **96.0 %** (3-speaker clip), **93.5 %** (20-min) ✅ |
| 20-min run: crashes | 0 | **0** ✅ |
| 20-min run: drift | ≈ 0 | **−0.00003 s/s** ✅ |
| 20-min run: p95 delay | ≤ 6.0 s | **5.11 s** (median 3.93, max 7.33) ✅ |
| 20-min run: memory growth | < 300 MB | **+162 MB** after the first minute (2-min troughs 2835 → 2997 MB; last-10-min slope +7 MB/min) ✅ |
20-min run #3 (`outputs/pilot_20min/`, session `20261105-073936_ad1b3c`): 396 lines, 386 voiced
(10 dropped/merged by catch-up), WER 10.0 %, line.complete/audio.ready coverage 100 %.

**Open issues / honest notes**
- POC median delay 4.14 s vs 4.0 s target (POC runs were before the ASR guard; the 20-min Pilot
  run with the guard measured 3.93 s median). Product-brief Pilot aim (≤ 3.5 s) not reached on 4
  vCPU — see `outputs/poc_summary.md` for the measured trade-offs and top 3 fixes.
- Peak emotion: 7/10 peaks detected on the POC clip (M4).
- TTS stage p95 3.3 s live vs 1.6 s target (CPU contention; isolated it meets the target).
- A live session uses ~1 GB more RAM than an idle server (working buffers), plateauing; a slow
  +7 MB/min trend remains in the last 10 minutes and should be re-checked on a 60-min run.
- Licences outside the permissive list (accepted by the user in this session): espeak-ng (GPL-3)
  and soxr (LGPL-2.1, via librosa).
- GitHub Actions workflow lives in `ci/` (the Claude GitHub App cannot push workflow files).


## 2026-11-05 — V2: hosted free providers + streaming playback

User supplied a Fish Audio key (free model `s2.1-pro-free`, $0) and a Groq key (free tier). Keys are
never written to the repo: Fish is read from FISH_API_KEY / FISH_API_KEY_FILE, Groq is injected by
the cloud proxy (locally: GROQ_API_KEY). `provider: auto` picks the hosted provider when its key is
present, else the local one; both hosted providers fall back to the local model per line on any
error (429 limit, 401, network), so a session never stops because of an API.

**Built**
- `providers/free/tts_fish.py`: Fish S2.1 with emotion tags (calm → [calm], excited → [excited],
  peak → [excited][shouting]); characters cloned per request from a ~6 s reference recorded with
  our own Kokoro voice (free tier cannot store voice models: HTTP 403 "model creation limit 0/0");
  streaming generator with chunk-consistent soft limiter.
- `providers/free/asr_groq.py`: Groq whisper-large-v3-turbo with word timestamps.
- Streaming TTS end to end: worker writes `<line>.part.wav` as chunks arrive and marks the line
  playable on the first chunk; scheduler starts it 0.15 s after first audio; server streams the
  growing file (`/media/tts/...part.wav`); player plays it through an <audio> element routed into
  the Web Audio graph. New metrics: delay to voice start (first audio, or the latest stall-free
  start), stream stalls; catch-up for streams = request faster speech (no time-stretch possible).

**Measured** (all live at speed 1.0, `data/clips/synthetic_match.mp4`):
| Run | Median / p95 delay to voice start | Median / p95 delay to voice playing | WER | Speaker acc. |
|---|---|---|---|---|
| POC baseline (local Whisper + Kokoro), median of 3 | 4.14 / 5.42 (ready) | 5.26 / 7.71 | 10.9 % | 92.9 % |
| `…_fish1` (Fish TTS, local ASR) | 4.06 / 5.30 (ready) | 4.94 | 10.7 % | 92.9 % |
| `…_groqfish1` (Groq ASR + Fish) | 3.21 / 4.41 (ready) | 4.20 | **7.2 %** | 92.9 % |
| `…_stream1` (+ streaming) | **1.80** / 2.65 | 3.76 / 6.00 | 6.9 % | 92.9 % |
| `…_stream2` (+ stream catch-up) | **1.80** / 2.86 | **2.83** / 5.62 | **6.9 %** | 92.9 % |
Stages (stream2): end-of-line detection 0.49 s, Groq ASR p50 0.40 s (p95 1.4), Fish first audio p50
0.77 s, Fish complete 1.96 s. 0 stream stalls, 0 clipped files, voice/original length ratio p50 0.98.
Fish quick tests: first audio 0.8–1.0 s, full 3 s line 1.8–2.1 s; reference 6 s vs 15 s saves ~0.3 s;
`latency: low` no faster than `balanced`. Cloned characters: 8/8 test lines closest (ECAPA) to their
own character reference; all intelligible to Whisper.
Browser (Playwright, Chromium on the same 4 vCPU): streamed lines started a median 23 ms after
their planned time.

**Remaining delay** is mostly queuing: dense commentary (the synthetic clip is 81 % speech) means a
line often waits for the previous voice to finish (schedule wait p50 0.7 s, p95 3.8 s).

## 2026-11-05 — V2.1: your own cloned voice + emotion fix

**Built**
- `engine/voices_custom.py`: instant voice cloning from an uploaded sample (audio or video).
  Consent checkbox required; the steadiest 15 s window with the most speech is picked
  automatically, loudness-normalised, auto-transcribed and stored in `data/voices/custom/<name>/`
  (git-ignored). Voice ids are `cu_<name>`; they appear in the voice list next to the built-ins.
- API: `POST /api/voices/custom`, `DELETE /api/voices/custom/{id}`; `/api/health` reports
  `voice_cloning`. Web: "Add your own voice" panel on the home page.
- Fish TTS clones custom voices per request with emotion tags; without a Fish key the line falls
  back to Kokoro (no cloning, no emotion — Kokoro cannot act).
- `engine/env.py`: keys are read from the git-ignored `.env`; `install_mac.sh` now asks for them
  (with the sign-up links) and stores them with `chmod 600`.
- `scripts/ws_client.py --voices S1=cu_test-voice` to run a scripted session with a custom voice.

**Measured**
- Reference length (same AI test voice, Fish): 8 s → similarity 0.47, first audio 0.94 s;
  15 s → 0.53, 1.17 s; 29 s → 0.36, 1.40 s. 15 s chosen (best likeness, small latency cost).
- Clone vs sample ECAPA similarity 0.46 (other voices ≈ 0). Emotion: calm line −25 dB vs peak
  line −16.6 dB loudness.
- Live session `20261105-121008_3568b3` (`outputs/pilot_custom_voice/ws_client.json`),
  S1 = cloned Test Voice, S2 = am_adam: 56 lines, audio coverage 100 %, WER 6.86 %, speaker
  accuracy 92.9 %, 0 crashes, 0 stalls; voice start p50 2.24 s / p95 3.21 s; voice playing
  p50 4.66 s / p95 7.75 s. Emotions used: neutral 36, excited 14, peak 6.
- Why "playing" is slower than with built-in voices: the cloned voice speaks slowly — its lines are
  a median 1.32× (p90 3.15×) the original length vs 0.92× for am_adam, so lines queue up; first
  audio 1.22 s vs 0.86 s.

**Open issues**: cloned-voice pacing (try a faster-speaking sample or a higher base speed);
`ws_client` `delay_ready_from_ws` is empty with streaming (server metrics are correct).

## 2026-11-05 — V2.2: show which engine is running
- Problem reported: on the Mac the app still used the offline voices. With provider `auto`, a
  missing/rejected key fell back to Kokoro silently.
- `engine/keycheck.py` (`make check-keys`): one tiny request per key, plain-language result.
  The server runs it at startup, prints `>>> VOICES: …` in the terminal and shows an
  online/offline banner on the home page with the sign-up link when a key is missing or rejected.
  `/api/health` gains `engines` and `fish_fallback_lines`.
- `make keys` (`scripts/setup_keys.sh`): asks for both keys, writes `.env` (chmod 600), checks them.
- Verified here: valid keys → both online; bad Fish key → "rejected (HTTP 401)", Kokoro used.

## 2026-11-05 — V2.3: professional voice cloning + redesigned UI (Studio / Voice Lab)

**Fish "professional" trained voices** need paid API credit: `POST /model` on the free account →
HTTP 403 "API model creation limit reached (0/0)". The app tries it once per pro voice and uses it
automatically (`reference_id`) on accounts that allow it.

**Built — free professional cloning** (`engine/voices_pro.py`, 1–10 min recording, background job):
VAD utterances (2.5–12 s) → main speaker only (ECAPA voice prints, medoid of the largest group,
cosine ≥ 0.45) → score (SNR, clipping, similarity) → calm/neutral/excited by robust z of loudness +
pitch (floors 1.5 dB / 10 Hz) → best ~12 s of references, one shared gain, light FFT denoise for
noisy sources → transcripts (Groq) → quality test in every mood (ECAPA similarity → 0–100 score).
API: `POST /api/voices/pro`, `GET /api/voices/jobs/{id}`, `GET /api/voices/custom/{id}`,
`POST /api/voices/{id}/say` (playground).

**Measured** on `synthetic_match.mp4` audio (178 s, two commentators + crowd):
- kept 75.6 s of the main voice, dropped 17 parts (the other commentator scored < 0.35 similarity,
  the main one 0.59–0.91); first version kept only 23 s because an 8 dB SNR gate removed speech over
  the crowd → gate lowered to 3 dB, SNR used for ranking only.
- references per mood, 3 runs each (similarity to the real voice):
  excited line with excited refs 0.33 (0.11–0.48), with neutral refs **0.69** (0.66–0.71);
  peak 0.30 vs **0.68**; calm 0.68 vs **0.75**. → live lines use the steady neutral references in
  every mood; emotion comes from Fish's tags (`mood_refs: true` re-enables per-mood references).
- instant vs professional on the same file (2 runs per mood): instant 0.54 / 0.44 / 0.37
  (calm / neutral / excited, mean 0.45 — its 15 s window included the other commentator) vs
  professional **0.74 / 0.61 / 0.69 (mean 0.68)**; quality score 84.
- pro clone through the browser UI: 44 s end to end; playground line (peak mood) 3.4 s.

**UI/UX redesign**: new design system (glass panels, gradient accent, Inter/Sora/JetBrains Mono),
app shell with Studio / Voice Lab navigation and live engine status pills.
Studio: hero, footage cards with video thumbnails + drag-and-drop upload, new "Cast the voices"
step (voice per commentator before starting, sent as `voice_map`), sticky "Go live" summary.
Voice Lab: Instant vs Professional mode cards, upload (waveform + duration check) or record in the
browser with a reading script (calm / normal / excited), live step-by-step progress with log, voice
detail (likeness ring, test per mood, the clips picked from the recording), playground (any line,
any voice, calm → peak, history + download), library with filters. Player/report restyled.
Checks: tsc + eslint clean, vitest 13/13, pytest 66 passed, e2e smoke OK (delay p50 1.9 s,
p95 2.4 s, voice switch OK), no horizontal scroll at 390 px, no console errors.

## 2026-11-06 — V2.4: "voice cloning asks for keys" on the Mac
- Cause: Fish support (V2) added Python packages (msgpack, requests); the Mac install predates it and
  the update steps only rebuilt the web app → the key check failed on import and the app reported
  Fish as offline even with a correct key.
- `make serve` now runs `make deps` first: installs missing Python/web packages automatically.
- `make doctor`: packages, tools, keys (masked), live key test, port 8000 — one screen to share.
- Key check names a missing package instead of "could not reach".
- In-app "Connect your free keys" dialog (header pills / Keys button / Voice Lab / banner):
  `POST /api/keys` (this computer only) tests each key, saves only working keys to `.env`
  (chmod 600), never echoes them, and hot-swaps speech-to-text and voices without a restart.
- Verified: server started with no keys (cloning False) → key pasted in the dialog → "Connected"
  after 21.6 s → cloning True, no restart; a wrong key → "rejected (HTTP 401)", not saved.

## 2026-11-06 — V3: Synced mode (near-zero felt delay), no dropped lines, pause + player features

**New measurement** — `scripts/spoken_check.py`: re-transcribes every generated voice file (local
Whisper small.en, beam 5) and scores what was ACTUALLY spoken against the truth script; plus the
**felt delay** = voice start − ORIGINAL line start in the viewer's timeline (now the headline in
metrics, the live HUD and reports). The old "voice start" number was measured from the line END,
which hid ~2.6 s of line length.

**Diagnosis** (baseline `20261106-070640_406eab`, V2 settings): felt delay p50 6.5 s / p95 14.0 s /
max 16.9 s; 42 of 56 lines sped up, 1 dropped. Lines can only be voiced after they end, commentary
is 81 % speech, so voices queued behind each other → speed-ups, drops, growing delay.

**Built**
- Duration fit (`schedule.fit_duration`, `max_fit_speed` 1.3): each line is asked to fit the
  original line's length, with the speaking rate learned per voice (EMA of s/char); a queue that
  still forms is absorbed in the next lines. Replaces the V2 backlog speed-up.
- Phrase splitting (`segment.phrase_min_s` 2.0, `phrase_pause_ms` 160): a phrase closes at a
  breath once ≥ 2 s long — shorter units, natural cut points instead of mid-word max_len cuts.
- Synced mode (`schedule.broadcast_delay_s`, API `view_delay_s`): the viewer's picture runs D
  seconds behind live (like a TV broadcast delay); each line is scheduled at t_start + D, so the
  voice starts with the original line. No drops in synced mode; lines whose full file will be
  ready in time play as complete files (no streaming stalls). Client: countdown while the first
  voices are prepared, video target = server time − D.
- Pause/resume end to end: `SessionClock.pause/resume` (feed, ASR, TTS scheduling freeze with the
  picture), WS `pause`/`resume` → `session.paused`/`session.resumed`; browser suspends the
  AudioContext and streamed lines (now started by the audio clock, not wall-clock timers).
- Player: Pause/Resume, SYNCED/LIVE badge, live subtitles of the voice that is speaking (speaker
  colour), shortcuts (Space, M, V, C, F, ?), full screen, mute toggles, voiced/skipped counters,
  felt-delay HUD. Studio: Synced (recommended, picture delay 3–10 s, default 6) vs Live.

**Measured** (synthetic_match.mp4, 3 min, live speed, Groq + Fish; felt delay p50 / p95 / max):
| Run | Felt delay | On time (≤0.3 s) | Dropped | ASR WER | Spoken WER (deletions) |
|---|---|---|---|---|---|
| baseline V2 `…070640` | 6.47 / 14.03 / 16.85 | 0 % | 1 | 7.2 % | 7.2 % (7) |
| + fit `…071524` | 5.50 / 8.19 / 9.29 | 0 % | 1 | 6.9 % | 8.2 % (7) |
| + fit + phrases (= Live mode) `…072008` | 4.91 / 5.92 / 7.09 | 0 % | **0** | 6.5 % | 9.3 % (7) |
| **Synced 6 s** + fit + phrases `…074053` | **0.00 / 0.43 / 1.22** | **90 %** | **0** | 6.9 % | 9.0 % (4) |
| Synced 6 s, max fit 1.12 `…074600` | 0.00 / 0.43 / 1.24 | 85 % | 0 | 6.9 % | 9.0 % (4) |
| **Synced 6 s, 3 commentators** `…075317` (1:51) | **0.00 / 0.14 / 0.28** | **100 %** | 0 | 9.9 % | 9.9 % (4) |
Live-mode floor: line length (p50 2.6 s) + end detection 0.48 + ASR 0.47 + Fish first audio 0.79 s
— a line cannot be re-voiced before it has been said, hence Synced mode for "real time".

**Rejected (measured)**
- ASR context window (`asr.context_s` 1.5 s of audio before the line, words kept by timestamp):
  WER 15.4 % vs 6.9 % — Whisper word timestamps are too loose at line edges (`…073615`). Off (0).
  A first run (53 %) also exposed that the hallucination guard used the line length, not the
  sent audio length — fixed.
- Emotion threshold re-tuning on 3 sessions: best exact 56.5 % vs 55.9 % now — no real gain;
  prosody alone does not separate calm from neutral on this clip. Kept as is.
- Lower fit cap in synced mode (1.12): same spoken WER, fewer lines on time → kept 1.3.
Remaining word errors are mostly names (Moreau/Lindqvist) and very short shouts ("Save!").
Browser test: countdown → synced start; Space paused video 0.00 s drift for 3 s and resumed
exactly; subtitles toggle; e2e smoke OK (15/15 lines voiced). Tests: pytest 72, vitest 13.

## 2026-11-06 — V4: live streams — Chrome extension, Live capture page, live ingest API

**Built** (design and comparison in `docs/LIVE_STREAMING.md`)
- Engine live input: `engine/ingest/live.py` (`LiveSource`, `MediaClock` = time from received
  samples), `Session(live=…)`, `POST /api/live/sessions`, binary PCM16 frames on the session
  WebSocket, input kept as `live_input.wav`, capture-client disconnect ends the session; CORS for
  the extension; built web files (e.g. `/pcm-worklet.js`) served.
- Browser relay `web/src/live/relay.ts`: AudioWorklet resampler (`public/pcm-worklet.js`, one-pole
  LPF + linear interpolation → 16 kHz PCM16), original replayed through a DelayNode and ducked,
  voices scheduled at t0 + play_at_media + D on the same AudioContext, still-generating lines
  streamed (`.part.wav` via a media element), `DelayedVideo` (MediaRecorder VP8 → MSE, synced to the
  audio clock, old video trimmed).
- Web app **Live capture** page (`/live`): any tab/window via Chrome's share picker
  (`suppressLocalAudioPlayback`), synced/live, cast, levels, delayed picture, subtitles,
  transcript, live voice switching, report link.
- **Chrome extension** (`extension/`, MV3): popup (engine status, mode, delay, cast), background
  service worker (`tabCapture.getMediaStreamId`), Synced viewer window (tab picture + sound
  delayed, voices on time, subtitles, transcript, live voice switch), Live overlay (offscreen
  document + on-page subtitles), shared relay bundle (`make extension`).
- `scripts/live_stream_client.py` (+ `make live-test`): streams a file or any live URL (ffmpeg;
  page URLs via yt-dlp `--resolve`) to the live API in real time.

**Measured**: see `docs/LIVE_STREAMING.md` — live ingest 60/60 lines voiced, felt delay p50 0.00 s,
p95 0.62–1.69 s, 80–85 % on time; Live capture page ASR WER 6.5 %; extension viewer picture held
exactly 6 s, 0 late lines. Bugs found by testing: worklet URL served as HTML (SPA fallback) →
real files now served; relay waited for whole streamed files (21/59 late) → streams on first
bytes (0 late).
**Not automatable**: Chrome's tab picker and the extension permission click need a real user.

## 2026-11-06 — V5: hosting (Vercel web app + Hugging Face Space engine)
- Vercel Functions cannot host the engine (500 MB bundle limit vs PyTorch + models; WebSockets
  close at the function's max duration — 300 s on Hobby; per-request instances vs per-session
  state). Engine → Docker Space (free CPU basic, 2 vCPU / 16 GB, WebSockets), web app → Vercel.
- Built: remote engine base for the web app (`VITE_API_BASE`), access code (`LCV_ACCESS_CODE`,
  HTTP + WebSocket middleware, app gate, extension field), CORS for *.vercel.app / *.hf.space,
  `deploy/huggingface` (Dockerfile, Space README, `start.sh`), self-update (start.sh pulls on start;
  the app restarts onto a new GitHub commit when idle), `docs/HOSTING.md`.
- Tested: separately served build (other origin) + engine with access code — gate, Voice Lab,
  playground, full synced session; start.sh brings up the engine at the pushed commit.
- Vercel via the connector: project creation refused (403 on both teams; the connector has no
  write access and the repo's GitHub account is not linked to Vercel) → import steps in HOSTING.md.

## 2026-11-06 — V6: extension side panel, crowd-only, no overlapping voices, Groq limiter, Quality Lab
- **Live-stream slowness / missing lines — cause found**: Groq free tier ≈ 20 requests/min; a 3-min
  match needs ~61 requests (≈ 20/min) → 429s → slow local fallback (8 lines > 2.5 s, max 5.4 s in a
  browser run). Fix: client-side sliding-window limiter (`GROQ_RPM` 19, waits ≤ 1.5 s for a slot,
  else local), Retry-After honoured, transcriber recorded per line (`asr_by`) and in metrics.
- **Overlapping voices**: streamed lines were scheduled with an *estimated* length; a longer real
  voice overlapped the next. Relay now has a voice lane (next voice waits for the real `ended`).
- **Crowd only**: centre-channel cancellation (side = (L−R)/2 + <120 Hz body) in the relay; stereo
  detector. Measured on a synthetic stereo mix (crowd partly correlated): commentary −96 dB when
  exactly centred, −27 / −21 / −15 dB when 0.5 / 1 / 2 dB off-centre, crowd kept (+1.6 dB).
  Mono streams cannot be separated this way (detected and explained in the panel) → ML
  separation is roadmap.
- **Extension 0.5**: Chrome side panel (speaking now + emotion + speaker match + transcriber +
  voice, commentators with voice switch and match meter, transcript with voiced/felt delay, original
  Full / Crowd only / Off, levels, mute voices, page subtitles toggle, stop); hub.js in the relay
  host; hosted engines (https://*.hf.space) allowed. Tested in Chromium with the extension loaded:
  panel receives live state, controls reach the relay, stop works.
- **Quality Lab** (`/lab`, `app/lab.py`, `engine/metrics/spoken.py`): one click runs a scored clip
  through the live pipeline at real speed and re-listens to the voices; history + all sessions;
  runs stopped early are marked "partial". First run `20261106-103032_e2493d` (synced 6 s):
  felt delay p50 0.00 / p95 0.49 s, 87 % on time, 60/60 voiced, ASR WER 6.5 %, spoken WER 7.8 %
  (7/525 words missing), speakers 94.3 %, emotion 55 % (94 % within one), Groq 54 / local 6.
- Hosted server now creates the scored clips on first start (start.sh).

## 2026-11-06 — V7: speaker tracking for many speakers + Chrome Web Store package
**Diagnosis** (new truth-scored panels `synthetic_panel_6spk` 245 s / 77 lines and
`synthetic_panel_8spk` 279 s / 93 lines incl. two look-alike pairs A/G, C/F; generator now has 8
source voices): line-vs-line ECAPA similarity — same person 0.37–0.48 typical but 0.02–0.12 at the
low end (shouting vs normal); different people 0.05 typical, up to 0.66. Old tracker (one EMA
centroid, cap 3): 40 % (6 spk), 32 % (8 spk).
**Built**: `engine/speakers/tracker.py` (voice bank per person, top-k scoring, grey zone, no new
people from shouts / < 0.8 s, automatic merges with relabelling, enrolled people never merged,
two-pass `offline_labels`), up to 8 speakers (API, UI, extension), loudness passed to the tracker,
`speaker.merged` event (app, side panel), viewer fixes ("Same person as…", rename), known
commentators from Voice Lab samples (`known_voices`), two-pass accuracy in metrics/Lab, mid-phrase
split gate uses the tracker's threshold, `scripts/speaker_bench.py`, `docs/SPEAKERS.md`.
**Measured — live sessions** (live mode, `outputs/v7_speakers/`):
| clip | live | two-pass | enrolled live |
|---|---|---|---|
| 2 spk `111546` | 94.3 % | 94.5 % | — |
| 3 spk `114249` | 96.8 % | 98.5 % | — |
| 6 spk `112457` / enrolled `113836` | 77.1 % | 85.7 % | 88.2 % |
| 8 spk `112906` / enrolled `113348` | 66.8 % | 70.4 % | 89.9 % |
Bench (clean script lines): tuned on 2/3/6 spk; held-out 8 spk 72.9 % (untuned 67.9 %); enrolled
97.2 % / 93.8 %. Remaining loss: 3–4 % of speech in phrases with two people (hand-overs < 0.35 s),
the rest voice confusion. **Rejected (measured)**: WeSpeaker ResNet34/293 (pair EER 17.4/20.7 % vs
ECAPA 13.6 %), noise reduction before the voice-print (13.6 → 16.0 %), lowering thresholds further.
**Chrome Web Store**: `extension-store/` — upload zip (`make extension-zip`), LISTING.md, PUBLISH.md,
4 screenshots 1280×800, promo 440×280; privacy policy at `/privacy.html`; manifest 0.6.0 with the
hosted engine as default.

## 2026-11-06 — V8: Deepgram speech-to-text, Keys & engines dialog
- New provider `engine/providers/paid/asr_deepgram.py` (Nova-3, per phrase, glossary names as
  keyterms; failures and empty answers on ≥ 0.6 s phrases go to the backup engine).
- Choice `LCV_ASR` = auto | deepgram | groq | local, set in the app (Keys & engines dialog) —
  hosted engines need `LCV_ADMIN_CODE`; with `HF_TOKEN` keys are saved as Space secrets.
- Per-phrase bench (`scripts/asr_bench.py`, 200 truth lines, 3 clips, no context prompt):
  Deepgram WER 9.99 % p50 0.42 s p95 1.19 s; Groq 12.53 % p50 0.51 s p95 1.79 s.
- Live pipeline, Quality Lab, synthetic_match, synced 6 s:
  | setup | WER | spoken WER | voiced | on time | felt p95 | lines by |
  |---|---|---|---|---|---|---|
  | Groq + offline backup (before) | 6.5 % | 7.8 % | 60/60 | 87 % | 0.49 s | groq 54, local 6 |
  | Deepgram first (no retry) | 10.7 % | 12.4 % | 57/57 | 88 % | 0.53 s | deepgram 61 |
  | Deepgram first + empty retry | 8.2 % | 9.7 % | 60/60 | 82 % | 0.78 s | deepgram 59, groq 2 |
  | **Auto: Groq + Deepgram backup** | **6.1 / 6.3 %** | 7.6 / 8.4 % | 60/60, 59/59 | 75 / 85 % | 0.98 / 0.69 s | groq 53–54, deepgram 7–8 |
  Groq with the context prompt (previous words + names) beats Deepgram on these synthetic
  voices; Deepgram mishears some short excited phrases ("he has to score there" → "after
  school") and returned empty text for two 1.4–1.6 s shouts. Default = Auto. On-time share
  varies run to run with the voice service's speed (Fish), not with speech-to-text.

## 2026-11-06 — V8b: Altercast brand, premium UI, store graphics, promo video
- Name **Altercast** (descriptor "Live Character Voice"); `brand/` holds the mark, wordmark,
  brand guide and `render.js` / `screens.js` that rebuild every icon, tile and screenshot.
- Web app + extension restyled to the brand (signal violet → aqua, Sora/Inter), new header, favicon,
  social image; speaker colours updated (engine + extension). Extension v0.7.0.
- Store: `store-icon-128.png`, 4 new 1280×800 screenshots from real captures, small tile,
  marquee 1400×560. Promo video `promo/altercast-promo.mp4` (50 s, 1080p, −13.9 LUFS measured).

## 2026-11-08 — V8c: explicit session lifecycle, state-machine inventory
- Audited the app: 14 implicit state machines (docs/STATE_MACHINES.md, by impact).
- Session lifecycle made explicit (app/lifecycle.py): ready → live → stopping → ended | error,
  one transition table, `actions` on HTTP/WS/health, structured 409, `GET /api/sessions`.
- Fixed: paused-and-abandoned session blocking forever; replaced session restartable; late joiner
  shown a finished session as live; lab runs killed by a leaving viewer; keys "error" while saved;
  updater restarting mid-scoring/clone; live start waiting 6 s (now 0.00 s, measured);
  record.json not reloadable (`features` with `asr_by`); side panel showing Deepgram as local.
- Tests: 96 pytest (9 new lifecycle), 14 vitest; real-engine end-to-end run of create → start →
  pause → resume → stop → late joiner, pause-then-close, live start.

## 2026-11-09 — V9: permanent voice library + private Voice Studio
- Problem: cloned voices were files on the Space disk → wiped on every restart; anyone could
  clone/delete. Now: private HF dataset `<owner>/altercast-voices` is the source of truth
  (engine/voice_library.py, Hub or `dir:` backend); roles studio/app/all (`LCV_ROLE`).
- Studio: clone, In app/Hidden, Delete → saved immediately. App: read-only (403
  `voices_read_only`), hidden voices not offered, re-sync every 60 s, full sync on start.
- Rescue: voices on disk never saved are uploaded once; pasting the HF token in Keys starts the
  library and saves them BEFORE the secret save restarts the Space.
- Verified: 104 pytest (8 new), 14 vitest; two real servers (Studio :8001 + app :8002, shared
  `dir:` library): clone in app refused (403); clone in Studio saved; app picked it up; hide →
  gone from app; app disk wiped + both restarted → voice back. The Hub backend itself is not yet
  exercised against huggingface.co (needs the owner's token) — check `/api/health` →
  `voice_library.error` after set-up.

## 2026-11-10 — V9b: Voice Studio self set-up; Player voice lane (no overlapping voices)
- One owner step (secret `HF_TOKEN`): the app creates the library dataset and the private
  `altercast-voice-studio` Space itself (engine/studio_setup.py; fake-API tests — not yet run
  against huggingface.co, which needs the owner's token).
- Overlaps measured in server schedules of recorded sessions: 1–3 of ~60 lines, up to 0.95 s
  (a streamed line is scheduled before its real length is known). Player now plays voices through
  one lane (web/src/audio/scheduler.ts `VoiceLane`). Real playback in headless Chromium, session
  20261110-052729_b6198d: 59 voices, 0 overlaps (its server schedule had one of 0.61 s).
- Tests: 107 pytest, 17 vitest.

## 2026-11-10 — fix: a fresh Space timed out at start
- start.sh generated 5 synthetic test clips (~20+ min on free CPU) BEFORE starting the server, so a
  new Space (the Voice Studio) failed Hugging Face's 30-min health limit. Clips are now made in the
  background after the server starts (once per container), and never on the Voice Studio.
