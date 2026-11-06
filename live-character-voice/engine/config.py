"""Load and validate `config/engine.yaml` and `config/voices.yaml` (docs/06 §6.2, docs/08 §8.2)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AudioConfig(_Strict):
    analysis_sr: int = 16000
    chunk_ms: int = 500


class VadConfig(_Strict):
    threshold: float = Field(0.5, ge=0.0, le=1.0)


class SegmentConfig(_Strict):
    end_silence_ms: int = 350
    max_line_s: float = 6.0
    min_line_ms: int = 250
    pad_ms: int = 120
    burst_db: float = 10.0
    split_sim: float = 0.45
    level_split_db: float = 6.0  # level-change split at micro-pauses (M2)
    speaker_split: bool = True  # soft speaker-change split (docs/04 §2), needs speaker model
    # V3: close a phrase at a short breath once it is this long, so voicing starts sooner
    phrase_min_s: float = 0.0  # 0 = off
    phrase_pause_ms: int = 160


class AsrConfig(_Strict):
    provider: str = "faster_whisper"
    model: str = "small.en"
    compute_type: str = "int8"
    cpu_threads: int = 2
    beam_size: int = 1
    fallback_model: str = "base.en"
    groq_model: str = "whisper-large-v3-turbo"  # provider "groq" (free tier)
    # V3: send this much audio from BEFORE the line too (Whisper hears the run-up, so short
    # shouts and phrase starts are recognised), then keep only the line's own words by timestamp
    context_s: float = 0.0


class SpeakerConfig(_Strict):
    provider: str = "ecapa"
    max_speakers: int = Field(2, ge=1, le=8)
    tracker: Literal["v1", "v2"] = "v2"  # v2: voice banks + merges (V7); v1: one centroid, ≤ 3
    assign_sim: float = 0.55
    ema_alpha: float = 0.1
    enroll_file: str | None = None


class EmotionThresholds(_Strict):
    calm: float = -0.5
    excited: float = 0.8
    peak: float = 1.8


class EmotionConfig(_Strict):
    provider: str = "prosody"
    weights: dict[str, float] = Field(
        default_factory=lambda: {"loudness": 0.45, "pitch": 0.30, "rate": 0.15, "text": 0.10}
    )
    thresholds: EmotionThresholds = Field(default_factory=EmotionThresholds)


class TtsConfig(_Strict):
    provider: str = "kokoro"
    workers: int = Field(2, ge=1)
    lang_code: str = "a"
    voice_map: dict[str, str] = Field(
        default_factory=lambda: {"S1": "bm_george", "S2": "am_adam", "S3": "af_bella"}
    )
    fish_model: str = "s2.1-pro-free"  # provider "fish": $0 free tier
    fish_latency: str = "balanced"  # normal | balanced | low
    streaming: bool = True  # start playback on the first audio chunk (providers with .stream)


class StyleConfig(_Strict):
    pitch_shift: bool = False


class ScheduleConfig(_Strict):
    mode: Literal["fast", "synced"] = "fast"
    gap_ms: int = 80
    lag_soft_s: float = 3.5
    lag_hard_s: float = 6.0
    max_speedup: float = 1.15
    # V3 "synced" viewing: the viewer's picture runs this many seconds behind live, so every
    # voice line can start exactly when the original line started (0 = live, lowest latency).
    broadcast_delay_s: float = Field(0.0, ge=0.0, le=20.0)
    # V3: ask the voice to fit the original line's length (prevents queues, speed-ups, drops)
    fit_duration: bool = True
    max_fit_speed: float = 1.3


class RenderConfig(_Strict):
    out_sr: int = 48000
    duck_gain: float = Field(0.25, ge=0.0, le=1.0)
    duck_ramp_ms: int = 80
    voice_gain_db: float = 0.0


class RuntimeConfig(_Strict):
    # CPU split measured in M7: ASR 2 threads + torch (Kokoro, ECAPA) 2 threads beats 4 + 4
    # (oversubscription) on a 4-vCPU VM. See BUILD_LOG.
    torch_threads: int = Field(4, ge=1)
    compute_lane: bool = False  # ASR + TTS serialized on one priority lane (oldest line first)


class EngineConfig(_Strict):
    mode: Literal["poc", "pilot"] = "poc"
    source: Literal["asr", "captions"] = "asr"
    speed: float = Field(1.0, ge=0.0)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    vad: VadConfig = Field(default_factory=VadConfig)
    segment: SegmentConfig = Field(default_factory=SegmentConfig)
    asr: AsrConfig = Field(default_factory=AsrConfig)
    speaker: SpeakerConfig = Field(default_factory=SpeakerConfig)
    emotion: EmotionConfig = Field(default_factory=EmotionConfig)
    tts: TtsConfig = Field(default_factory=TtsConfig)
    style: StyleConfig = Field(default_factory=StyleConfig)
    schedule: ScheduleConfig = Field(default_factory=ScheduleConfig)
    render: RenderConfig = Field(default_factory=RenderConfig)
    runtime: RuntimeConfig = Field(default_factory=RuntimeConfig)

    def snapshot(self) -> dict[str, Any]:
        return self.model_dump(mode="json")

    def snapshot_hash(self) -> str:
        blob = json.dumps(self.snapshot(), sort_keys=True).encode()
        return hashlib.sha256(blob).hexdigest()[:12]


class VoiceEntry(_Strict):
    voice_id: str
    name: str
    description: str
    lang_code: str
    base_speed: float = 1.0
    enabled_in_pilot: bool = False

    @field_validator("voice_id")
    @classmethod
    def _kokoro_style_id(cls, v: str) -> str:
        # Kokoro voice ids look like "bm_george": <lang><gender>_<name>.
        if len(v) < 4 or v[2] != "_":
            raise ValueError(f"unexpected voice id format: {v!r}")
        return v


class VoiceCatalog(_Strict):
    preview_text: str
    voices: list[VoiceEntry]

    def get(self, voice_id: str) -> VoiceEntry:
        for v in self.voices:
            if v.voice_id == voice_id:
                return v
        raise KeyError(voice_id)

    def pilot_voices(self) -> list[VoiceEntry]:
        return [v for v in self.voices if v.enabled_in_pilot]


def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a mapping at the top level")
    return data


def load_engine_config(path: Path | None = None) -> EngineConfig:
    return EngineConfig.model_validate(_read_yaml(path or CONFIG_DIR / "engine.yaml"))


def load_voice_catalog(path: Path | None = None, include_custom: bool = True) -> VoiceCatalog:
    """Built-in voices (voices.yaml) plus the user's custom cloned voices (data/voices/custom)."""
    cat = VoiceCatalog.model_validate(_read_yaml(path or CONFIG_DIR / "voices.yaml"))
    if include_custom:
        from engine.voices_custom import catalog_entries

        cat.voices.extend(catalog_entries())
    return cat
