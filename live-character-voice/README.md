# Live Sports Character Voice

Listens to sports commentary, turns it into text, works out which commentator is speaking, reads
the emotion of the moment, re-speaks every line in an original character voice and places it back
in time while the crowd and game sound carry on — live, on a free, CPU-only, open-source stack.

- **Stage A — Proof of Concept:** `make poc` runs the engine on a clip at honest live speed and
  writes demo videos + a results report with measured delay.
- **Stage B — Pilot:** `make dev` runs a web player: the video plays, each commentator gets a
  voice, viewers switch voices while it plays, the original commentary is ducked, every line's
  delay is shown and exportable.

Spec: `docs/` · build rules: `CLAUDE.md` · progress and every measurement: `docs/BUILD_LOG.md` ·
licences: `THIRD_PARTY_LICENSES.md`.

> This folder is self-contained inside the `sd` repository (which also holds an unrelated
> Next.js project at the root). Run every command from this folder.

## Quick start

Needs Python 3.11/3.12 (Kokoro does not support 3.13 yet), Node 20+, [`uv`](https://docs.astral.sh/uv/),
FFmpeg and espeak-ng. ~1 GB of models download from Hugging Face on first use.

```bash
cd live-character-voice
make setup            # system packages, CPU torch, Python + Node deps
make download-models  # Whisper small.en/base.en, ECAPA, Kokoro-82M (+ voices)
make synth            # 3-minute synthetic two-commentator clip + ground truth
make poc              # POC at live speed → outputs/<run>/ (demo videos + report.md)
```

Pilot web player:

```bash
make synth-pilot      # three-commentator clip + 20-minute stability clip
make dev              # API on :8000, web app on :5173 → open http://localhost:5173
```

Or serve everything from one port: `cd web && npm run build`, then
`.venv/bin/python -m uvicorn app.main:app --port 8000` and open http://localhost:8000.

## Faster, better: free hosted providers (optional)

| Provider | What it improves | Free key | Set |
|---|---|---|---|
| Groq Whisper large-v3-turbo | speech-to-text 1.4 s → 0.4 s, WER 10.9 % → 6.9 % | https://console.groq.com/keys | `GROQ_API_KEY` |
| Fish Audio S2.1 (`s2.1-pro-free`) | expressive voices with emotion tags, streamed (first audio ≈ 0.8 s) | https://fish.audio/app/api-keys | `FISH_API_KEY` |

With both keys set, `provider: auto` (default) uses them and falls back to the local models on any
error. Measured: the new voice starts 1.8 s (median) after the commentator's line ends, vs 4.1 s
fully local.

## Where the results are

| What | Where |
|---|---|
| POC runs (record, delay log, metrics, report, demos) | `outputs/<YYYYMMDD-HHMMSS>_<clip>_<label>/` |
| Final POC summary (3 live runs, medians) | `outputs/poc_summary.md` |
| Pilot sessions | `outputs/sessions/<session_id>/` |
| Final Pilot report | `outputs/pilot_<date>/report.md` |
| UI screenshot + screen recording | `outputs/ui/player.png`, `outputs/ui/session.webm` |

## Commands

| Command | What it does |
|---|---|
| `make check` | tools, versions, CPU count, model cache, network to Hugging Face |
| `make lint` / `make test` | ruff + mypy --strict, eslint + tsc / pytest + vitest (no models) |
| `make test-slow` | integration tests with real models |
| `make bench` | model speed on this machine → `outputs/bench.json` |
| `make poc CLIP=data/clips/<file>` | live-speed POC run on any clip you are allowed to use |
| `python -m engine.cli report --run outputs/<run>` | recompute metrics + report from `record.json` |
| `python scripts/ws_client.py --clip <file>` | scripted Pilot session over WebSocket |
| `cd web && npm run e2e` | Playwright smoke test of the player (backend must be running) |

## How it works (one paragraph)

A feeder releases the clip's audio in 0.25 s chunks exactly when they would air. Silero VAD and a
rule-based segmenter decide when a line is finished (pause, max length, a loud shout, a level jump,
or a speaker change). Each line goes, in parallel, to faster-whisper (text), ECAPA + online
clustering (who), and prosody rules (emotion). Kokoro-82M re-speaks it with the speaker's chosen
voice and an emotion-shaped delivery. A scheduler places each voice line as soon as it is ready
(never overlapping, catching up when behind) and everything is written to one in-memory live
record that the report, the renderer and the web player all read. Every stage is behind a small
provider interface, so a paid ASR/TTS can replace the free one by changing `config/engine.yaml`.
