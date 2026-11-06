"""Mixer/ducking, metrics, TTS cache, and a full Session run with fake providers (no models)."""

from __future__ import annotations

import asyncio
import itertools
from pathlib import Path

import numpy as np
import pytest

from engine.audio import rms_db
from engine.config import EngineConfig
from engine.metrics.compute import compute_all, speaker_metrics, wer_metrics
from engine.orchestrator import Models, Session
from engine.providers.base import (
    ASRResult,
    DeliveryStyle,
    EmotionContext,
    EmotionResult,
    TTSResult,
    VoiceInfo,
    Word,
)
from engine.record.models import Emotion, Line, SessionRecord, StageTimes
from engine.render.mixer import Placement, duck_envelope, mix
from engine.tts.worker import TtsCache, synthesize_line

SR = 16000


# ---------------------------------------------------------------- mixer
def test_duck_envelope_ramps_and_release() -> None:
    sr = 1000
    env = duck_envelope(3000, sr, [(1.0, 1.5)], duck_gain=0.25, ramp_ms=80)
    assert env[900] == pytest.approx(1.0)
    assert env[1040] == pytest.approx(1 - 0.75 * 41 / 80, abs=0.02)  # mid-ramp
    assert env[1100] == pytest.approx(0.25)
    assert env[1640] == pytest.approx(0.25)  # held 150 ms after the line ends
    assert env[1800] == pytest.approx(1.0)


def test_mix_places_voices_ducks_original_and_never_clips() -> None:
    sr = 8000
    original = (0.5 * np.sin(np.arange(sr * 4) / 3)).astype(np.float32)
    voice = np.full(sr, 0.9, np.float32)
    cfg = EngineConfig()
    out, track, stats = mix(original, sr, [Placement("L1", 1.0, voice)], cfg)
    assert track[int(1.5 * sr)] == pytest.approx(0.9)
    assert track[int(0.5 * sr)] == 0.0
    assert stats["duck_depth_db"] == pytest.approx(12.04, abs=0.1)
    assert np.max(np.abs(out)) <= 10 ** (-1 / 20) + 1e-6
    # synced mode: original delayed by an offset
    out2, _, _ = mix(original, sr, [], cfg, offset=0.5)
    assert out2.size == original.size + sr // 2
    assert rms_db(out2[: sr // 2]) < -90


# ---------------------------------------------------------------- metrics
def _rec(lines: list[Line]) -> SessionRecord:
    return SessionRecord(
        session_id="t",
        clip_path="c",
        mode="poc",
        speed=1.0,
        source="asr",
        started_at_iso="x",
        config_snapshot={},
        lines=lines,
    )


def test_speaker_accuracy_uses_best_label_mapping() -> None:
    truth = [
        {"speaker": "A", "t_start": 0.0, "t_end": 2.0, "text": "a", "emotion": "calm"},
        {"speaker": "B", "t_start": 2.5, "t_end": 4.5, "text": "b", "emotion": "calm"},
    ]
    # engine calls A "S2" and B "S1" (labels are arbitrary) and gets the second line half wrong
    lines = [
        Line(line_id="L1", t_start=0.0, t_end=2.0, close_reason="pause", speaker_id="S2", text="a"),
        Line(line_id="L2", t_start=2.5, t_end=3.5, close_reason="pause", speaker_id="S1", text="b"),
        Line(line_id="L3", t_start=3.5, t_end=4.5, close_reason="pause", speaker_id="S2", text="b"),
    ]
    m = speaker_metrics(_rec(lines), truth, 5.0)
    assert m["mapping"] == {"S2": "A", "S1": "B"}
    assert m["speaker_accuracy"] == pytest.approx(3.0 / 4.0, abs=0.01)


def test_wer_normalises_numbers_and_punctuation() -> None:
    truth = [{"text": "It's 2-1, Goal!"}]
    lines = [Line(line_id="L1", t_start=0, t_end=1, close_reason="pause", text="its two one goal")]
    assert wer_metrics(_rec(lines), truth)["wer"] == 0.0


def test_delay_and_drift_metrics() -> None:
    lines = []
    for i in range(20):
        t_end = 5.0 * (i + 1)
        lines.append(
            Line(
                line_id=f"L{i}",
                t_start=t_end - 2,
                t_end=t_end,
                close_reason="pause",
                text="x",
                times=StageTimes(created=t_end + 0.4, tts_ready=t_end + 2.0, play_at=t_end + 2.1),
            )
        )
    m = compute_all(_rec(lines), None, 110.0)
    assert m["delay"]["delay_ready"]["p50"] == pytest.approx(2.0)
    assert m["delay"]["delay_play"]["p95"] == pytest.approx(2.1)
    assert abs(m["delay"]["drift_slope_s_per_s"]) < 1e-6 and m["delay"]["drift_ok"]
    assert m["delay"]["stages"]["close_wait"]["p50"] == pytest.approx(0.4)


# ---------------------------------------------------------------- fakes
class FakeTTS:
    calls = 0

    def voices(self) -> list[VoiceInfo]:
        return [VoiceInfo(voice_id="am_adam", lang_code="a")]

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult:
        FakeTTS.calls += 1
        n = int(24000 * 0.05 * max(1, len(text.split())))
        audio = np.full(n, 0.1, np.float32)
        return TTSResult(audio=audio, sr=24000, duration_s=n / 24000)


def test_tts_cache_reuses_audio(tmp_path: Path) -> None:
    cache = TtsCache()
    tts = FakeTTS()
    before = FakeTTS.calls
    a = synthesize_line(tts, cache, tmp_path, "L1", "Goal 2-1", "am_adam", DeliveryStyle(), [])
    b = synthesize_line(tts, cache, tmp_path, "L1", "Goal 2-1", "am_adam", DeliveryStyle(), [])
    assert FakeTTS.calls == before + 1 and b.cached and a.path == b.path
    assert a.text == "Goal two one." and a.path.exists()


class FakeASR:
    def transcribe(self, audio, sr, prompt=None, span=None) -> ASRResult:  # type: ignore[no-untyped-def]
        n = max(1, int(audio.size / sr * 2.5))
        words = [Word(word=f"w{i}", start=i * 0.4, end=i * 0.4 + 0.3, prob=0.9) for i in range(n)]
        return ASRResult(
            text=" ".join(w.word for w in words) + ".",
            words=words,
            avg_logprob=-0.2,
            no_speech_prob=0.01,
        )


class FakeSpeaker:
    """Embedding from the tone frequency: speaker A = 200 Hz bursts, B = 600 Hz bursts."""

    def embed(self, audio, sr):  # type: ignore[no-untyped-def]
        spec = np.abs(np.fft.rfft(audio[: sr // 2] if audio.size > sr // 2 else audio, n=sr))
        f = int(np.argmax(spec))
        v = np.zeros(192, np.float32)
        v[0 if f < 400 else 1] = 1.0
        return v


class FakeEmotion:
    def audio_features(self, audio, sr):  # type: ignore[no-untyped-def]
        return {"loudness_db": rms_db(audio)}

    def analyze(self, ctx: EmotionContext) -> EmotionResult:
        loud = ctx.features["loudness_db"]
        label = Emotion.peak if loud > -15 else Emotion.neutral
        return EmotionResult(
            label=label, arousal=2.0 if label is Emotion.peak else 0.0, features=dict(ctx.features)
        )


class EnergyVAD:
    def process(self, samples):  # type: ignore[no-untyped-def]
        n = samples.size // 512
        frames = samples[: n * 512].reshape(n, 512)
        probs = (np.sqrt((frames**2).mean(axis=1)) > 0.01).astype(np.float32)
        return probs, frames


def _clip() -> np.ndarray:
    """A: 2 s @200 Hz, gap, B: 2 s @600 Hz, gap, A loud shout 0.8 s, gap, B 2 s."""
    t = lambda s: np.arange(int(s * SR)) / SR  # noqa: E731
    tone = lambda f, s, a=0.1: (a * np.sin(2 * np.pi * f * t(s))).astype(np.float32)  # noqa: E731
    gap = lambda s: np.zeros(int(s * SR), np.float32)  # noqa: E731
    return np.concatenate(
        [
            gap(0.5),
            tone(200, 2),
            gap(0.8),
            tone(600, 2),
            gap(0.8),
            tone(200, 0.8, 0.5),
            gap(0.8),
            tone(600, 2),
            gap(1.0),
        ]
    )


def test_full_session_with_fake_providers(tmp_path: Path) -> None:
    cfg = EngineConfig()
    cfg.speed = 0.0  # as fast as possible (unit test only)
    cfg.speaker.max_speakers = 2
    models = Models(asr=FakeASR(), speaker=FakeSpeaker(), tts=FakeTTS())  # type: ignore[arg-type]
    s = Session(
        cfg,
        "fake.mp4",
        models,
        tmp_path,
        emotion=FakeEmotion(),  # type: ignore[arg-type]
        vad_factory=EnergyVAD,
    )
    s.audio_override = _clip()
    rec = asyncio.run(s.run())
    assert [ln.speaker_id for ln in rec.lines] == ["S1", "S2", "S1", "S2"]
    assert rec.lines[2].emotion is Emotion.peak
    assert all(ln.text and ln.tts_path and ln.times.play_at is not None for ln in rec.lines)
    assert rec.speakers["S1"].voice_id == cfg.tts.voice_map["S1"]
    assert rec.lines[0].voice_id == "bm_george" and rec.lines[1].voice_id == "am_adam"
    # every stage stamped, in order
    for ln in rec.lines:
        t = ln.times
        assert t.created is not None and t.complete is not None and t.tts_ready is not None
        assert t.created <= t.complete <= t.tts_start <= t.tts_ready <= t.play_at  # type: ignore[operator]
    # playback never overlaps the same speaker and keeps line order
    plays = [(ln.times.play_at, ln.times.play_at + (ln.tts_duration or 0)) for ln in rec.lines]
    assert all(b[0] >= a[0] for a, b in itertools.pairwise(plays))
    assert (tmp_path / "record.json").exists() and (tmp_path / "run.log").exists()
    assert s.metrics_snapshot()["played"] == 4


def test_voice_switch_applies_to_lines_not_yet_synthesized(tmp_path: Path) -> None:
    cfg = EngineConfig()
    cfg.speed = 0.0
    models = Models(asr=FakeASR(), speaker=FakeSpeaker(), tts=FakeTTS())  # type: ignore[arg-type]
    s = Session(
        cfg,
        "fake.mp4",
        models,
        tmp_path,
        emotion=FakeEmotion(),  # type: ignore[arg-type]
        vad_factory=EnergyVAD,
    )
    s.audio_override = _clip()
    s.set_voice("S1", "af_bella")  # before any line exists
    with pytest.raises(KeyError):
        s.set_voice("S1", "not_a_voice")
    rec = asyncio.run(s.run())
    assert rec.lines[0].voice_id == "af_bella" and rec.lines[2].voice_id == "af_bella"
    assert rec.lines[1].voice_id == "am_adam"


class FakeStreamingTTS(FakeTTS):
    """Yields audio in chunks like a hosted streaming API."""

    def stream(self, text: str, voice_id: str, style: DeliveryStyle):  # type: ignore[no-untyped-def]
        audio = self.synthesize(text, voice_id, style).audio
        for i in range(0, audio.size, 2400):
            yield audio[i : i + 2400]


def test_streaming_tts_starts_lines_on_first_audio(tmp_path: Path) -> None:
    from engine.metrics.compute import compute_all

    cfg = EngineConfig()
    cfg.speed = 0.0
    models = Models(asr=FakeASR(), speaker=FakeSpeaker(), tts=FakeStreamingTTS())  # type: ignore[arg-type]
    s = Session(
        cfg,
        "fake.mp4",
        models,
        tmp_path,
        emotion=FakeEmotion(),  # type: ignore[arg-type]
        vad_factory=EnergyVAD,
    )
    s.audio_override = _clip()
    rec = asyncio.run(s.run())
    assert len(rec.lines) == 4
    for ln in rec.lines:
        t = ln.times
        assert t.tts_first is not None and t.tts_ready is not None and t.play_at is not None
        assert t.tts_start <= t.tts_first <= t.tts_ready  # type: ignore[operator]
        assert (
            ln.tts_path and ln.tts_path.endswith(".wav") and not ln.tts_path.endswith(".part.wav")
        )
        assert Path(ln.tts_path).exists()
        assert Path(ln.tts_path.replace(".wav", ".part.wav")).exists()
    m = compute_all(rec, None, 10.0)
    assert m["delay"]["headline"] == "delay_felt" and m["delay"]["streamed_lines"] == 4
