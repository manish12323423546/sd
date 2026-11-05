"""Swappable provider interfaces (docs/02 "Provider interfaces").

Nothing outside `engine/providers/` may import a model library directly. Free implementations
live in `providers/free/`, paid ones (later) in `providers/paid/`.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np
import numpy.typing as npt
from pydantic import BaseModel, ConfigDict, Field

from engine.record.models import Emotion

AudioArray = npt.NDArray[np.float32]


class Word(BaseModel):
    word: str
    start: float
    end: float
    prob: float


class ASRResult(BaseModel):
    text: str
    words: list[Word] = Field(default_factory=list)
    avg_logprob: float = 0.0
    no_speech_prob: float = 0.0


class EmotionResult(BaseModel):
    label: Emotion
    arousal: float
    features: dict[str, float] = Field(default_factory=dict)


class EmotionContext(BaseModel):
    """Everything the emotion stage may use for one line."""

    features: dict[str, float]
    text: str
    words: list[Word] = Field(default_factory=list)
    speaker_id: str | None = None
    t_start: float
    t_end: float


class VoiceInfo(BaseModel):
    voice_id: str
    lang_code: str
    name: str | None = None


class DeliveryStyle(BaseModel):
    """How a line should be delivered (docs/08 §8.3)."""

    speed: float = 1.0
    gain_db: float = 0.0
    pitch_semitones: float = 0.0
    emotion: Emotion = Emotion.neutral


class TTSResult(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    audio: AudioArray
    sr: int
    duration_s: float


@runtime_checkable
class ASRProvider(Protocol):
    def transcribe(
        self,
        audio: AudioArray,
        sr: int,
        prompt: str | None = None,
        span: tuple[float, float] | None = None,
    ) -> ASRResult:
        """`span` is the line's (t_start, t_end) in media seconds (used by captions mode)."""
        ...


@runtime_checkable
class SpeakerProvider(Protocol):
    def embed(self, audio: AudioArray, sr: int) -> npt.NDArray[np.float32]: ...


@runtime_checkable
class EmotionProvider(Protocol):
    """Two steps so the audio part can run in parallel with ASR (docs/02 concurrency model)."""

    def audio_features(self, audio: AudioArray, sr: int) -> dict[str, float]: ...

    def analyze(self, ctx: EmotionContext) -> EmotionResult: ...


@runtime_checkable
class TTSProvider(Protocol):
    def voices(self) -> list[VoiceInfo]: ...

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult: ...
