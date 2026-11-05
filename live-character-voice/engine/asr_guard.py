"""Whisper hallucination guard (M10).

On very short or noisy lines Whisper can (a) repeat its `initial_prompt` (previous lines) or
(b) loop one word ("Moreau, moreau, moreau, …"). Found in the 20-minute Pilot run: a 0.16 s shout
became 60+ words and its TTS took 32 s. The guard keeps only words timed inside the line's audio,
caps the word count at a physically possible speaking rate, and collapses ≥ 3 repeats to 2.
"""

from __future__ import annotations

import re

from engine.providers.base import ASRResult, Word

MAX_WORDS_PER_S = 5.0  # fast commentary peaks around 4 words/s
EXTRA_WORDS = 3
_TOKEN = re.compile(r"[^a-z0-9']+")


def _norm(w: str) -> str:
    return _TOKEN.sub("", w.lower())


def collapse_repeats(words: list[Word], max_repeat: int = 2) -> list[Word]:
    """Collapse runs of the same word or same 2–4-word phrase beyond `max_repeat`."""
    out = list(words)
    for n in (1, 2, 3, 4):
        result: list[Word] = []
        i = 0
        while i < len(out):
            phrase = [_norm(w.word) for w in out[i : i + n]]
            reps = 1
            while (
                out[i + reps * n : i + (reps + 1) * n]
                and [_norm(w.word) for w in out[i + reps * n : i + (reps + 1) * n]] == phrase
            ):
                reps += 1
            if reps > 1 and len(phrase) == n:
                result.extend(out[i : i + min(reps, max_repeat) * n])
                i += reps * n
            else:
                result.append(out[i])
                i += 1
        out = result
    return out


def guard(res: ASRResult, audio_s: float) -> tuple[ASRResult, list[str]]:
    """Returns the cleaned result and the list of actions taken (empty if untouched)."""
    actions: list[str] = []
    words = res.words
    if words:
        inside = [w for w in words if w.start < audio_s + 0.05 and w.end > -0.05]
        if len(inside) < len(words):
            actions.append(f"dropped {len(words) - len(inside)} words outside the audio")
            words = inside
        collapsed = collapse_repeats(words)
        if len(collapsed) < len(words):
            actions.append(f"collapsed {len(words) - len(collapsed)} repeated words")
            words = collapsed
        limit = int(MAX_WORDS_PER_S * audio_s) + EXTRA_WORDS
        if len(words) > limit:
            actions.append(f"capped {len(words)} words to {limit}")
            words = words[:limit]
        if actions:
            text = " ".join(w.word for w in words).strip()
            return res.model_copy(update={"text": text, "words": words}), actions
    else:
        toks = res.text.split()
        limit = int(MAX_WORDS_PER_S * audio_s) + EXTRA_WORDS
        if len(toks) > limit:
            actions.append(f"capped {len(toks)} words to {limit}")
            return res.model_copy(update={"text": " ".join(toks[:limit])}), actions
    return res, actions
