"""In-memory live record + asyncio event bus (docs/05 §5.2, docs/04 §6).

Single source of truth for one session. Writes happen on the event-loop thread only (stages return
results; the orchestrator writes), so no locks are needed. Every write publishes an event.
"""

from __future__ import annotations

import asyncio
import bisect
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from engine.record.models import Line, SessionRecord, Speaker

EVENTS = (
    "line.created",
    "line.updated",
    "line.asr_done",
    "line.speaker_done",
    "line.emotion_done",
    "line.complete",
    "tts.ready",
    "line.scheduled",
    "speaker.new",
    "speaker.updated",
    "session.warning",
    "session.metrics",
    "session.ended",
)


@dataclass
class Event:
    name: str
    data: dict[str, Any] = field(default_factory=dict)
    seq: int = 0


class Subscription:
    def __init__(self, bus: EventBus, names: set[str] | None) -> None:
        self.bus = bus
        self.names = names
        self.queue: asyncio.Queue[Event | None] = asyncio.Queue()

    def wants(self, name: str) -> bool:
        return self.names is None or name in self.names

    def close(self) -> None:
        self.bus.unsubscribe(self)
        self.queue.put_nowait(None)

    def __aiter__(self) -> AsyncIterator[Event]:
        return self._iter()

    async def _iter(self) -> AsyncIterator[Event]:
        while True:
            ev = await self.queue.get()
            if ev is None:
                return
            yield ev


class EventBus:
    def __init__(self) -> None:
        self._subs: list[Subscription] = []
        self._seq = 0
        self.history_counts: dict[str, int] = {}

    def subscribe(self, *names: str) -> Subscription:
        sub = Subscription(self, set(names) if names else None)
        self._subs.append(sub)
        return sub

    def unsubscribe(self, sub: Subscription) -> None:
        if sub in self._subs:
            self._subs.remove(sub)

    def publish(self, name: str, **data: Any) -> Event:
        self._seq += 1
        ev = Event(name, data, self._seq)
        self.history_counts[name] = self.history_counts.get(name, 0) + 1
        for sub in list(self._subs):
            if sub.wants(name):
                sub.queue.put_nowait(ev)
        return ev

    def close_all(self) -> None:
        for sub in list(self._subs):
            sub.close()


class RecordStore:
    def __init__(self, record: SessionRecord) -> None:
        self.record = record
        self.bus = EventBus()
        self._by_id: dict[str, Line] = {}
        self._starts: list[float] = []  # sorted t_start, parallel to record.lines

    # ---- lines ----
    def add_line(self, line: Line) -> None:
        if line.line_id in self._by_id:
            raise ValueError(f"duplicate line id {line.line_id}")
        idx = bisect.bisect_right(self._starts, line.t_start)
        self._starts.insert(idx, line.t_start)
        self.record.lines.insert(idx, line)
        self._by_id[line.line_id] = line
        self.bus.publish("line.created", line_id=line.line_id)

    def update_line(self, line_id: str, event: str = "line.updated", **fields: Any) -> Line:
        line = self._by_id[line_id]
        for key, value in fields.items():
            if key.startswith("times."):
                setattr(line.times, key[6:], value)
            elif not hasattr(line, key):
                raise AttributeError(f"Line has no field {key!r}")
            else:
                setattr(line, key, value)
        self.bus.publish(event, line_id=line_id, fields=sorted(fields))
        return line

    def get(self, line_id: str) -> Line:
        return self._by_id[line_id]

    def lines_between(self, t_a: float, t_b: float) -> list[Line]:
        """Lines overlapping [t_a, t_b)."""
        return [ln for ln in self.record.lines if ln.t_start < t_b and ln.t_end > t_a]

    def last_n(self, speaker_id: str | None, n: int, before: float | None = None) -> list[Line]:
        out: list[Line] = []
        for ln in reversed(self.record.lines):
            if before is not None and ln.t_start >= before:
                continue
            if speaker_id is None or ln.speaker_id == speaker_id:
                out.append(ln)
                if len(out) == n:
                    break
        return list(reversed(out))

    def previous(self, line: Line) -> Line | None:
        idx = self.record.lines.index(line)
        return self.record.lines[idx - 1] if idx > 0 else None

    # ---- speakers ----
    def upsert_speaker(self, sp: Speaker) -> None:
        is_new = sp.speaker_id not in self.record.speakers
        self.record.speakers[sp.speaker_id] = sp
        self.bus.publish("speaker.new" if is_new else "speaker.updated", speaker_id=sp.speaker_id)

    def warn(self, message: str) -> None:
        self.record.warnings.append(message)
        self.bus.publish("session.warning", message=message)

    # ---- persistence ----
    def snapshot(self) -> SessionRecord:
        return self.record.model_copy(deep=True)

    def checkpoint(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(self.record.model_dump_json(indent=1))
        tmp.replace(path)

    @staticmethod
    def load(path: Path) -> SessionRecord:
        return SessionRecord.model_validate_json(path.read_text())

    def subscribe(self, *events: str) -> Subscription:
        return self.bus.subscribe(*events)
