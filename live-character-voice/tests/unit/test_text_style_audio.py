"""Text normalisation, delivery style, captions parsing and audio helpers (no models)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from engine.audio import count_clipped, peak_db, resample, rms_db, soft_limit, trim_silence
from engine.config import EmotionThresholds
from engine.providers.free.asr_captions import CaptionsASR, parse_captions, words_in_span
from engine.record.models import Emotion
from engine.tts.style import shape_text, style_for, style_hash
from engine.tts.text_normalize import (
    normalize_for_tts,
    normalize_for_wer,
    number_to_words,
    ordinal_to_words,
)

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize(
    ("n", "words"),
    [
        (0, "zero"),
        (7, "seven"),
        (21, "twenty-one"),
        (90, "ninety"),
        (105, "one hundred and five"),
        (2026, "two thousand and twenty-six"),
    ],
)
def test_number_to_words(n: int, words: str) -> None:
    assert number_to_words(n) == words


def test_ordinals() -> None:
    assert ordinal_to_words(1) == "first"
    assert ordinal_to_words(3) == "third"
    assert ordinal_to_words(20) == "twentieth"
    assert ordinal_to_words(42) == "forty-second"


def test_scores_numbers_and_fillers() -> None:
    assert normalize_for_tts("Uh, it's 2-1 now") == "it's two one now"
    assert normalize_for_tts("um the 3rd goal in 90' ") == "the third goal in ninety minutes"
    assert (
        normalize_for_tts("Okafor scores, 1-0!", glossary=["Okafor"]) == "Okafor scores, one zero!"
    )


def test_glossary_names_protected() -> None:
    # a name containing a filler-looking token must survive
    assert normalize_for_tts("Er Um Delgado", glossary=["Um Delgado"]) == "Um Delgado"


def test_wer_normalisation() -> None:
    assert normalize_for_wer("Goal! It's 2-1, Okafor.") == "goal its two one okafor"


def test_style_scales_with_arousal() -> None:
    th = EmotionThresholds()
    low = style_for(Emotion.excited, 0.8, th)
    high = style_for(Emotion.excited, 1.8, th)
    assert low.speed == pytest.approx(1.04)
    assert high.speed == pytest.approx(1.10)
    assert style_for(Emotion.calm, -1.0, th).gain_db == -2.0
    assert style_for(Emotion.peak, 2.5, th).gain_db == 4.0
    assert style_for(Emotion.peak, 2.5, th).pitch_semitones == 0.0  # pitch shift off by default
    assert style_for(Emotion.peak, 2.5, th, pitch_shift=True).pitch_semitones == 1.0
    assert style_for(Emotion.neutral, 0.0, th, base_speed=1.1).speed == pytest.approx(1.1)


def test_shape_text() -> None:
    assert shape_text("goal goal", Emotion.peak) == "goal goal!"
    assert shape_text("Goal. Goal.", Emotion.peak) == "Goal! Goal!"
    assert shape_text("a quiet spell", Emotion.calm) == "a quiet spell."
    assert shape_text("What a run!", Emotion.calm) == "What a run."
    assert shape_text("he is through", Emotion.excited) == "he is through!"
    assert shape_text("Is it in?", Emotion.peak) == "Is it in?"
    s = style_for(Emotion.peak, 2.0, EmotionThresholds())
    assert style_hash("x", s) != style_hash("y", s)


VTT = """WEBVTT

00:00:01.000 --> 00:00:03.000
Hello <i>there</i> friends

00:00:03.000 --> 00:00:05.000 align:start
Goal goal goal goal
"""


def test_captions_parse_and_split(tmp_path: Path) -> None:
    cues = parse_captions(VTT)
    assert [c.text for c in cues] == ["Hello there friends", "Goal goal goal goal"]
    # words are spread evenly over a cue; a word belongs to the line containing its midpoint
    words = [w.word for w in words_in_span(cues, 2.0, 4.0)]
    assert words == ["there", "friends", "Goal", "goal"]
    srt = "1\n00:00:01,000 --> 00:00:02,500\nHi\n"
    assert parse_captions(srt)[0].end == pytest.approx(2.5)
    path = tmp_path / "c.vtt"
    path.write_text(VTT)
    res = CaptionsASR(path).transcribe(np.zeros(10, np.float32), 16000, span=(0.9, 3.0))
    assert res.text == "Hello there friends"
    assert res.words[0].start == pytest.approx(0.1, abs=1e-6)  # cue starts 1.0 s, line 0.9 s


def test_audio_helpers() -> None:
    sr = 16000
    t = np.arange(sr) / sr
    tone = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    assert rms_db(tone) == pytest.approx(-9.03, abs=0.05)
    loud = tone * 4
    limited = soft_limit(loud, -1.0)
    assert peak_db(limited) <= -1.0 + 1e-3 and count_clipped(limited) == 0
    padded = np.concatenate([np.zeros(sr // 2, np.float32), tone, np.zeros(sr // 2, np.float32)])
    assert trim_silence(padded, sr).size == pytest.approx(sr, abs=sr * 0.02)
    up = resample(tone, 16000, 48000)
    assert up.size == 48000 and up.dtype == np.float32


def test_synthetic_truth_if_present() -> None:
    """M1 accept: truth JSON valid (only when the clip has been generated)."""
    path = ROOT / "data/clips/synthetic_match.truth.json"
    if not path.exists():
        pytest.skip("run `make synth` first")
    data = json.loads(path.read_text())
    lines = data["lines"]
    assert len(lines) >= 40
    assert all(ln["t_end"] > ln["t_start"] >= 0 for ln in lines)
    assert all(ln["t_start"] >= lines[i]["t_start"] for i, ln in enumerate(lines[1:]))
    assert {ln["emotion"] for ln in lines} == {"calm", "neutral", "excited", "peak"}
    assert lines[-1]["t_end"] < data["duration"]


def test_asr_guard_drops_prompt_regurgitation_and_loops() -> None:
    from engine.asr_guard import collapse_repeats, guard
    from engine.providers.base import ASRResult, Word

    def ws(texts: list[str], step: float = 0.3) -> list[Word]:
        return [
            Word(word=t, start=i * step, end=i * step + 0.25, prob=0.9) for i, t in enumerate(texts)
        ]

    loop = ws(["Moreau,"] * 12 + ["shoots."], step=0.05)
    assert [w.word for w in collapse_repeats(loop)] == ["Moreau,", "Moreau,", "shoots."]
    phrase = ws(
        [
            "wins",
            "it",
            "in",
            "midfield",
            "wins",
            "it",
            "in",
            "midfield",
            "wins",
            "it",
            "in",
            "midfield",
            "now",
        ]
    )
    assert len(collapse_repeats(phrase)) == 9
    # 0.3 s of audio cannot hold 20 words: cap to 5 w/s * 0.3 + 3 = 4
    res = ASRResult(text="x", words=ws([f"w{i}" for i in range(20)], step=0.01))
    out, actions = guard(res, 0.3)
    assert len(out.words) == 4 and out.text == "w0 w1 w2 w3" and actions
    # words timed far outside the audio are dropped
    late = ASRResult(
        text="a b",
        words=[
            Word(word="a", start=0.1, end=0.3, prob=1),
            Word(word="b", start=5.0, end=5.2, prob=1),
        ],
    )
    assert guard(late, 1.0)[0].text == "a"
    ok = ASRResult(text="Goal!", words=ws(["Goal!"]))
    assert guard(ok, 1.0) == (ok, [])
