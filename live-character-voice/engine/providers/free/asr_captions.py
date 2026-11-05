"""Captions "ASR" provider: reads an .srt / .vtt sidecar instead of recognising speech (docs/04 §3).

Cues are aligned to lines by time overlap. A cue that overlaps two lines is split by word-count
proportion (words are assumed evenly spread across the cue). Speaker ID and emotion still come
from audio. Live TV captions usually lag 3–5 s; the report notes captions mode.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.audio import F32
from engine.providers.base import ASRResult, Word

_TAGS = re.compile(r"<[^>]+>")


@dataclass(frozen=True)
class Cue:
    start: float
    end: float
    text: str


def _ts(s: str) -> float:
    s = s.strip().replace(",", ".")
    parts = [float(p) for p in s.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0.0)
    h, m, sec = parts
    return h * 3600 + m * 60 + sec


def parse_captions(text: str) -> list[Cue]:
    """Minimal SRT/WebVTT parser (handles both; ignores styling tags and cue settings)."""
    cues: list[Cue] = []
    blocks = re.split(r"\n\s*\n", text.replace("\r", "").strip())
    for block in blocks:
        lines = [ln for ln in block.split("\n") if ln.strip()]
        for i, ln in enumerate(lines):
            if "-->" in ln:
                a, b = ln.split("-->")
                body = " ".join(lines[i + 1 :])
                body = _TAGS.sub("", body).strip()
                if body:
                    cues.append(Cue(_ts(a), _ts(b.split()[0]), body))
                break
    return sorted(cues, key=lambda c: c.start)


def words_in_span(cues: list[Cue], t_a: float, t_b: float) -> list[Word]:
    out: list[Word] = []
    for c in cues:
        if c.end <= t_a or c.start >= t_b:
            continue
        toks = c.text.split()
        step = (c.end - c.start) / max(1, len(toks))
        for i, tok in enumerate(toks):
            mid = c.start + (i + 0.5) * step
            if t_a <= mid < t_b:
                out.append(Word(word=tok, start=mid - step / 2, end=mid + step / 2, prob=1.0))
    return out


class CaptionsASR:
    def __init__(self, captions_path: str | Path) -> None:
        self.cues = parse_captions(Path(captions_path).read_text(encoding="utf-8"))

    def transcribe(
        self,
        audio: F32,
        sr: int,
        prompt: str | None = None,
        span: tuple[float, float] | None = None,
    ) -> ASRResult:
        if span is None:
            raise ValueError("captions mode needs the line span")
        words = words_in_span(self.cues, *span)
        # word times relative to the line start, like the audio ASR provider
        rel = [
            Word(word=w.word, start=w.start - span[0], end=w.end - span[0], prob=1.0) for w in words
        ]
        return ASRResult(
            text=" ".join(w.word for w in words),
            words=rel,
            avg_logprob=0.0,
            no_speech_prob=0.0 if words else 1.0,
        )


def create(**kwargs: Any) -> CaptionsASR:
    return CaptionsASR(**kwargs)
