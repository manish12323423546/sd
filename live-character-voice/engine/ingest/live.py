"""Live audio input (V4): audio pushed by a client in real time instead of decoded from a file.

Any capture client — the Chrome extension, the web app's "Live capture" page, a desktop or OBS
helper — sends raw PCM over the session WebSocket: mono, 16 kHz, signed 16-bit little-endian, in
chunks of any size (≈ 100–250 ms is ideal). The engine re-chunks it for the VAD.

Time base: media time = samples received / 16000. The client knows exactly when it captured each
sample, so a line scheduled at media time t maps to the client's own audio clock without any
wall-clock guessing. `MediaClock.now()` interpolates between arrivals (capped) so stage timings
stay smooth when chunks arrive in bursts.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from typing import Any

import numpy as np

from engine.audio import F32
from engine.ingest.feeder import AudioChunk

MAX_INTERP_S = 0.3  # never run more than this ahead of the audio that actually arrived
MAX_BUFFER_S = 30.0  # a stalled engine drops the oldest audio instead of growing forever


class MediaClock:
    """Session clock driven by received audio (for live input)."""

    def __init__(self, sr: int = 16000) -> None:
        self.sr = sr
        self.samples = 0
        self.t0: float | None = None  # set on the first audio (the ws handler waits for it)
        self._last_arrival = 0.0
        self.speed = 1.0
        self.paused = False

    def advance(self, n: int) -> None:
        if self.t0 is None:
            self.t0 = time.monotonic()
        self.samples += n
        self._last_arrival = time.monotonic()

    def start(self) -> None:  # interface parity with SessionClock (t0 is set by the audio)
        return None

    def pause(self) -> None:  # a live stream cannot be paused at the source
        return None

    def resume(self) -> None:
        return None

    def now(self) -> float:
        if self.t0 is None:
            return 0.0
        extra = min(MAX_INTERP_S, time.monotonic() - self._last_arrival)
        return self.samples / self.sr + max(0.0, extra)

    async def sleep_until(self, t: float) -> None:
        while self.now() < t:
            await asyncio.sleep(0.02)


class LiveSource:
    """Thread-safe-enough buffer for one live session (all calls happen on the event loop)."""

    def __init__(self, sr: int = 16000, record_path: str | None = None) -> None:
        self.sr = sr
        self.clock = MediaClock(sr)
        self.record_path = record_path  # the received stream is kept as a WAV (report, replay)
        self._rec: Any = None
        self._buf: list[F32] = []
        self._buffered = 0
        self._event = asyncio.Event()
        self.closed = False
        self.dropped_s = 0.0
        self.received_s = 0.0

    def push_pcm16(self, data: bytes) -> None:
        if self.closed or len(data) < 2:
            return
        x = np.frombuffer(data[: len(data) // 2 * 2], dtype="<i2").astype(np.float32) / 32768.0
        self.push(x)

    def push(self, samples: F32) -> None:
        if self.closed or samples.size == 0:
            return
        if self.record_path is not None:
            if self._rec is None:
                import soundfile as sf

                self._rec = sf.SoundFile(self.record_path, "w", self.sr, 1, "PCM_16")
            self._rec.write(samples)
        self._buf.append(samples.astype(np.float32, copy=False))
        self._buffered += samples.size
        self.received_s += samples.size / self.sr
        self.clock.advance(samples.size)
        over = self._buffered - int(MAX_BUFFER_S * self.sr)
        while over > 0 and self._buf:  # engine fell far behind: keep the newest audio
            head = self._buf.pop(0)
            self._buffered -= head.size
            self.dropped_s += head.size / self.sr
            over -= head.size
        self._event.set()

    def close(self) -> None:
        self.closed = True
        if self._rec is not None:
            self._rec.close()
            self._rec = None
        self._event.set()

    async def chunks(self, chunk_ms: int) -> AsyncIterator[AudioChunk]:
        """Yield fixed-size chunks with media times (silence is never invented)."""
        n = int(self.sr * chunk_ms / 1000)
        pending = np.zeros(0, dtype=np.float32)
        consumed = 0
        k = 0
        while True:
            while pending.size < n and self._buf:
                pending = np.concatenate([pending, *self._buf])
                self._buffered -= sum(b.size for b in self._buf)
                self._buf.clear()
            if pending.size >= n:
                out, pending = pending[:n], pending[n:]
                start = consumed / self.sr
                consumed += n
                yield AudioChunk(k, start, consumed / self.sr, out)
                k += 1
                continue
            if self.closed:
                if pending.size:
                    start = consumed / self.sr
                    consumed += pending.size
                    yield AudioChunk(k, start, consumed / self.sr, pending)
                return
            self._event.clear()
            await self._event.wait()
