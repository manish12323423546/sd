"""Prosody-rule emotion provider (docs/04 §5). Fast (< 20 ms), explainable, no model.

arousal = w_l*z(loudness) + w_p*z(pitch) + w_r*z(rate) + w_t*text_cue_score, clipped to [-2, 3]

- loudness is compared with a running median of the last 60 s of lines (relative, not absolute),
- pitch with that speaker's running median (in semitones),
- rate (words/s from ASR word times) with the running median,
- text cues: keywords from config/emotion_keywords.yaml + exclamation marks.
Smoothed with the previous line of the same speaker (0.7/0.3) unless the jump is upward.
"""

from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from engine.audio import F32, rms_db
from engine.config import CONFIG_DIR, EmotionConfig
from engine.providers.base import EmotionContext, EmotionResult
from engine.record.models import Emotion

# Robust-scale floors so a quiet history cannot blow up z-scores.
MIN_SCALE = {"loudness": 2.5, "pitch": 1.2, "rate": 0.5}
WINDOW_S = 60.0
MIN_HISTORY = 3


def label_for(arousal: float, cfg: EmotionConfig) -> Emotion:
    th = cfg.thresholds
    if arousal < th.calm:
        return Emotion.calm
    if arousal < th.excited:
        return Emotion.neutral
    if arousal < th.peak:
        return Emotion.excited
    return Emotion.peak


def load_keywords(path: Path | None = None) -> tuple[dict[str, float], float, float]:
    data: dict[str, Any] = yaml.safe_load(
        (path or CONFIG_DIR / "emotion_keywords.yaml").read_text()
    )
    kws = {str(k).lower(): float(v) for k, v in (data.get("keywords") or {}).items()}
    return kws, float(data.get("exclamation_weight", 0.5)), float(data.get("max_score", 2.0))


def text_cue_score(text: str, keywords: dict[str, float], excl_w: float, cap: float) -> float:
    low = " " + re.sub(r"[^a-z' ]+", " ", text.lower()) + " "
    score = sum(w * low.count(f" {k} ") for k, w in keywords.items())
    score += excl_w * min(3, text.count("!"))
    return float(min(cap, score))


def _robust(values: list[float], floor: float) -> tuple[float, float]:
    arr = np.asarray(values, dtype=np.float64)
    med = float(np.median(arr))
    mad = float(np.median(np.abs(arr - med))) * 1.4826
    return med, max(mad, floor)


@dataclass
class _History:
    loud: deque[tuple[float, float]] = field(default_factory=deque)  # (t_end, dB)
    rate: deque[tuple[float, float]] = field(default_factory=deque)
    pitch: dict[str, deque[float]] = field(default_factory=dict)  # speaker -> semitone values
    last_arousal: dict[str, float] = field(default_factory=dict)


class ProsodyEmotion:
    def __init__(self, cfg: EmotionConfig | None = None, keywords_path: Path | None = None):
        self.cfg = cfg or EmotionConfig()
        self.keywords, self.excl_w, self.cap = load_keywords(keywords_path)
        self.h = _History()

    # ---- audio part (thread pool, parallel to ASR) ----
    def audio_features(self, audio: F32, sr: int) -> dict[str, float]:
        import librosa

        feats = {"loudness_db": rms_db(audio), "duration_s": audio.size / sr}
        if audio.size >= int(0.25 * sr):
            f0 = librosa.yin(audio, fmin=70, fmax=400, sr=sr, frame_length=1024)
            # keep frames from the louder part of the signal (YIN returns a value everywhere)
            frame_db = librosa.amplitude_to_db(
                librosa.feature.rms(y=audio, frame_length=1024, hop_length=256)[0], ref=np.max
            )
            n = min(f0.size, frame_db.size)
            voiced = f0[:n][(frame_db[:n] > -25) & (f0[:n] > 70) & (f0[:n] < 400)]
            if voiced.size >= 5:
                feats["pitch_hz_median"] = float(np.median(voiced))
                feats["pitch_range"] = float(np.percentile(voiced, 90) - np.percentile(voiced, 10))
        return feats

    # ---- label part (event loop, needs text + history) ----
    def analyze(self, ctx: EmotionContext) -> EmotionResult:
        f = dict(ctx.features)
        spk = ctx.speaker_id or "?"
        t = ctx.t_end
        self._expire(t)

        loud = f.get("loudness_db", -100.0)
        duration = max(0.2, ctx.t_end - ctx.t_start)
        if ctx.words:
            span = max(0.2, ctx.words[-1].end - ctx.words[0].start)
            rate = len(ctx.words) / span
        else:
            rate = len(ctx.text.split()) / duration
        pitch_hz = f.get("pitch_hz_median")
        pitch_st = 12.0 * float(np.log2(pitch_hz / 100.0)) if pitch_hz else None

        z_loud = self._z(loud, [v for _, v in self.h.loud], "loudness")
        z_rate = self._z(rate, [v for _, v in self.h.rate], "rate")
        spk_pitch = self.h.pitch.setdefault(spk, deque(maxlen=40))
        z_pitch = self._z(pitch_st, list(spk_pitch), "pitch") if pitch_st is not None else 0.0
        cue = text_cue_score(ctx.text, self.keywords, self.excl_w, self.cap)

        w = self.cfg.weights
        raw = (
            w.get("loudness", 0.45) * z_loud
            + w.get("pitch", 0.30) * z_pitch
            + w.get("rate", 0.15) * z_rate
            + w.get("text", 0.10) * cue
        )
        raw = float(np.clip(raw, -2.0, 3.0))
        prev = self.h.last_arousal.get(spk)
        arousal = raw if prev is None or raw >= prev else 0.7 * raw + 0.3 * prev
        self.h.last_arousal[spk] = arousal

        self.h.loud.append((t, loud))
        self.h.rate.append((t, rate))
        if pitch_st is not None:
            spk_pitch.append(pitch_st)

        f.update(
            rate_wps=rate,
            text_cue=cue,
            z_loudness=z_loud,
            z_pitch=z_pitch,
            z_rate=z_rate,
            arousal_raw=raw,
        )
        return EmotionResult(label=label_for(arousal, self.cfg), arousal=arousal, features=f)

    def _z(self, value: float | None, history: list[float], kind: str) -> float:
        if value is None or len(history) < MIN_HISTORY:
            return 0.0
        med, scale = _robust(history, MIN_SCALE[kind])
        return float(np.clip((value - med) / scale, -3.0, 4.0))

    def _expire(self, now: float) -> None:
        for dq in (self.h.loud, self.h.rate):
            while dq and now - dq[0][0] > WINDOW_S and len(dq) > MIN_HISTORY:
                dq.popleft()


def create(**kwargs: Any) -> ProsodyEmotion:
    return ProsodyEmotion(**kwargs)
