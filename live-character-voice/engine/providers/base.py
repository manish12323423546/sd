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
    def transcribe(self, audio: AudioArray, sr: int, prompt: str | None = None) -> ASRResult: ...


@runtime_checkable
class SpeakerProvider(Protocol):
    def embed(self, audio: AudioArray, sr: int) -> npt.NDArray[np.float32]: ...


@runtime_checkable
class EmotionProvider(Protocol):
    def analyze(self, audio: AudioArray, sr: int, text: str) -> EmotionResult: ...


@runtime_checkable
class TTSProvider(Protocol):
    def voices(self) -> list[VoiceInfo]: ...

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult: ...
