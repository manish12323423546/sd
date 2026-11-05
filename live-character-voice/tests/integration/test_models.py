"""Integration tests with the real models (docs/09 §9.3). Run with `make test-slow`.

Needs the downloaded models (`make download-models`) and the synthetic clip (`make synth`).
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import time
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
CLIP = ROOT / "data/clips/synthetic_match.mp4"
pytestmark = pytest.mark.slow


@pytest.fixture(scope="module")
def sample() -> tuple[np.ndarray, str]:
    if not CLIP.exists():
        pytest.skip("run `make synth` first")
    from engine.ingest.decode import decode_audio

    truth = json.loads(CLIP.with_suffix(".truth.json").read_text())["lines"]
    line = next(t for t in truth if 2.6 <= t["t_end"] - t["t_start"] <= 3.6)
    audio = decode_audio(CLIP)
    return audio[int(line["t_start"] * 16000) : int(line["t_end"] * 16000)], line["text"]


def test_asr_provider(sample: tuple[np.ndarray, str]) -> None:
    from engine.providers.free.asr_faster_whisper import FasterWhisperASR
    from engine.tts.text_normalize import normalize_for_wer

    audio, text = sample
    asr = FasterWhisperASR("small.en")
    t = time.monotonic()
    res = asr.transcribe(audio, 16000)
    print(f"ASR {time.monotonic() - t:.2f} s: {res.text!r}")
    ref, hyp = set(normalize_for_wer(text).split()), set(normalize_for_wer(res.text).split())
    assert len(ref & hyp) / len(ref) >= 0.6
    assert res.words and all(w.end >= w.start for w in res.words)


def test_speaker_provider(sample: tuple[np.ndarray, str]) -> None:
    from engine.providers.free.speaker_ecapa import EcapaSpeaker

    audio, _ = sample
    emb = EcapaSpeaker().embed(audio, 16000)
    assert emb.shape == (192,) and abs(float(np.linalg.norm(emb)) - 1.0) < 1e-3


def test_emotion_provider(sample: tuple[np.ndarray, str]) -> None:
    from engine.providers.free.emotion_prosody import ProsodyEmotion

    feats = ProsodyEmotion().audio_features(sample[0], 16000)
    assert -60 < feats["loudness_db"] < 0 and 70 < feats["pitch_hz_p75"] < 400


def test_tts_provider_and_voices() -> None:
    from engine.config import load_voice_catalog
    from engine.providers.base import DeliveryStyle
    from engine.providers.free.tts_kokoro import KokoroTTS

    tts = KokoroTTS()
    ids = {v.voice_id for v in tts.voices()}
    assert {v.voice_id for v in load_voice_catalog().voices} <= ids
    res = tts.synthesize("And he's through on goal!", "bm_george", DeliveryStyle(gain_db=4))
    assert res.sr == 24000 and 0.8 < res.duration_s < 4.0
    assert float(np.max(np.abs(res.audio))) <= 10 ** (-1 / 20) + 1e-4


def test_end_to_end_30s_live(tmp_path: Path) -> None:
    """30 s cut at speed 1.0: report produced, ≥ 80 % of lines have text, speaker acc ≥ 80 %."""
    if not CLIP.exists():
        pytest.skip("run `make synth` first")
    cut = tmp_path / "cut30.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(CLIP), "-t", "30", "-c",
                    "copy", str(cut)], check=True)  # fmt: skip
    truth = json.loads(CLIP.with_suffix(".truth.json").read_text())
    truth["lines"] = [t for t in truth["lines"] if t["t_end"] <= 30]
    (tmp_path / "cut30.truth.json").write_text(json.dumps(truth))
    from engine.config import load_engine_config
    from engine.metrics.compute import compute_all
    from engine.metrics.report import write_report
    from engine.orchestrator import Models, Session

    cfg = load_engine_config()
    models = Models.load(cfg, {"asr", "speaker", "tts"})
    out = tmp_path / "run"
    session = Session(cfg, cut, models, out)
    t0 = time.monotonic()
    rec = asyncio.run(session.run())
    assert time.monotonic() - t0 >= 29.0  # live speed: no faster than the clip
    m = compute_all(rec, truth, 30.0)
    write_report(out, m, rec)
    assert (out / "report.md").exists()
    with_text = sum(1 for ln in rec.lines if ln.text)
    assert with_text / max(1, len(rec.lines)) >= 0.8
    assert m["speaker"]["speaker_accuracy"] >= 0.8
    assert m["schedule"]["lines_played"] >= 1
