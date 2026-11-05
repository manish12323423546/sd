"""Structured JSON-lines run log (docs/06 §6.8): one event per stage per line."""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any, TextIO


class RunLog:
    def __init__(self, path: Path | None, echo: bool = False) -> None:
        self._fh: TextIO | None = None
        self._lock = threading.Lock()
        self.echo = echo
        if path is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
            self._fh = path.open("a", encoding="utf-8")

    def log(self, event: str, **fields: Any) -> None:
        row = {"ts": round(time.time(), 3), "event": event, **fields}
        line = json.dumps(row, default=str)
        with self._lock:
            if self._fh:
                self._fh.write(line + "\n")
                self._fh.flush()
        if self.echo:
            print(line, flush=True)

    def close(self) -> None:
        with self._lock:
            if self._fh:
                self._fh.close()
                self._fh = None
