"""TTS job execution + cache (docs/04 §7).

The async worker pool lives in the orchestrator; this module holds the blocking part that runs in
the TTS thread pool: normalise + shape text, synthesize, write the wav, and the cache
`(line_id, voice_id, style_hash) → wav path` so switching back to a voice re-uses audio.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from engine.audio import F32, as_f32, soft_limit
from engine.providers.base import DeliveryStyle, TTSProvider
from engine.tts.style import shape_text, style_hash
from engine.tts.text_normalize import normalize_for_tts


@dataclass
class TtsOutput:
    path: Path
    duration: float
    text: str
    cached: bool
    peak: float


class TtsCache:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._items: dict[tuple[str, str, str], TtsOutput] = {}

    def get(self, key: tuple[str, str, str]) -> TtsOutput | None:
        with self._lock:
            return self._items.get(key)

    def put(self, key: tuple[str, str, str], value: TtsOutput) -> None:
        with self._lock:
            self._items[key] = value

    def __len__(self) -> int:
        return len(self._items)


def prepare_text(raw: str, style: DeliveryStyle, glossary: list[str]) -> str:
    return shape_text(normalize_for_tts(raw, glossary), style.emotion)


def synthesize_line(
    tts: TTSProvider,
    cache: TtsCache,
    out_dir: Path,
    line_id: str,
    raw_text: str,
    voice_id: str,
    style: DeliveryStyle,
    glossary: list[str],
) -> TtsOutput:
    text = prepare_text(raw_text, style, glossary)
    h = style_hash(text, style)
    key = (line_id, voice_id, h)
    hit = cache.get(key)
    if hit is not None and hit.path.exists():
        return TtsOutput(hit.path, hit.duration, hit.text, True, hit.peak)
    res = tts.synthesize(text, voice_id, style)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{line_id}_{voice_id}_{h}.wav"
    sf.write(path, res.audio, res.sr, subtype="PCM_16")
    out = TtsOutput(path, res.duration_s, text, False, float(np.max(np.abs(res.audio), initial=0)))
    cache.put(key, out)
    return out


def time_stretch(audio: F32, sr: int, rate: float) -> F32:
    """Phase-vocoder time-stretch (pitch kept). librosa 1.0 rejects some (length, rate) pairs, so
    retry with a little zero padding; as a last resort speed up by resampling (pitch rises
    slightly, ≈ +2.4 semitones at 1.15×)."""
    import librosa

    for pad in (0, 256, 1024):
        try:
            x = np.pad(audio, (0, pad)) if pad else audio
            return as_f32(librosa.effects.time_stretch(as_f32(x), rate=rate))
        except Exception:
            continue
    from engine.audio import resample

    return resample(audio, round(sr * rate), sr)


def stretch_file(path: Path, rate: float) -> tuple[Path, float]:
    """Time-stretch a wav by `rate` (> 1 = faster) for catch-up. Returns (new path, duration)."""
    audio, sr = sf.read(path, dtype="float32")
    fast = soft_limit(time_stretch(as_f32(audio), int(sr), rate), -1.0)
    new = path.with_name(f"{path.stem}_x{rate:.2f}.wav")
    sf.write(new, fast, sr, subtype="PCM_16")
    return new, fast.size / sr
