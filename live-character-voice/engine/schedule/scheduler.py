"""Scheduler maths (docs/04 §8): when each generated line plays, catch-up policy, drift check.

Pure functions so they are unit-testable; the orchestrator owns the ordering and the I/O.

fast mode:  play_at = max(tts_ready, own t_start, previous_end + gap)
            A different speaker may overlap the previous line by ≤ 300 ms, and only when the
            original lines overlapped too.
catch-up:   lag = play_at − t_end
            lag > lag_soft → speed playback up (≤ max_speedup)
            lag > lag_hard → drop short neutral "filler" (never excited/peak); merge consecutive
                             same-speaker lines before synthesis
drift:      slope of a straight-line fit of delay vs media time; > 0.02 s/s → warning
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from engine.config import ScheduleConfig
from engine.record.models import Emotion

MAX_CROSS_SPEAKER_OVERLAP_S = 0.3
FILLER_MAX_S = 1.2
DRIFT_WARN_SLOPE = 0.02


@dataclass
class PrevPlayback:
    speaker_id: str | None
    play_end: float  # session seconds
    t_end: float  # media end of the original line


@dataclass
class Plan:
    play_at: float
    speedup: float  # 1.0 = none
    action: str  # none | speedup
    lag: float


def plan_playback(
    *,
    tts_ready: float,
    t_start: float,
    t_end: float,
    speaker_id: str | None,
    duration: float,
    prev: PrevPlayback | None,
    cfg: ScheduleConfig,
) -> Plan:
    earliest = max(tts_ready, t_start)
    if prev is not None:
        gap = cfg.gap_ms / 1000
        after_prev = prev.play_end + gap
        if speaker_id != prev.speaker_id and prev.t_end > t_start:
            source_overlap = prev.t_end - t_start
            after_prev = prev.play_end - min(MAX_CROSS_SPEAKER_OVERLAP_S, source_overlap)
        earliest = max(earliest, after_prev)
    lag = earliest - t_end
    speedup = 1.0
    action = "none"
    if lag > cfg.lag_soft_s:
        # scale the speed-up with how far behind we are; full speed-up at lag_hard
        span = max(1e-6, cfg.lag_hard_s - cfg.lag_soft_s)
        frac = min(1.0, (lag - cfg.lag_soft_s) / span)
        speedup = round(1.0 + (cfg.max_speedup - 1.0) * max(0.5, frac), 3)
        action = "speedup"
    return Plan(play_at=earliest, speedup=speedup, action=action, lag=lag)


def should_drop(
    lag: float, emotion: Emotion | None, line_duration: float, cfg: ScheduleConfig
) -> bool:
    """Drop short neutral filler when far behind. Never drop excited/peak lines."""
    if lag <= cfg.lag_hard_s:
        return False
    if emotion in (Emotion.excited, Emotion.peak):
        return False
    return emotion in (Emotion.neutral, Emotion.calm, None) and line_duration < FILLER_MAX_S


def drift_slope(t_ends: list[float], delays: list[float]) -> float:
    """Least-squares slope of delay vs media time (s/s). 0 with < 3 points."""
    if len(t_ends) < 3:
        return 0.0
    x = np.asarray(t_ends, dtype=np.float64)
    y = np.asarray(delays, dtype=np.float64)
    if float(np.ptp(x)) < 1e-6:
        return 0.0
    slope, _ = np.polyfit(x, y, 1)
    return float(slope)


def drift_warning(slope: float) -> bool:
    return slope > DRIFT_WARN_SLOPE
