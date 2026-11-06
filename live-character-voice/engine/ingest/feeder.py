"""Live-speed feeder (docs/04 §1, docs/02 "Live-speed rule").

Chunk k covers media time [k*c, (k+1)*c) and is released only when the session clock reaches
(k+1)*c. No stage can read ahead: the full decoded array stays private to the feeder.

Clock units: every time in the record is "session seconds" = (monotonic − t0) × speed. At speed 1.0
this is plain wall time since t0 and equals media time, so delay is a subtraction. speed 0 means
"as fast as possible" (unit tests only); session time is then raw wall time.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

from engine.audio import F32


@dataclass(frozen=True)
class AudioChunk:
    index: int
    media_start: float
    media_end: float
    samples: F32


class Clock(Protocol):
    def now(self) -> float: ...

    async def sleep_until(self, t: float) -> None: ...


class SessionClock:
    """Real clock. `start()` sets t0; `now()` returns session seconds."""

    def __init__(self, speed: float = 1.0) -> None:
        if speed < 0:
            raise ValueError("speed must be ≥ 0")
        self.speed = speed
        self.t0: float | None = None
        self.paused_at: float | None = None
        self._resumed: asyncio.Event | None = None

    def start(self) -> None:
        self.t0 = time.monotonic()
        self.paused_at = None
        self._resumed = asyncio.Event()
        self._resumed.set()

    @property
    def paused(self) -> bool:
        return self.paused_at is not None

    def pause(self) -> None:
        """Freeze session time (the viewer paused): feeding and scheduling stop with it."""
        if self.t0 is None or self.paused:
            return
        self.paused_at = time.monotonic()
        if self._resumed is not None:
            self._resumed.clear()

    def resume(self) -> None:
        if self.t0 is None or self.paused_at is None:
            return
        self.t0 += time.monotonic() - self.paused_at
        self.paused_at = None
        if self._resumed is not None:
            self._resumed.set()

    def now(self) -> float:
        if self.t0 is None:
            return 0.0
        end = self.paused_at if self.paused_at is not None else time.monotonic()
        elapsed = end - self.t0
        return elapsed * self.speed if self.speed > 0 else elapsed

    def to_wall_delay(self, session_s: float) -> float:
        return session_s / self.speed if self.speed > 0 else 0.0

    async def sleep_until(self, t: float) -> None:
        if self.speed == 0:
            await asyncio.sleep(0)
            return
        while True:  # re-checked in small steps so a pause holds the feed
            if self.paused and self._resumed is not None:
                await self._resumed.wait()
            delay = self.to_wall_delay(t - self.now())
            if delay <= 0:
                return
            await asyncio.sleep(min(delay, 0.1))


class FakeClock:
    """Deterministic clock for unit tests: sleeping advances time instantly."""

    def __init__(self) -> None:
        self.t = 0.0
        self.sleeps: list[float] = []

    def now(self) -> float:
        return self.t

    async def sleep_until(self, t: float) -> None:
        self.sleeps.append(t)
        self.t = max(self.t, t)
        await asyncio.sleep(0)


async def feed(audio: F32, sr: int, chunk_ms: int, clock: Clock) -> AsyncIterator[AudioChunk]:
    n = int(sr * chunk_ms / 1000)
    total = audio.size
    k = 0
    while k * n < total:
        media_start = k * n / sr
        media_end = min(total, (k + 1) * n) / sr
        await clock.sleep_until(media_end)  # never release early
        yield AudioChunk(k, media_start, media_end, audio[k * n : (k + 1) * n])
        k += 1
