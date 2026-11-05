"""Line segmenter: decides WHEN a line is ready (docs/04 §2). Pure numpy, frame-based (32 ms).

A line closes when ANY of these happens:
  pause          silence after speech ≥ end_silence_ms
  max_len        line duration ≥ max_line_s (cut at the quietest frame in the last 1.0 s)
  burst          short (≤ 1.2 s) loud speech (≥ burst_db above the running median of line
                 loudness) followed by ≥ 200 ms drop — silence, or the level falling ≥ 6 dB (a
                 crowd roar right after "Goal!" keeps the VAD on, but the voice level drops)
  level_change   (added in M2, see BUILD_LOG) at a micro-pause (≥ 96 ms) the next 160 ms of speech
                 is ≥ level_split_db louder or quieter than the line so far: a shout starting
                 right after a phrase, or the end of a shout. Splits run-on excited commentary.
  speaker_change requested by the orchestrator via `force_split()` (embedding check)
  end            end of stream
Speech segments shorter than min_line_ms are discarded unless they qualify as a burst.
Line audio is returned with pad_ms on both sides for ASR; stored times are unpadded. Post-padding
only includes audio that has already arrived (no read-ahead).
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np

from engine.audio import F32, frame_db
from engine.config import SegmentConfig

FRAME = 512
BURST_MAX_S = 1.2
BURST_DROP_MS = 200
BURST_DROP_DB = 6.0
BURST_HISTORY_S = 60.0
MICRO_PAUSE_FRAMES = 3  # 96 ms
ONSET_FRAMES = 5  # 160 ms of new speech to judge its level
MIN_BEFORE_S = 0.3
BUFFER_KEEP_S = 30.0  # rolling audio buffer (memory stays flat on long sessions)


@dataclass
class LineCandidate:
    t_start: float
    t_end: float
    close_reason: str
    audio: F32  # padded
    pad_before_s: float  # seconds of padding before t_start inside `audio`
    loudness_db: float


def _energy_db(levels: list[float]) -> float:
    if not levels:
        return -100.0
    return float(10 * np.log10(np.mean(10 ** (np.asarray(levels) / 10)) + 1e-12))


class LineSegmenter:
    def __init__(self, cfg: SegmentConfig, vad_threshold: float = 0.5, sr: int = 16000):
        self.cfg = cfg
        self.sr = sr
        self.fd = FRAME / sr  # frame duration (s)
        self.on_thr = vad_threshold
        self.off_thr = max(0.05, vad_threshold - 0.15)  # Silero-style hysteresis
        self.frames_done = 0
        self.start: int | None = None  # first frame of the open line
        self.last_speech = -1
        self.levels: list[float] = []  # dB of every frame in the open line (from self.start)
        self.speech: list[bool] = []  # VAD decision for every frame in the open line
        self.silence_run = 0
        self.resume: tuple[int, int] | None = None  # (pause_start, resume) of last micro-pause
        self.history: deque[tuple[float, float]] = deque()  # (t_end, loudness) of past lines
        self.buf = np.zeros(0, dtype=np.float32)
        self.buf_offset = 0  # sample index of buf[0]

    # ---- public API ----
    def push(self, probs: F32, frames: F32) -> list[LineCandidate]:
        """Feed VAD probabilities and their raw frames (n, 512). Returns closed lines."""
        if frames.size:
            self._append_audio(frames.reshape(-1))
        levels = frame_db(frames.reshape(-1), FRAME) if frames.size else np.zeros(0, np.float32)
        out: list[LineCandidate] = []
        for p, lvl in zip(probs.tolist(), levels.tolist(), strict=True):
            i = self.frames_done
            self.frames_done += 1
            closed = self._step(i, float(p), float(lvl))
            if closed is not None:
                out.append(closed)
        return out

    def flush(self) -> list[LineCandidate]:
        if self.start is None:
            return []
        line = self._close(self.last_speech + 1, "end")
        return [line] if line else []

    @property
    def now(self) -> float:
        return self.frames_done * self.fd

    def open_line(self) -> tuple[float, float] | None:
        """(t_start, t_last_speech_end) of the open line, if any."""
        if self.start is None:
            return None
        return self.start * self.fd, (self.last_speech + 1) * self.fd

    def recent_audio(self, t_a: float, t_b: float) -> F32:
        a = max(0, int(t_a * self.sr) - self.buf_offset)
        b = max(0, int(t_b * self.sr) - self.buf_offset)
        return self.buf[a:b].copy()

    def force_split(self, t_a: float, t_b: float) -> LineCandidate | None:
        """Close the open line at the quietest frame in [t_a, t_b) (speaker change).
        The remainder continues as a new open line."""
        if self.start is None:
            return None
        lo = max(self.start + int(MIN_BEFORE_S / self.fd), int(t_a / self.fd))
        hi = min(self.frames_done, int(t_b / self.fd))
        if hi <= lo:
            return None
        cut = self._quietest(lo, hi)
        return self._close(cut, "speaker_change", keep_open_from=cut)

    # ---- internals ----
    def _append_audio(self, samples: F32) -> None:
        self.buf = np.concatenate([self.buf, samples])
        keep = int(BUFFER_KEEP_S * self.sr)
        if (self.buf.size > keep * 1.5 and self.start is None) or self.buf.size > keep * 4:
            drop = self.buf.size - keep
            if self.start is not None:  # never drop audio of the open line
                drop = min(drop, self.start * FRAME - self.buf_offset - int(self.sr))
            if drop > 0:
                self.buf = self.buf[drop:]
                self.buf_offset += drop

    def _rel(self, i: int) -> int:
        assert self.start is not None
        return i - self.start

    def _loud(self, lo: int, hi: int) -> float:
        """Energy-mean dB of speech frames in absolute frames [lo, hi)."""
        a, b = self._rel(lo), self._rel(hi)
        return _energy_db(
            [lv for lv, sp in zip(self.levels[a:b], self.speech[a:b], strict=True) if sp]
        )

    def _step(self, i: int, p: float, lvl: float) -> LineCandidate | None:
        if self.start is None:
            if p >= self.on_thr:
                self.start = i
                self.last_speech = i
                self.levels, self.speech = [lvl], [True]
                self.silence_run = 0
                self.resume = None
            return None

        is_speech = p >= self.off_thr
        self.levels.append(lvl)
        self.speech.append(is_speech)
        if is_speech:
            if self.silence_run >= MICRO_PAUSE_FRAMES:
                self.resume = (self.last_speech + 1, i)
            self.silence_run = 0
            self.last_speech = i
            if (i + 1 - self.start) * self.fd >= self.cfg.max_line_s:
                lo = max(self.start + 1, i - int(1.0 / self.fd))
                return self._close(self._quietest(lo, i), "max_len", keep_open_from=None)
            split = self._level_change(i)
            if split is not None:
                return split
            return self._energy_drop_burst(i)

        self.silence_run += 1
        silence_ms = self.silence_run * self.fd * 1000
        line_s = (self.last_speech + 1 - self.start) * self.fd
        if (
            silence_ms >= BURST_DROP_MS
            and line_s <= BURST_MAX_S
            and self._is_loud(self._loud(self.start, self.last_speech + 1))
        ):
            return self._close(self.last_speech + 1, "burst")
        if silence_ms >= self.cfg.end_silence_ms:
            return self._close(self.last_speech + 1, "pause")
        return None

    def _level_change(self, i: int) -> LineCandidate | None:
        if self.resume is None or self.start is None:
            return None
        pause_start, resume = self.resume
        if i != resume + ONSET_FRAMES - 1:
            return None
        self.resume = None
        if (pause_start - self.start) * self.fd < MIN_BEFORE_S:
            return None
        before = self._loud(self.start, pause_start)
        after = self._loud(resume, i + 1)
        if abs(after - before) < self.cfg.level_split_db:
            return None
        return self._close(pause_start, "level_change", keep_open_from=resume)

    def _energy_drop_burst(self, i: int) -> LineCandidate | None:
        """Shout followed by ≥ 200 ms of level ≥ 6 dB lower while VAD still says speech."""
        assert self.start is not None
        drop_frames = int(BURST_DROP_MS / 1000 / self.fd)
        head_end = i + 1 - drop_frames
        if head_end <= self.start or (head_end - self.start) * self.fd > BURST_MAX_S:
            return None
        head = self._loud(self.start, head_end)
        tail = self.levels[self._rel(head_end) :]
        if not self._is_loud(head) or max(tail) > head - BURST_DROP_DB:
            return None
        return self._close(head_end, "burst", keep_open_from=head_end)

    def _is_loud(self, loudness: float) -> bool:
        if len(self.history) < 3:
            return False
        med = float(np.median([v for _, v in self.history]))
        return loudness >= med + self.cfg.burst_db

    def _quietest(self, lo: int, hi: int) -> int:
        """Frame index in [lo, hi) with the lowest level (absolute frame index)."""
        if self.start is None or hi <= lo:
            return hi
        levels = self.levels[self._rel(lo) : self._rel(hi)]
        return lo + int(np.argmin(levels)) if levels else hi

    def _close(
        self, end: int, reason: str, keep_open_from: int | None = -1
    ) -> LineCandidate | None:
        """Close [start, end). keep_open_from: frame where a new open line continues
        (max_len passes None → continue right at `end`; -1 → nothing stays open)."""
        assert self.start is not None
        start = self.start
        t_start, t_end = start * self.fd, end * self.fd
        loud = self._loud(start, end)
        if keep_open_from is None:
            keep_open_from = end
        if keep_open_from >= 0 and keep_open_from < self.frames_done:
            r = self._rel(keep_open_from)
            self.levels, self.speech = self.levels[r:], self.speech[r:]
            self.start = keep_open_from
            self.last_speech = max(self.last_speech, keep_open_from)
            self.resume = None
        else:
            self.start = None
            self.levels, self.speech = [], []
            self.resume = None
        dur_ms = (t_end - t_start) * 1000
        if dur_ms < self.cfg.min_line_ms and reason != "burst":
            return None
        self.history.append((t_end, loud))
        while self.history and t_end - self.history[0][0] > BURST_HISTORY_S:
            self.history.popleft()
        pad = self.cfg.pad_ms / 1000
        pa = max(0.0, t_start - pad)
        pb = min(self.now, t_end + pad)
        audio = self.recent_audio(pa, pb)
        return LineCandidate(t_start, t_end, reason, audio, t_start - pa, loud)
