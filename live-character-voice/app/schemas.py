"""API request/response models (docs/06 §6.4)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class VoiceOut(BaseModel):
    voice_id: str
    name: str
    description: str
    lang: str
    preview_url: str
    custom: bool = False
    tier: str = "builtin"  # builtin | instant | pro
    score: int | None = None  # pro voices: quality-test similarity, 0–100


class SayRequest(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    emotion: str = "neutral"


class ClipOut(BaseModel):
    clip_id: str
    name: str
    duration: float
    url: str
    has_truth: bool
    has_enroll: bool


class CreateSession(BaseModel):
    clip_id: str
    max_speakers: int = Field(2, ge=1, le=3)
    voice_map: dict[str, str] | None = None
    use_enroll: bool = False
    speed: float = Field(
        1.0, ge=0.25, le=8.0, description="1.0 = live; >1 for dev smoke tests only"
    )
    view_delay_s: float = Field(
        0.0, ge=0.0, le=15.0,
        description="synced viewing: picture held back this long so voices land on time; 0 = live",
    )  # fmt: skip


class SessionCreated(BaseModel):
    session_id: str
    ws_url: str


class SpeakerOut(BaseModel):
    speaker_id: str
    display_name: str
    color: str
    voice_id: str | None


class SessionStatus(BaseModel):
    session_id: str
    clip_id: str
    status: str  # ready | live | ended | error
    speed: float
    max_speakers: int
    speakers: list[SpeakerOut]
    metrics: dict[str, float | int]
    report_url: str | None = None
    error: str | None = None
