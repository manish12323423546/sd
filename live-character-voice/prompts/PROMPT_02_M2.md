# PROMPT 02 — M2 — Ingest, live-speed feeder, VAD, segmenter, live record

Continue with **M2** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Build the live-speed feeder (no reading ahead), Silero VAD, the line segmenter with all closing rules, and the in-memory live record with events and checkpoints. Prove the run takes the clip's real duration.

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M2: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
