# PROMPT 03 — M3 — ASR + speaker ID

Continue with **M3** from `docs/10_MILESTONES_AND_TASKS.md`.

What to do: Add faster-whisper ASR (with glossary prompt), captions mode, ECAPA speaker embeddings with online clustering and enrollment. Run ASR, speaker and a stub emotion in parallel per line. Report WER and speaker accuracy with and without the enroll file.

Before coding, re-read the docs this milestone depends on (see the milestone text and the section references in it). Follow `CLAUDE.md`.

When finished:
1. Run `make lint` and `make test` (and the slow integration tests for this milestone).
2. Run the milestone's **Accept** check and paste the numbers.
3. Update `docs/BUILD_LOG.md` (decisions, measured numbers, open issues).
4. Commit and push with message `M3: ...`.
5. Report to me in plain language: what was built, the measured numbers vs the targets, problems, and what the next milestone will do. Then **stop and wait**.

If a target is missed, do not hide it: explain why and propose the top 3 fixes, and ask me whether to fix now or continue.
