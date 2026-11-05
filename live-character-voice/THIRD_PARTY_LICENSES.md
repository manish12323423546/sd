# Third-Party Licences

Every dependency, model and tool used by this project, its licence and link. Versions are the ones
installed on the build VM at the date shown. Re-checked when each item is installed (CLAUDE.md).

Last updated: 2026-11-05 (M1).

## System tools (apt)
| Tool | Version | Licence | Link | Notes |
|---|---|---|---|---|
| FFmpeg | 6.1.1 (Ubuntu build) | LGPL-2.1+ / GPL-2+ (Ubuntu build enables GPL parts) | https://ffmpeg.org | Called as a separate program (subprocess), never linked. |
| espeak-ng | 1.51 | **GPL-3.0** | https://github.com/espeak-ng/espeak-ng | ⚠ Not on the permissive list. Required by Kokoro's phonemizer for out-of-dictionary words; used as a separate library/program. See BUILD_LOG open issue. |
| SoX | 14.4.2 | GPL-2.0 / LGPL-2.1 | https://sourceforge.net/projects/sox/ | Optional helper, command line only. |
| libsndfile | 1.2.2 | LGPL-2.1 | https://github.com/libsndfile/libsndfile | Used by `soundfile`. |

## Python (PyPI)
| Package | Version | Licence | Link |
|---|---|---|---|
| numpy | 2.5.4 | BSD-3-Clause (+ bundled MIT/Zlib/0BSD/CC0) | https://numpy.org |
| pydantic | 2.14.2 | MIT | https://docs.pydantic.dev |
| PyYAML | 6.0.3 | MIT | https://pyyaml.org |
| soundfile | 0.14.0 | BSD-3-Clause | https://github.com/bastibe/python-soundfile |
| scipy | 1.18.1 | BSD-3-Clause | https://scipy.org |
| jiwer | 4.0.0 | Apache-2.0 | https://github.com/jitsi/jiwer |
| matplotlib | 3.11.2 | Matplotlib licence (PSF-based, permissive) | https://matplotlib.org |
| librosa | 1.0.0 | ISC | https://librosa.org |
| soxr (transitive, via librosa) | 1.1.0 | **LGPL-2.1-or-later** | https://github.com/dofuuz/python-soxr |
| silero-vad | 6.2.3 | MIT | https://github.com/snakers4/silero-vad |
| onnxruntime (via silero-vad) | 1.31.1 | MIT | https://onnxruntime.ai |
| faster-whisper | 1.2.1 | MIT | https://github.com/SYSTRAN/faster-whisper |
| ctranslate2 | 4.8.5 | MIT | https://github.com/OpenNMT/CTranslate2 |
| speechbrain | 1.1.2 | Apache-2.0 | https://speechbrain.github.io |
| kokoro | 0.9.4 | Apache-2.0 | https://github.com/hexgrad/kokoro |
| misaki (via kokoro) | 0.9.4 | Apache-2.0 | https://github.com/hexgrad/misaki |
| spacy (via misaki) | 3.8.18 | MIT | https://spacy.io |
| torch (CPU build) | 2.15.0+cpu | BSD-3-Clause style (+ bundled Apache/MIT/BSL/Zlib) | https://pytorch.org |
| torchaudio (CPU build) | 2.11.1+cpu | BSD-2-Clause | https://pytorch.org/audio |
| huggingface_hub | (via faster-whisper) | Apache-2.0 | https://github.com/huggingface/huggingface_hub |
| en_core_web_sm (spaCy model, via misaki) | 3.8.0 | MIT | https://github.com/explosion/spacy-models |
| webvtt-py | 0.7.0 | MIT | https://github.com/glut23/webvtt-py |
| srt | 3.5.3 | MIT | https://github.com/cdown/srt |
| psutil | 7.2.2 | BSD-3-Clause | https://github.com/giampaolo/psutil |
| fastapi | 0.162.0 | MIT | https://fastapi.tiangolo.com |
| uvicorn | 0.54.0 | BSD-3-Clause | https://www.uvicorn.org |
| python-multipart | 0.0.33 | Apache-2.0 | https://github.com/Kludex/python-multipart |
| websockets | 17.4 | BSD-3-Clause | https://github.com/python-websockets/websockets |
| pytest / pytest-asyncio | 9.2.0 | MIT / Apache-2.0 | https://pytest.org |
| ruff | 0.17.3 | MIT | https://docs.astral.sh/ruff |
| mypy | 2.4.1 | MIT | https://mypy-lang.org |

## JavaScript (npm, `web/`)
| Package | Version | Licence |
|---|---|---|
| react, react-dom | 18.3.1 | MIT |
| vite | 6.4.5 | MIT |
| @vitejs/plugin-react | 4.7.0 | MIT |
| vitest | 3.2.7 | MIT |
| typescript | 5.7.3 | Apache-2.0 |
| eslint, @eslint/js | 9.39.5 | MIT |
| typescript-eslint | 8.72.1 | MIT |
| eslint-plugin-react-hooks | 5.2.0 | MIT |
| globals | 15.15.0 | MIT |
| @types/react, @types/react-dom | 18.3.x | MIT |

## Models (downloaded in M1, never committed)
Sizes measured in M1: small.en 486 MB, base.en 148 MB, ECAPA 89 MB, Kokoro-82M + 54 voices 356 MB.

| Model | Licence | Link |
|---|---|---|
| faster-whisper `small.en` / `base.en` | MIT | https://huggingface.co/Systran |
| SpeechBrain ECAPA `spkrec-ecapa-voxceleb` | Apache-2.0 | https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb |
| Kokoro-82M + built-in voices | Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M |
| Silero VAD (bundled in pip) | MIT | https://github.com/snakers4/silero-vad |
