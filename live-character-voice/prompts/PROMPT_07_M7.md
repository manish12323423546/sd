# PROMPT 07 — M7 — Metrics + report (POC complete)

Continue with **M7** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Implement all metrics and the results report with the delay chart. Run the full POC three times on the synthetic clip at speed 1.0 and report every run plus medians. Commit the report and demo files (each < 25 MB). Then write me a plain-language POC summary: does it work live, the delay, the accuracy, what to improve. If any target was missed, say so clearly with the reasons and top fixes.

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M7: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
