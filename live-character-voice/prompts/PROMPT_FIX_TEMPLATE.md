# Fix / tune prompt (use any time)

The last run showed: <paste the problem or number, e.g. "p95 delay 8.2 s" or "speaker 2 mislabelled in the goal section">.

1. Find the cause using `outputs/<run>/lines.csv`, `record.json` and `run.log`. Show me the evidence.
2. Propose up to 3 fixes with the expected effect and the cost in CPU time.
3. Apply the best one, re-run the same clip at speed 1.0, and show before/after numbers side by side.
4. Log the change in `docs/BUILD_LOG.md`, commit, push, report, and stop.
