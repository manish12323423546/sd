# PROMPT 10 — M10 — Voice switching, 3 commentators, stability (Pilot complete)

Continue with **M10** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Finish voice switching end-to-end with cache reuse, support 3 commentators (extend the synthetic script with speaker C), and run the 20-minute stability test at speed 1.0. Add `.devcontainer/devcontainer.json` so the Pilot can run in GitHub Codespaces. Write the final Pilot report and a plain-language summary for me.

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M10: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
