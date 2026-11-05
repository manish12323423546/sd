"""Emotion → delivery style (docs/08 §8.3).

Kokoro has no explicit emotion control, so delivery is shaped with speed, gain, punctuation and an
optional small pitch lift. Intensity inside a label scales linearly with arousal between the
label's thresholds.
"""

from __future__ import annotations

import hashlib
import re

from engine.config import EmotionThresholds
from engine.providers.base import DeliveryStyle
from engine.record.models import Emotion

# (speed_low, speed_high, gain_db, pitch_semitones) per label; speed interpolates with arousal.
STYLE_TABLE: dict[Emotion, tuple[float, float, float, float]] = {
    Emotion.calm: (0.95, 0.95, -2.0, 0.0),
    Emotion.neutral: (1.00, 1.00, 0.0, 0.0),
    Emotion.excited: (1.04, 1.10, 2.0, 0.5),
    Emotion.peak: (1.10, 1.14, 4.0, 1.0),
}


def _label_span(label: Emotion, th: EmotionThresholds) -> tuple[float, float]:
    return {
        Emotion.calm: (-2.0, th.calm),
        Emotion.neutral: (th.calm, th.excited),
        Emotion.excited: (th.excited, th.peak),
        Emotion.peak: (th.peak, 3.0),
    }[label]


def style_for(
    emotion: Emotion,
    arousal: float | None,
    thresholds: EmotionThresholds,
    base_speed: float = 1.0,
    pitch_shift: bool = False,
) -> DeliveryStyle:
    lo_speed, hi_speed, gain_db, pitch = STYLE_TABLE[emotion]
    lo, hi = _label_span(emotion, thresholds)
    a = lo if arousal is None else min(max(arousal, lo), hi)
    frac = 0.5 if arousal is None or hi <= lo else (a - lo) / (hi - lo)
    speed = base_speed * (lo_speed + (hi_speed - lo_speed) * frac)
    return DeliveryStyle(
        speed=round(speed, 3),
        gain_db=gain_db,
        pitch_semitones=pitch if pitch_shift else 0.0,
        emotion=emotion,
    )


_END_PUNCT = re.compile(r"[.!?…]$")
_WORD = re.compile(r"[A-Za-z']+")


def shape_text(text: str, emotion: Emotion) -> str:
    """Punctuation shaping per emotion so Kokoro's prosody follows the moment."""
    t = text.strip()
    if not t:
        return t
    if emotion is Emotion.calm:
        t = re.sub(r"!+", ".", t)
        return t if _END_PUNCT.search(t) else t + "."
    if emotion is Emotion.neutral:
        return t if _END_PUNCT.search(t) else t + "."
    if emotion is Emotion.excited:
        return t if _END_PUNCT.search(t) else t + "!"
    # peak: short lines get "!" on every word-group; endings become "!"
    t = re.sub(r"[.]+$", "!", t)
    words = _WORD.findall(t)
    if len(words) <= 3:
        t = re.sub(r"[.,]\s*", "! ", t).strip()
        t = re.sub(r"!+", "!", t)
    return t if t.endswith(("!", "?")) else t + "!"


def style_hash(text: str, style: DeliveryStyle) -> str:
    blob = f"{text}|{style.speed:.3f}|{style.gain_db:.2f}|{style.pitch_semitones:.2f}"
    return hashlib.sha1(blob.encode()).hexdigest()[:8]
