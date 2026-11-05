# 11 — Repo Structure and Conventions

```
live-character-voice/
├── CLAUDE.md
├── 00_START_HERE.md
├── README.md                  # short: what it is, how to run (Claude Code writes/updates)
├── THIRD_PARTY_LICENSES.md    # every dependency + model + licence + link
├── Makefile
├── pyproject.toml
├── .gitignore                 # .venv, node_modules, __pycache__, outputs/**/tts/, *.wav (except previews), models
├── .github/workflows/ci.yml   # lint + unit tests only
├── config/
│   ├── engine.yaml
│   ├── voices.yaml
│   ├── glossary.txt
│   ├── emotion_keywords.yaml
│   └── enroll.example.yaml
├── data/
│   ├── clips/                 # synthetic + user clips (synthetic ones are regenerated, not committed if > 25 MB)
│   ├── scripts/synthetic_match.yaml
│   └── sfx/                   # optional user-supplied CC0 crowd audio
├── engine/                    # see 06 §6.1
├── app/                       # FastAPI (Pilot)
├── web/                       # React app (Pilot)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts         # proxy /api and /ws to :8000
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx, App.tsx, routes/
│       ├── components/ (VideoStage, SpeakerCard, VoiceSelect, Transcript, DelayHud, Sparkline, Controls)
│       ├── audio/ (graph.ts, scheduler.ts, ducking.ts)
│       ├── net/ (ws.ts, api.ts, clock.ts)
│       ├── store/session.ts
│       └── types/protocol.ts  # mirrors 05 §5.4 exactly
├── scripts/
├── tests/
│   ├── unit/
│   └── integration/
├── media/previews/            # generated voice previews (small, may be committed)
├── outputs/                   # run folders; see 09 §9.6 for what is committed
└── docs/
    ├── 01 … 14 (this kit)
    └── BUILD_LOG.md
```

## Conventions
- **Python:** 3.11+, type hints everywhere, `ruff` (line length 100), `mypy --strict` on `engine/` and `app/`. Pydantic v2 models for all data crossing module boundaries.
- **TypeScript:** `strict: true`, no `any`. Protocol types in `web/src/types/protocol.ts` must match `05 §5.4`; add a unit test that parses example messages from the doc.
- **Naming:** line IDs `L` + 6 digits; speakers `S1…S3`; run IDs `YYYYMMDD-HHMMSS_<clip>`.
- **Time units:** seconds as `float` everywhere in data; milliseconds only in config keys ending `_ms`.
- **Audio:** analysis at 16 kHz mono float32; TTS native 24 kHz; render at 48 kHz. Resample with `soxr` or `librosa.resample(res_type="soxr_hq")`.
- **Commits:** `M<n>: <what>` e.g. `M3: online speaker clustering + enrollment`.
- **Branches:** work on the branch Claude Code creates for the session; the user merges.
- **No secrets** in the repo. None are needed for this build.
