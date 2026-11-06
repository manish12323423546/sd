"""Deepgram provider: response parsing, fallback on failure, key endpoint wiring (no network)."""

from __future__ import annotations

from typing import Any

import numpy as np

from engine.providers.base import ASRResult
from engine.providers.paid.asr_deepgram import DeepgramASR, parse_response


def test_parse_response_words_and_confidence() -> None:
    js = {"results": {"channels": [{"alternatives": [{
        "transcript": "What a goal!", "confidence": 0.9,
        "words": [{"word": "what", "punctuated_word": "What", "start": 0.1, "end": 0.3,
                   "confidence": 0.95}, {"word": "goal", "punctuated_word": "goal!",
                   "start": 0.5, "end": 0.9, "confidence": 0.9}]}]}]}}  # fmt: skip
    r = parse_response(js)
    assert r.text == "What a goal!"
    assert [w.word for w in r.words] == ["What", "goal!"]
    assert r.no_speech_prob == 0.0 and -0.2 < r.avg_logprob < 0


def test_parse_empty_is_no_speech() -> None:
    assert parse_response({}).no_speech_prob == 1.0
    empty = {"results": {"channels": [{"alternatives": [{"transcript": "", "words": []}]}]}}
    assert parse_response(empty).text == ""


class _Fallback:
    def transcribe(self, audio: Any, sr: int, prompt: Any = None, span: Any = None) -> ASRResult:
        return ASRResult(text="from fallback", source="groq")


def test_failure_goes_to_fallback(monkeypatch: Any) -> None:
    monkeypatch.setenv("DEEPGRAM_API_KEY", "x")
    asr = DeepgramASR(fallback=_Fallback())

    def boom(*a: Any, **k: Any) -> Any:
        raise RuntimeError("Deepgram HTTP 500")

    monkeypatch.setattr(asr, "_deepgram", boom)
    r = asr.transcribe(np.zeros(1600, dtype=np.float32), 16000)
    assert r.text == "from fallback" and r.source == "groq" and asr.n_fallback == 1


def test_no_key_skips_api(monkeypatch: Any) -> None:
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    asr = DeepgramASR(fallback=_Fallback())
    assert asr.transcribe(np.zeros(160, dtype=np.float32), 16000).source == "groq"


def test_empty_result_retried_on_backup(monkeypatch: Any) -> None:
    monkeypatch.setenv("DEEPGRAM_API_KEY", "x")
    asr = DeepgramASR(fallback=_Fallback())
    monkeypatch.setattr(asr, "_deepgram", lambda *a, **k: ASRResult(text="", no_speech_prob=1.0))
    r = asr.transcribe(np.zeros(16000, dtype=np.float32), 16000)  # 1 s phrase, Deepgram empty
    assert r.text == "from fallback" and r.source == "groq*" and asr.n_empty_retry == 1
