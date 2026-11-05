# Live Sports Character Voice

Listens to sports commentary, turns it into text, works out which commentator is speaking, reads
the emotion, re-speaks each line in an original character voice and places it back in time while
the game sound continues. Free, open-source, CPU-only stack. Full spec: `docs/`; build rules:
`CLAUDE.md`; progress: `docs/BUILD_LOG.md`.

> This folder is self-contained inside the `sd` repository (which also holds an unrelated
> Next.js project at the root). Run every command from this folder.

## Quick start
Needs Python 3.11/3.12 (Kokoro does not support 3.13 yet), Node 20+, `uv`, FFmpeg, espeak-ng.

```bash
cd live-character-voice
make setup      # system packages, CPU torch, Python + Node deps
make check      # tools, versions, CPU count, model cache, network to Hugging Face
make lint
make test
```

Later milestones add `make synth` (synthetic test clip), `make poc CLIP=...` (live-speed POC run)
and `make dev` (Pilot web player).

## Status
| Milestone | State |
|---|---|
| M0 Environment and skeleton | done |
| M1 Models + synthetic clip | next |
