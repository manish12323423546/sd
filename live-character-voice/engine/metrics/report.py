"""Results report (placeholder until M7)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from engine.record.models import SessionRecord


def write_report(run_dir: Path, metrics: dict[str, Any], rec: SessionRecord) -> None:
    (run_dir / "report.md").write_text(
        "# Report\n\n```json\n" + json.dumps(metrics, indent=2) + "\n```\n"
    )
