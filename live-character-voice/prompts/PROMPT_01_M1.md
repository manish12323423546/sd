# PROMPT 01 — M1 — Models + synthetic test clip

Continue with **M1** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Download and benchmark the models, list the available Kokoro voices, record licences, and build the synthetic match clip with ground truth and enroll file. Choose the ASR model from the benchmark (p95 for a 3 s line must be ≤ 1.5 s).

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M1: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
