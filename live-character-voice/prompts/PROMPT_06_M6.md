# PROMPT 06 — M6 — Scheduler + renderer

Continue with **M6** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Add the scheduler (fast mode, overlap gap, catch-up policy, drift check) and the offline renderer for `demo_live.mp4`, `demo_synced.mp4`, `voices_only.wav` (+ optional `--separate`). Verify ducking with RMS measurements.

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M6: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
