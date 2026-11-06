"""Professional cloning: utterance picking, mood sorting, reference choice, API guard rails."""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pytest

import engine.voices_custom as vc
from engine.voices_pro import MAX_REF_S, Utterance, pick, sort_moods


def _u(start: float, dur: float, sim: float, snr: float, mood: str = "neutral") -> Utterance:
    u = Utterance(start, start + dur, snr_db=snr, sim=sim)
    u.mood = mood
    return u


def test_pick_prefers_quality_and_respects_length() -> None:
    utts = [
        _u(0, 5, 0.9, 25),
        _u(10, 5, 0.3, 25),  # other speaker-ish: low similarity
        _u(20, 6, 0.85, 20),
        _u(30, 11, 0.8, 22),
        _u(50, 4, 0.9, 25, mood="excited"),
    ]
    chosen = pick(utts, "neutral")
    assert [u.start for u in chosen] == [0, 20]  # time order, best first-picked
    assert sum(u.dur for u in chosen) <= MAX_REF_S
    assert pick(utts, "calm") == []


def test_sort_moods_uses_loudness_and_pitch() -> None:
    sr = 16000
    t = np.arange(sr * 3) / sr
    audio_parts = []
    utts = []
    for i, (amp, f0) in enumerate([(0.02, 110), (0.05, 130), (0.05, 130), (0.05, 135),
                                   (0.05, 125), (0.3, 220)]):  # fmt: skip
        audio_parts.append((amp * np.sin(2 * np.pi * f0 * t)).astype(np.float32))
        utts.append(Utterance(i * 3.0, i * 3.0 + 3.0))
    audio = np.concatenate(audio_parts)
    sort_moods(utts, audio)
    assert utts[0].mood == "calm" and utts[-1].mood == "excited"
    assert utts[-1].arousal > utts[0].arousal


def test_references_use_neutral_unless_mood_refs(tmp_path: Path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(vc, "CUSTOM_DIR", tmp_path)
    d = tmp_path / "pro"
    d.mkdir()
    for f in ("neutral_0.mp3", "excited_0.mp3"):
        (d / f).write_bytes(f.encode())
    meta = {"voice_id": "cu_pro", "name": "Pro", "tier": "pro", "transcript": "n", "seconds": 9,
            "refs": {"neutral": [{"file": "neutral_0.mp3", "text": "n"}],
                     "excited": [{"file": "excited_0.mp3", "text": "e"}], "calm": []}}  # fmt: skip
    (d / "meta.json").write_text(json.dumps(meta))
    assert vc.references("cu_pro", "peak") == [(b"neutral_0.mp3", "n")]
    meta["mood_refs"] = True
    (d / "meta.json").write_text(json.dumps(meta))
    assert vc.references("cu_pro", "peak") == [(b"excited_0.mp3", "e")]
    assert vc.references("cu_pro", "calm") == [(b"neutral_0.mp3", "n")]  # empty mood → neutral
    assert "Pro clone" in vc.catalog_entries()[0].description
    assert vc.fish_model_id("cu_pro") is None


def test_pro_endpoint_guard_rails() -> None:
    os.environ["LCV_SKIP_MODELS"] = "1"
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from app import main

    with TestClient(main.app) as c:
        wav = ("a.wav", b"RIFF0000", "audio/wav")
        r = c.post("/api/voices/pro", data={"name": "X"}, files={"file": wav})
        assert r.status_code == 400 and "permission" in r.json()["detail"]
        r = c.post("/api/voices/pro", data={"name": "X", "consent": "true"}, files={"file": wav})
        assert r.status_code == 400 and "loading" in r.json()["detail"]
        assert c.get("/api/voices/jobs/nope").status_code == 404
        assert c.post("/api/voices/bm_george/say", json={"text": "hi"}).status_code == 503


def test_keep_own_words_drops_context_and_keeps_punctuation() -> None:
    from engine.orchestrator import keep_own_words
    from engine.providers.base import ASRResult, Word

    words = [Word(word=w, start=s, end=e, prob=1.0) for w, s, e in
             [("ball.", 0.1, 0.4), ("Save!", 1.05, 1.3), ("What", 1.5, 1.6), ("a", 1.6, 1.7),
              ("save!", 1.7, 2.0)]]  # fmt: skip
    res = ASRResult(text="ball. Save! What a save!", words=words, avg_logprob=0.0,
                    no_speech_prob=0.0)  # fmt: skip
    out = keep_own_words(res, line_start=1.0)
    assert out.text == "Save! What a save!" and len(out.words) == 4
    # mismatched tokens → words joined, end punctuation carried over
    res2 = res.model_copy(update={"text": "ball, save! what a save!"})
    res2 = res2.model_copy(update={"words": [w.model_copy(update={"word": w.word.strip(".!")})
                                             for w in words]})  # fmt: skip
    assert keep_own_words(res2, 1.0).text.endswith("!")
    assert keep_own_words(res, line_start=0.0) is res  # nothing to drop
