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
