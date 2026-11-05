# PROMPT 00 — Kickoff (paste this first)

You are the lead engineer on this repository. We are building **Live Sports Character Voice**.

1. Read `CLAUDE.md`, `00_START_HERE.md`, then every file in `docs/` (01 → 14) so you understand the whole system before writing code.
2. Reply with a short plan (max 15 lines): your understanding of the goal, the two stages (POC, Pilot), the milestone order, and any conflicts or gaps you found in the docs.
3. Then start **Milestone 0** from `docs/10_MILESTONES_AND_TASKS.md` and complete it fully:
   - check tools and record versions + CPU count,
   - install system packages if missing (ffmpeg, espeak-ng, libsndfile1, sox),
   - create the repo structure, `pyproject.toml`, `Makefile` (setup/test/lint/synth/poc/dev), `.gitignore`, config files, `docs/BUILD_LOG.md`, `THIRD_PARTY_LICENSES.md`,
   - install CPU-only torch,
   - implement `python -m engine.cli check` (also tests whether huggingface.co is reachable),
   - add a GitHub Actions workflow for lint + unit tests,
   - make `make lint` and `make test` pass.
4. Commit and push (`M0: ...`).
5. Report back: what you built, `check` output, any blocked network domains, and what Milestone 1 will do. Then **stop and wait** for my next message.

Rules: free and open-source tools only, no API keys, CPU only, original voices only. If anything needs a paid service or a blocked domain, stop and tell me.
