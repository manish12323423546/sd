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
