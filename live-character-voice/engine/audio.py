"""Small numpy audio helpers shared by every stage (no model libraries here)."""

from __future__ import annotations

from math import gcd

import numpy as np
import numpy.typing as npt
from scipy.signal import resample_poly

F32 = npt.NDArray[np.float32]
EPS = 1e-10


def as_f32(x: npt.ArrayLike) -> F32:
    return np.ascontiguousarray(np.asarray(x, dtype=np.float32))


def resample(audio: F32, sr_in: int, sr_out: int) -> F32:
    """High-quality polyphase resampling (scipy, BSD)."""
    if sr_in == sr_out or audio.size == 0:
        return as_f32(audio)
    g = gcd(sr_in, sr_out)
    return as_f32(resample_poly(audio, sr_out // g, sr_in // g))


def db_to_gain(db: float) -> float:
    return float(10.0 ** (db / 20.0))


def gain_to_db(g: float) -> float:
    return float(20.0 * np.log10(max(g, EPS)))


def rms(audio: F32) -> float:
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))


def rms_db(audio: F32) -> float:
    """RMS level in dBFS (−100 for silence)."""
    return max(-100.0, gain_to_db(rms(audio)))


def peak_db(audio: F32) -> float:
    return gain_to_db(float(np.max(np.abs(audio))) if audio.size else 0.0)


def soft_limit(audio: F32, ceiling_db: float = -1.0) -> F32:
    """Peak-normalise down (never up) so the peak sits at or below `ceiling_db`, then apply a
    gentle tanh knee above 90 % of the ceiling. Guarantees no sample exceeds the ceiling."""
    ceiling = db_to_gain(ceiling_db)
    out = as_f32(audio)
    peak = float(np.max(np.abs(out))) if out.size else 0.0
    if peak <= ceiling * 0.9:
        return out
    knee = ceiling * 0.9
    mag = np.abs(out)
    over = mag > knee
    shaped = mag.copy()
    span = ceiling - knee
    shaped[over] = knee + span * np.tanh((mag[over] - knee) / span)
    return as_f32(np.sign(out) * np.minimum(shaped, ceiling))


def count_clipped(audio: F32, threshold: float = 0.999) -> int:
    return int(np.count_nonzero(np.abs(audio) >= threshold))


def frame_db(audio: F32, frame: int) -> F32:
    """Per-frame RMS dB for consecutive non-overlapping frames."""
    n = audio.size // frame
    if n == 0:
        return np.zeros(0, dtype=np.float32)
    f = audio[: n * frame].reshape(n, frame).astype(np.float64)
    return as_f32(np.maximum(-100.0, 10.0 * np.log10(np.mean(f * f, axis=1) + EPS)))


def trim_silence(audio: F32, sr: int, threshold_db: float = -45.0, pad_s: float = 0.0) -> F32:
    """Remove leading/trailing frames quieter than `threshold_db` relative to the clip peak."""
    frame = max(1, int(sr * 0.01))
    levels = frame_db(audio, frame)
    if levels.size == 0:
        return audio
    ref = float(np.max(levels))
    loud = np.nonzero(levels > ref + threshold_db)[0]
    if loud.size == 0:
        return audio[:0]
    pad = int(pad_s * sr)
    start = max(0, int(loud[0]) * frame - pad)
    end = min(audio.size, (int(loud[-1]) + 1) * frame + pad)
    return audio[start:end]


def longest_silence_s(audio: F32, sr: int, threshold_db: float = -40.0) -> float:
    """Longest internal run (seconds) of 10 ms frames quieter than threshold relative to peak."""
    frame = max(1, int(sr * 0.01))
    levels = frame_db(audio, frame)
    if levels.size == 0:
        return 0.0
    quiet = levels < float(np.max(levels)) + threshold_db
    loud_idx = np.nonzero(~quiet)[0]
    if loud_idx.size == 0:
        return 0.0
    inner = quiet[loud_idx[0] : loud_idx[-1] + 1]
    best = run = 0
    for q in inner:
        run = run + 1 if q else 0
        best = max(best, run)
    return best * frame / sr


def fade(audio: F32, sr: int, ms: float = 5.0) -> F32:
    """Short linear fade in/out to avoid clicks at cut points."""
    n = min(audio.size // 2, int(sr * ms / 1000))
    if n <= 0:
        return audio
    out = audio.copy()
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    out[:n] *= ramp
    out[-n:] *= ramp[::-1]
    return out
