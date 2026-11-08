# CLAUDE.md — Project rules for Claude Code

You are building **Live Sports Character Voice**: a system that listens to sports commentary, turns it into text, identifies which commentator is speaking, reads the emotion of the moment, re-speaks each line in a chosen character voice, and places it back in time while the game sound continues.

The full specification is in `docs/`. Read the relevant doc before you build any part. When this file and a doc disagree, this file wins; tell the user about the conflict.

## Read order (first session)
1. `00_START_HERE.md`
2. `docs/01_PRODUCT_BRIEF.md`
3. `docs/02_ARCHITECTURE.md`
4. `docs/10_MILESTONES_AND_TASKS.md`
Then read the doc(s) named by the milestone you are working on.

## Hard constraints
- **Free and open-source only.** No paid APIs, no API keys, no sign-ups. Every dependency must be installable from PyPI, npm, apt, or a free Hugging Face model download. If a task seems to need a paid service, stop and tell the user instead of adding it.
- **CPU only.** The cloud VM has 4 vCPUs, 16 GB RAM, no GPU. Choose model sizes and settings that run in real time on that.
- **Licences:** only MIT, Apache-2.0, BSD, MPL, or similarly permissive licences for code and models. Record each dependency and its licence in `THIRD_PARTY_LICENSES.md`.
- **Voices:** only the open-licensed built-in voices of the chosen TTS model. Never imitate or clone a real person or a known character (no Mickey Mouse, Donald Duck, etc.). Character names in the UI are our own invented names.
- **Footage:** use the synthetic test clip the project generates (`scripts/make_synthetic_clip.py`) or clips the user places in `data/clips/`. Never download sports footage from the internet.
- **Swappable providers.** Every AI stage (ASR, speaker ID, emotion, TTS) sits behind a small interface so a paid provider can replace the free one later without touching the rest of the code. See `docs/02_ARCHITECTURE.md`.

## Working method
- Work **one milestone at a time** from `docs/10_MILESTONES_AND_TASKS.md`. At the end of each milestone: run the tests, run the milestone's acceptance check, commit, push, and write a short report to the user (what was built, test results, measured numbers, problems, what's next). Then **stop and wait** for the next prompt.
- Keep a running log in `docs/BUILD_LOG.md` (date, milestone, decisions, measured numbers, open issues). Create it if missing.
- Measure, don't guess. Any statement about speed, delay or accuracy must come from a run you did, with the run folder named.
- Prefer simple, readable code over clever code. Type hints in Python, strict TypeScript in the frontend.
- Long-running commands (model downloads, full test runs) can take minutes. Run them in the background if they exceed the foreground timeout, and check back.
- Do not commit large binaries except the small demo outputs described in `docs/09_TESTING_METRICS_REPORT.md` (keep each under 25 MB). Model weights are never committed; they are downloaded into `~/.cache`.

## Commands (create these as part of Milestone 0)
- `make setup` — install system + Python + Node dependencies
- `make test` — run unit tests (pytest) and frontend tests (vitest)
- `make lint` — ruff + mypy (backend), eslint + tsc (frontend)
- `make synth` — generate the synthetic test clip + ground truth
- `make poc CLIP=data/clips/<file>` — run the POC at live speed and produce outputs + report
- `make dev` — run backend + frontend together (Pilot)

## State machines
- Session states live in `app/lifecycle.py` (ready → live → stopping → ended | error). Change a
  session's status only through `SessionManager._set_state`; never assign `ps.status` directly.
- Clients (web, extension, agents) decide what to offer from the `actions` list the API returns.
- `docs/STATE_MACHINES.md` lists every other state machine, its states and its known risks —
  update it when you add or change one.

## Definition of done for any task
- Code runs, tests pass, lint passes.
- New behaviour has at least one test.
- `docs/BUILD_LOG.md` updated.
- Committed and pushed with a clear message.
