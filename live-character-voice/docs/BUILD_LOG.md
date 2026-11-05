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
