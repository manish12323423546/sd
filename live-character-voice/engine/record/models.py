"""Live record data shapes (docs/05 §5.1).

Wall times are stored as seconds since session t0, so at speed 1.0 `wall_time_of(t) == t`
and every delay is a simple subtraction.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class Emotion(StrEnum):
    calm = "calm"
    neutral = "neutral"
    excited = "excited"
    peak = "peak"


EMOTION_ORDER: list[Emotion] = [Emotion.calm, Emotion.neutral, Emotion.excited, Emotion.peak]


class Speaker(BaseModel):
    speaker_id: str
    display_name: str
    color: str
    centroid_n: int = 0
    voice_id: str | None = None


class StageTimes(BaseModel):
    created: float | None = None
    asr_done: float | None = None
    speaker_done: float | None = None
    emotion_done: float | None = None
    complete: float | None = None
    tts_start: float | None = None
    tts_ready: float | None = None
    play_at: float | None = None
    played: float | None = None


class Line(BaseModel):
    line_id: str
    t_start: float
    t_end: float
    close_reason: str
    text: str | None = None
    words: list[tuple[str, float, float, float]] = Field(default_factory=list)
    asr_conf: float | None = None
    speaker_id: str | None = None
    speaker_sim: float | None = None
    speaker_conf: str | None = None
    emotion: Emotion | None = None
    arousal: float | None = None
    features: dict[str, float] = Field(default_factory=dict)
    voice_id: str | None = None
    tts_path: str | None = None
    tts_duration: float | None = None
    schedule_action: str = "none"
    error: str | None = None
    times: StageTimes = Field(default_factory=StageTimes)

    @property
    def delay_ready(self) -> float | None:
        return None if self.times.tts_ready is None else self.times.tts_ready - self.t_end

    @property
    def is_complete(self) -> bool:
        return self.text is not None and self.speaker_id is not None and self.emotion is not None


class SessionRecord(BaseModel):
    session_id: str
    clip_path: str
    mode: str
    speed: float
    source: str
    started_at_iso: str
    config_snapshot: dict[str, Any]
    speakers: dict[str, Speaker] = Field(default_factory=dict)
    lines: list[Line] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def line_id_for(n: int) -> str:
    """Line IDs are 'L' + 6 digits (docs/11 conventions)."""
    return f"L{n:06d}"
