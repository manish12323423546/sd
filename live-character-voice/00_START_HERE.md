# START HERE — Live Sports Character Voice: Claude Code Build Kit

This folder is a complete build kit. You put it in an empty GitHub repository, open that repository in Claude Code on the web, paste one prompt, and Claude Code starts building. Everything in this kit uses **free and open-source tools only**. Nothing needs a credit card.

---

## What gets built (in order)

| Stage | What it is | Same as proposal |
|---|---|---|
| **Stage A — Proof of Concept (POC)** | The engine only. Takes a sports clip, plays it at live speed, turns commentary into text, works out who is speaking, reads the emotion, generates a new character voice per commentator, places it back in time, and produces a demo video + a results report with real measured delay. | Option 1 |
| **Stage B — Pilot Version (MVP)** | Everything in A plus a simple web player: video plays, each commentator gets a voice, viewer can switch voices while it plays, original commentary is turned down, delay log is shown. | Option 2 |

The full live product (real broadcast feeds, many viewers, mobile/TV apps) is **not** in this kit. See `docs/14_RISKS_AND_LIMITS.md`.

---

## What's in the kit

```
CLAUDE.md                          ← Claude Code reads this automatically. Rules for the build.
00_START_HERE.md                   ← this file
docs/
  01_PRODUCT_BRIEF.md              ← what we are building and why
  02_ARCHITECTURE.md               ← how the parts connect
  03_FREE_TECH_STACK.md            ← every tool, its licence, link, and why it was chosen
  04_PIPELINE_SPEC.md              ← each pipeline stage in detail (the core engineering)
  05_LIVE_RECORD_AND_PROTOCOL.md   ← the shared live record, data shapes, WebSocket messages
  06_BACKEND_SPEC.md               ← Python service, modules, API endpoints, CLI
  07_FRONTEND_SPEC.md              ← the Pilot web player (screens, components, audio graph)
  08_VOICES_AND_EMOTION.md         ← voice catalog, emotion → voice delivery mapping, voice rules
  09_TESTING_METRICS_REPORT.md     ← live-speed testing, metrics, the results report
  10_MILESTONES_AND_TASKS.md       ← step-by-step milestones with acceptance checks
  11_REPO_STRUCTURE_AND_CONVENTIONS.md
  12_COSTS_AND_PAID_UPGRADES.md    ← $0 now; what to pay for later, with prices
  13_RUN_AND_DEPLOY.md             ← how to run it, where to see results, free hosting options
  14_RISKS_AND_LIMITS.md           ← honest limits of the free stack
prompts/
  PROMPT_00_KICKOFF.md             ← paste this first
  PROMPT_01 … PROMPT_10            ← one prompt per milestone, paste in order
  PROMPT_FIX_TEMPLATE.md           ← use any time a number looks wrong
```

---

## Step-by-step setup (one time, about 15 minutes)

### 1. Create an empty GitHub repository
- Go to https://github.com/new
- Name: `live-character-voice` (any name is fine)
- Private is fine. Tick **Add a README** so the repo is not empty.

### 2. Upload this kit into the repository
- In the repo on GitHub click **Add file → Upload files**.
- Drag in **everything inside this zip** (`CLAUDE.md`, `00_START_HERE.md`, the `docs/` folder and the `prompts/` folder). Keep the folder structure.
- Click **Commit changes**.

### 3. Connect Claude Code on the web to GitHub
- Open https://claude.ai/code
- Follow the GitHub connection step and give the Claude GitHub App access to this repository.
- Docs: https://code.claude.com/docs/en/web-quickstart

### 4. Create a cloud environment that can download the free AI models (important)
The free models (speech recognition, voice generation, speaker detection) download from Hugging Face and PyTorch. The default network setting (**Trusted**) does **not** include those sites, so downloads will fail unless you add them.

In Claude Code on the web → environment settings → **Network access → Custom**:
- Tick **"Also include default list of common package managers"**
- In **Allowed domains**, paste:

```
huggingface.co
*.huggingface.co
*.hf.co
download.pytorch.org
*.pytorch.org
```

Docs for this setting: https://code.claude.com/docs/en/cloud-environments (section "Allow specific domains").

### 5. (Recommended) Add environment variables
In the same environment settings → **Environment variables**:

```
BASH_DEFAULT_TIMEOUT_MS=600000
BASH_MAX_TIMEOUT_MS=1800000
HF_HUB_DISABLE_TELEMETRY=1
```

This gives long model downloads and test runs enough time.

### 6. (Recommended) Add a setup script
In the environment settings → **Setup script**, paste:

```bash
#!/bin/bash
apt-get update -y && apt-get install -y ffmpeg espeak-ng libsndfile1 sox
```

`ffmpeg` handles audio/video, `espeak-ng` is needed by the free voice model, `libsndfile1` reads audio files.

### 7. Start the build
- Start a new session on the repository with the environment you just made.
- Open `prompts/PROMPT_00_KICKOFF.md`, copy everything, paste it into Claude Code, send.
- When a milestone finishes, Claude Code will stop and report. Read the report, then paste the next prompt (`PROMPT_01…`, `PROMPT_02…` and so on).

---

## How you will see the results

The cloud machine has no speakers or screen for you, so results come back as **files in the repo**:

- After the POC milestones, look in `outputs/` on the branch Claude Code pushes:
  - `demo_live.mp4` — what a viewer would hear live (new voices arrive with the real measured delay)
  - `demo_synced.mp4` — what the "synced mode" of the future product would look like
  - `report.md` — the results report (delay, accuracy, speaker accuracy, voice quality notes)
- Download them from GitHub (open the file → **Download raw file**).
- For the Pilot player (web app), see `docs/13_RUN_AND_DEPLOY.md` — options to run it on any computer with one command, or view it through a free tunnel.

---

## Golden rules for you while building

1. **Paste one prompt at a time.** Wait for Claude Code to finish and report before the next.
2. **Read every milestone report.** If a number looks wrong (for example delay above 6 seconds), tell Claude Code to investigate before moving on.
3. **Never paste API keys into the chat.** This kit does not need any.
4. **Use only original or properly licensed voices.** No Mickey, no Donald, no cloned real people. See `docs/08_VOICES_AND_EMOTION.md`.
5. **Use footage you are allowed to use.** The kit generates its own synthetic test clip, so you can build and test without any third-party footage. Add Ace's cleared clip later in `data/clips/`.
