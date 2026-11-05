# 03 — Free Tech Stack (all $0)

Every item below is free and open-source. Prices for paid upgrades are in `12_COSTS_AND_PAID_UPGRADES.md`.

> Licence notes are taken from each project's page at the time of writing (Nov 2026). Claude Code must re-check each licence when installing and record it in `THIRD_PARTY_LICENSES.md`.

## Runtime
| Tool | Use | Link |
|---|---|---|
| Python 3.11+ | Engine + API | https://www.python.org |
| Node.js 22 | Frontend build | https://nodejs.org |
| FFmpeg | Decode video/audio, mux final demo videos | https://ffmpeg.org |
| espeak-ng | Phonemizer required by Kokoro TTS | https://github.com/espeak-ng/espeak-ng |

## AI stages (free, CPU)
| Stage | Primary choice | Licence | Why | Link | Fallback |
|---|---|---|---|---|---|
| Voice activity detection (VAD) | **Silero VAD** (`silero-vad` pip, ONNX) | MIT | Tiny, fast, streaming-friendly, model ships inside the pip package (no download) | https://github.com/snakers4/silero-vad | `webrtcvad` |
| Speech-to-text (ASR) | **faster-whisper** with `small.en` (int8, CPU) | MIT (code), model MIT | Best accuracy/speed balance on CPU; word timestamps | https://github.com/SYSTRAN/faster-whisper | `base.en` if too slow; `distil-small.en` |
| Captions input (alternative to ASR) | `.srt` / `.vtt` sidecar parser (`webvtt-py`, `srt`) | MIT | Proposal allows "reading captions"; captions in live TV usually lag 3–5 s, so ASR stays the default | https://github.com/glut23/webvtt-py | — |
| Speaker identification | **SpeechBrain ECAPA-TDNN** (`speechbrain/spkrec-ecapa-voxceleb`) + our own online clustering | Apache-2.0 | Strong speaker embeddings on CPU; 192-dim vectors | https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb | **Resemblyzer** (weights ship inside pip package, Apache-2.0) https://github.com/resemble-ai/Resemblyzer |
| Emotion (v1) | **Prosody rules**: loudness (RMS), pitch (YIN via `librosa`), speaking rate (words/sec from ASR), punctuation/keywords | n/a (our code) | Fast (< 20 ms), explainable, tunable, no model needed | https://librosa.org | Optional experiment: `emotion2vec_plus_base` via FunASR (check licence before use) |
| Text-to-speech (TTS) | **Kokoro-82M** (`kokoro` pip) | Apache-2.0 | Natural, many built-in voices, runs real time or faster on CPU, 24 kHz | https://huggingface.co/hexgrad/Kokoro-82M | **Piper** (MIT code; check each voice's licence) https://github.com/rhasspy/piper |
| Audio separation (optional, offline only) | Demucs `htdemucs` | MIT | Only for an optional "cleaner game sound" demo render; too slow for live on CPU | https://github.com/facebookresearch/demucs | — (Pilot uses ducking instead) |

## Engine + API libraries
| Library | Use | Link |
|---|---|---|
| numpy, soundfile, librosa | Audio arrays, read/write, features | https://numpy.org · https://python-soundfile.readthedocs.io · https://librosa.org |
| pydantic v2 | Data models for the live record and API | https://docs.pydantic.dev |
| FastAPI + uvicorn | HTTP + WebSocket API (Pilot) | https://fastapi.tiangolo.com |
| PyYAML | Config files | https://pyyaml.org |
| jiwer | Word error rate | https://github.com/jitsi/jiwer |
| scipy | Hungarian matching for speaker accuracy, signal utils | https://scipy.org |
| matplotlib | Charts in the report (delay over time) | https://matplotlib.org |
| pytest, ruff, mypy | Tests, lint, types | https://pytest.org · https://docs.astral.sh/ruff · https://mypy-lang.org |
| torch (CPU build) | Required by SpeechBrain + Kokoro | https://pytorch.org (install from `https://download.pytorch.org/whl/cpu`) |

## Frontend (Pilot)
| Library | Use | Link |
|---|---|---|
| React 18 + TypeScript | UI | https://react.dev |
| Vite | Dev server + build | https://vitejs.dev |
| Tailwind CSS | Styling | https://tailwindcss.com |
| Web Audio API (built into browsers) | Ducking, scheduling voice playback | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API |
| Zustand | Small state store | https://github.com/pmndrs/zustand |
| Vitest + Testing Library | Tests | https://vitest.dev |
| Playwright (pre-installed on many VMs; else `npx playwright install chromium`) | Screenshot check of the UI | https://playwright.dev |

## Model downloads needed (first run only)
| Model | Size (approx.) | Source |
|---|---|---|
| faster-whisper `small.en` | ~ 480 MB | Hugging Face `Systran/faster-whisper-small.en` |
| SpeechBrain ECAPA | ~ 80 MB | Hugging Face `speechbrain/spkrec-ecapa-voxceleb` |
| Kokoro-82M + voices | ~ 330 MB | Hugging Face `hexgrad/Kokoro-82M` |
| Silero VAD | bundled in pip | — |

These downloads need the Custom network domains from `00_START_HERE.md` step 4. If a download is blocked, stop and tell the user exactly which domain was refused.

## Why not other options (so Claude Code doesn't drift)
- **pyannote** diarization: excellent but its models are gated (needs a Hugging Face account + accepting terms + token). Keep as a documented later option, not default.
- **NVIDIA NeMo / Parakeet**: heavy install, GPU-oriented.
- **Browser Web Speech API**: free but Chrome sends audio to Google's servers and gives no speaker labels; not suitable for the engine.
- **Any paid API** (Deepgram, AssemblyAI, ElevenLabs, Fish Audio, AudioShake): not allowed in this build; see `12_COSTS_AND_PAID_UPGRADES.md`.
