# 13 — Run and Deploy

## 13.1 Running inside Claude Code on the web (main way for this build)
Claude Code runs everything on its cloud VM (Ubuntu 24.04, 4 vCPU, 16 GB RAM, no GPU). You don't run commands yourself; you ask Claude Code. It pushes results to your GitHub branch.

- POC: Claude Code runs `make synth` then `make poc CLIP=data/clips/synthetic_match.mp4`. You download `outputs/<run>/demo_live.mp4`, `demo_synced.mp4` and `report.md` from GitHub.
- Pilot: Claude Code runs the backend + a headless browser test, and commits:
  - `outputs/ui/player.png` (screenshot), and
  - `outputs/ui/session.webm` — a **screen recording of the player during a session** made with Playwright (`recordVideo`). Ask for this in M9/M10 so you can see the app working without running it yourself. Note: browser recordings from Playwright have no audio; listen via the demo MP4s.

## 13.2 Running the Pilot on any computer (when you want to click around yourself)
Requirements: Python 3.11+, Node 20+, FFmpeg, espeak-ng.
```bash
git clone <your repo>
cd live-character-voice
make setup        # installs Python + Node deps, downloads models (~1 GB)
make synth        # creates the synthetic test clip
make dev          # starts API on :8000 and web app on :5173
```
Open http://localhost:5173 → pick the clip → Start session.

## 13.3 Running in the cloud without your laptop (free options)
- **GitHub Codespaces** (https://github.com/features/codespaces): a cloud dev machine in your browser with port forwarding, so you can open the player in a browser tab. Personal accounts get a monthly free allowance **[Unverified: amount and machine sizes — check the Codespaces billing page]**. Add a `.devcontainer/devcontainer.json` (ask Claude Code to create it in M10) that installs FFmpeg + espeak-ng and runs `make setup`.
- **Hugging Face Spaces**: free CPU hardware exists, but the Docker type this app needs requires a paid PRO plan (per HF docs). Not free for this app.

## 13.4 Frontend-only hosting (optional)
The built web app (`web/dist`) is static and could be hosted for free on GitHub Pages or similar, but it needs a running backend to do anything. Not useful until the backend is hosted.

## 13.5 Common problems
| Problem | Fix |
|---|---|
| Model download fails / 403 / blocked | Add the domains in `00_START_HERE.md` step 4 to the environment's Custom network list |
| `espeak-ng not found` | `apt-get install -y espeak-ng` (add to setup script) |
| Commands time out | Add `BASH_DEFAULT_TIMEOUT_MS=600000` to environment variables |
| Delay keeps growing | Check `drift_slope` in the report; reduce `max_line_s`, use `base.en`, raise `tts.workers` |
| Wrong speaker labels | Provide an enroll file with 8–15 s per commentator |
| Voice sounds too slow / falls behind | Raise style speeds slightly; check TTS duration ratio in the report |


## 13.6 Notes from the build (M10)
- One-port Pilot: `make serve` builds the web app and serves it with the API on :8000.
- Run the API with `MALLOC_ARENA_MAX=2` (the Makefile targets and the devcontainer set it) — it
  keeps the server's memory flat over long sessions.
- Codespaces: the dev container is `.devcontainer/live-character-voice/devcontainer.json` at the
  repository root (choose it when creating the codespace); it installs everything, downloads the
  models and generates the synthetic clip.
- Playwright smoke test of the player: start the API, then `cd web && npm run e2e`
  (env: `CLIP`, `SPEED`, `SPEAKERS`, `WATCH_S`).
