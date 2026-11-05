"""TTS job execution + cache (docs/04 §7).

The async worker pool lives in the orchestrator; this module holds the blocking part that runs in
the TTS thread pool: normalise + shape text, synthesize, write the wav, and the cache
`(line_id, voice_id, style_hash) → wav path` so switching back to a voice re-uses audio.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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


def wav_stream_header(sr: int) -> bytes:
    """16-bit mono WAV header with an open-ended length, for a file that is still growing."""
    import struct

    size = 0x7FFFFFF0
    return (
        b"RIFF" + struct.pack("<I", size + 36) + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16)
        + b"data" + struct.pack("<I", size)
    )  # fmt: skip


def estimate_duration(text: str, speed: float = 1.0) -> float:
    """Rough speech length before the audio is complete (≈ 2.8 words/s at speed 1.0)."""
    return max(0.4, len(text.split()) / (2.8 * max(0.5, speed)))


def stream_line(
    stream: Any,
    sr: int,
    out_dir: Path,
    line_id: str,
    text: str,
    voice_id: str,
    style: DeliveryStyle,
    on_first: Any,
) -> tuple[Path, Path, float]:
    """Write streamed chunks to `<name>.part.wav` as they arrive (served live to the player), call
    `on_first()` on the first chunk, then write the trimmed final `<name>.wav`.
    Returns (part path, final path, final duration)."""
    h = style_hash(text, style)
    out_dir.mkdir(parents=True, exist_ok=True)
    final = out_dir / f"{line_id}_{voice_id}_{h}.wav"
    part = out_dir / f"{line_id}_{voice_id}_{h}.part.wav"
    chunks: list[F32] = []
    with part.open("wb") as f:
        f.write(wav_stream_header(sr))
        for x in stream(text, voice_id, style):
            if x.size == 0:
                continue
            f.write((np.clip(x, -1.0, 1.0) * 32767).astype("<i2").tobytes())
            f.flush()
            if not chunks:
                on_first()
            chunks.append(as_f32(x))
    audio = as_f32(np.concatenate(chunks)) if chunks else np.zeros(0, dtype=np.float32)
    from engine.audio import fade, trim_silence

    audio = fade(trim_silence(audio, sr, threshold_db=-50.0, pad_s=0.03), sr)
    sf.write(final, audio, sr, subtype="PCM_16")
    return part, final, audio.size / sr
