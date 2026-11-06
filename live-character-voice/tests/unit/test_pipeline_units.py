"""Feeder, segmenter, record store, clustering, emotion labels, scheduler (no models)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import numpy as np
import pytest

from engine.config import EmotionConfig, ScheduleConfig, SegmentConfig, SpeakerConfig
from engine.ingest.feeder import FakeClock, SessionClock, feed
from engine.providers.base import EmotionContext, Word
from engine.providers.free.emotion_prosody import ProsodyEmotion, label_for, text_cue_score
from engine.record.models import Emotion, Line, SessionRecord, Speaker
from engine.record.store import RecordStore
from engine.schedule.scheduler import (
    PrevPlayback,
    drift_slope,
    drift_warning,
    plan_playback,
    should_drop,
)
from engine.segment.segmenter import FRAME, LineSegmenter
from engine.speakers.enroll import EnrollFile
from engine.speakers.online_cluster import OnlineClusterer

SR = 16000
FD = FRAME / SR


# ---------------------------------------------------------------- feeder
def test_feeder_releases_chunks_on_schedule_never_early() -> None:
    clock = FakeClock()
    audio = np.zeros(int(SR * 2.25), dtype=np.float32)

    async def collect() -> list[tuple[int, float, float, float]]:
        out = []
        async for ch in feed(audio, SR, 500, clock):
            out.append((ch.index, ch.media_start, ch.media_end, clock.now()))
        return out

    chunks = asyncio.run(collect())
    assert [c[0] for c in chunks] == [0, 1, 2, 3, 4]
    assert clock.sleeps == pytest.approx([0.5, 1.0, 1.5, 2.0, 2.25])
    for _, _, media_end, released_at in chunks:
        assert released_at >= media_end  # never before the chunk's audio has "aired"


def test_session_clock_speed() -> None:
    c = SessionClock(speed=4.0)
    assert c.now() == 0.0
    c.start()
    assert 0.0 <= c.now() < 0.5
    assert c.to_wall_delay(2.0) == pytest.approx(0.5)
    with pytest.raises(ValueError):
        SessionClock(speed=-1)


# ---------------------------------------------------------------- segmenter
def _frames(levels_db: list[float]) -> np.ndarray:
    """Frames of white noise at the given dB levels (shape n×512)."""
    rng = np.random.default_rng(0)
    out = []
    for lvl in levels_db:
        amp = 10 ** (lvl / 20)
        out.append(rng.standard_normal(FRAME).astype(np.float32) * amp)
    return np.stack(out)


def _run(seg: LineSegmenter, pattern: list[tuple[float, float, int]]) -> list:
    """pattern: (prob, level_db, n_frames) blocks."""
    probs, levels = [], []
    for p, lvl, n in pattern:
        probs += [p] * n
        levels += [lvl] * n
    frames = _frames(levels)
    out = []
    for i in range(0, len(probs), 16):  # ~0.5 s chunks
        out += seg.push(np.asarray(probs[i : i + 16], np.float32), frames[i : i + 16])
    return out + seg.flush()


def n(seconds: float) -> int:
    return round(seconds / FD)


def test_segmenter_closes_on_pause() -> None:
    seg = LineSegmenter(SegmentConfig())
    lines = _run(seg, [(0.0, -60, n(0.5)), (0.9, -20, n(2.0)), (0.0, -60, n(0.6))])
    assert len(lines) == 1
    ln = lines[0]
    assert ln.close_reason == "pause"
    assert ln.t_start == pytest.approx(0.5, abs=FD)
    assert ln.t_end == pytest.approx(2.5, abs=FD)
    assert ln.pad_before_s == pytest.approx(0.12, abs=1e-6)
    assert ln.audio.size / SR == pytest.approx(2.0 + 0.24, abs=2 * FD)


def test_segmenter_short_pause_does_not_close() -> None:
    seg = LineSegmenter(SegmentConfig())
    lines = _run(
        seg, [(0.9, -20, n(1.0)), (0.0, -60, n(0.2)), (0.9, -20, n(1.0)), (0.0, -60, n(0.6))]
    )
    assert len(lines) == 1 and lines[0].t_end == pytest.approx(2.2, abs=2 * FD)


def test_segmenter_max_length_cuts_at_quietest_frame() -> None:
    seg = LineSegmenter(SegmentConfig(max_line_s=6.0))
    # 5.5 s loud speech, a quiet dip (still speech per VAD), then more speech
    pattern = [(0.9, -20, n(5.5)), (0.6, -45, 2), (0.9, -20, n(3.0)), (0.0, -60, n(0.6))]
    lines = _run(seg, pattern)
    assert [ln.close_reason for ln in lines] == ["max_len", "pause"]
    assert lines[0].t_end == pytest.approx(5.5, abs=2 * FD)  # cut at the dip, not at 6.0
    assert lines[1].t_start == pytest.approx(lines[0].t_end, abs=FD)


def test_segmenter_burst_closes_fast_after_loud_short_shout() -> None:
    seg = LineSegmenter(SegmentConfig(burst_db=10))
    pattern = []
    for _ in range(4):  # history of normal-level lines
        pattern += [(0.9, -30, n(1.5)), (0.0, -70, n(0.5))]
    pattern += [(0.9, -15, n(0.8)), (0.0, -70, n(0.25)), (0.9, -30, n(1.0)), (0.0, -70, n(0.6))]
    lines = _run(seg, pattern)
    reasons = [ln.close_reason for ln in lines]
    assert reasons[:4] == ["pause"] * 4
    assert reasons[4] == "burst"  # closed after 200 ms, before the 350 ms pause rule
    assert len(lines) == 6


def test_segmenter_discards_tiny_blips() -> None:
    seg = LineSegmenter(SegmentConfig(min_line_ms=250))
    lines = _run(seg, [(0.9, -20, 3), (0.0, -60, n(0.6)), (0.9, -20, n(1.0)), (0.0, -60, n(0.6))])
    assert len(lines) == 1 and lines[0].t_start > 0.5


def test_segmenter_force_split_for_speaker_change() -> None:
    seg = LineSegmenter(SegmentConfig())
    probs = np.full(n(3.0), 0.9, np.float32)
    levels = [-20.0] * n(3.0)
    levels[n(1.6)] = -50.0  # quiet frame at the change point
    seg.push(probs, _frames(levels))
    line = seg.force_split(1.4, 1.9)
    assert line is not None and line.close_reason == "speaker_change"
    assert line.t_end == pytest.approx(1.6, abs=FD)
    rest = seg.flush()
    assert rest and rest[0].t_start == pytest.approx(1.6, abs=FD)


def test_segmenter_rolling_buffer_stays_bounded() -> None:
    seg = LineSegmenter(SegmentConfig())
    for _ in range(200):  # 200 × 0.5 s = 100 s of silence
        seg.push(np.zeros(16, np.float32), np.zeros((16, FRAME), np.float32))
    assert seg.buf.size <= int(30 * SR * 1.6)


# ---------------------------------------------------------------- record store
def _record() -> SessionRecord:
    return SessionRecord(
        session_id="t",
        clip_path="c",
        mode="poc",
        speed=1.0,
        source="asr",
        started_at_iso="x",
        config_snapshot={},
    )


def test_record_store_events_in_order_and_queries(tmp_path: Path) -> None:
    async def go() -> list[str]:
        store = RecordStore(_record())
        sub = store.subscribe()
        store.add_line(Line(line_id="L000002", t_start=5.0, t_end=6.0, close_reason="pause"))
        store.add_line(Line(line_id="L000001", t_start=1.0, t_end=2.0, close_reason="pause"))
        store.update_line("L000001", event="line.asr_done", text="hi", **{"times.asr_done": 2.5})
        store.upsert_speaker(Speaker(speaker_id="S1", display_name="A", color="#fff"))
        store.update_line("L000001", speaker_id="S1")
        assert [ln.line_id for ln in store.record.lines] == ["L000001", "L000002"]
        assert store.get("L000001").times.asr_done == 2.5
        assert [ln.line_id for ln in store.lines_between(1.5, 5.5)] == ["L000001", "L000002"]
        assert [ln.line_id for ln in store.last_n("S1", 3)] == ["L000001"]
        assert store.previous(store.get("L000002")).line_id == "L000001"  # type: ignore[union-attr]
        with pytest.raises(AttributeError):
            store.update_line("L000001", nope=1)
        store.checkpoint(tmp_path / "record.json")
        again = RecordStore.load(tmp_path / "record.json")
        assert again.lines[0].text == "hi"
        sub.close()
        return [ev.name async for ev in sub]

    names = asyncio.run(go())
    assert names == ["line.created", "line.created", "line.asr_done", "speaker.new", "line.updated"]


# ---------------------------------------------------------------- clustering
def _vec(seed: int, base: np.ndarray | None = None, noise: float = 0.0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(192).astype(np.float32) if base is None else base.copy()
    if noise:
        v = v + rng.standard_normal(192).astype(np.float32) * noise
    return v / np.linalg.norm(v)


def test_online_clustering_assigns_and_creates() -> None:
    cl = OnlineClusterer(SpeakerConfig(max_speakers=2))
    a, b = _vec(1), _vec(2)
    r1 = cl.assign(_vec(10, a, 0.03), 2.0, None)
    assert r1.is_new and r1.speaker_id == "S1"
    r2 = cl.assign(_vec(11, b, 0.03), 2.0, "S1")
    assert r2.is_new and r2.speaker_id == "S2"
    r3 = cl.assign(_vec(12, a, 0.03), 2.0, "S2")
    assert r3.speaker_id == "S1" and r3.confidence == "high" and not r3.is_new
    # a third voice cannot create S3 when max_speakers=2 → low-confidence best match
    r4 = cl.assign(_vec(3), 2.0, "S1")
    assert not r4.is_new and r4.confidence == "low"
    # short line inherits previous speaker unless strongly another
    r5 = cl.assign(_vec(13, b, 0.6), 0.5, "S1")
    assert r5.speaker_id == "S1" and r5.confidence == "low"
    r6 = cl.assign(_vec(14, b, 0.02), 0.5, "S1")
    assert r6.speaker_id == "S2"


def test_short_first_lines_do_not_create_extra_speakers() -> None:
    cl = OnlineClusterer(SpeakerConfig(max_speakers=3))
    a = _vec(1)
    cl.assign(_vec(10, a, 0.02), 2.0, None)
    r = cl.assign(_vec(5), 1.0, "S1")  # new voice but < 1.5 s → no new speaker yet
    assert not r.is_new and len(cl.centroids) == 1


def test_enrollment_fixes_speakers_and_names() -> None:
    cl = OnlineClusterer(SpeakerConfig(max_speakers=2))
    a, b = _vec(1), _vec(2)
    assert cl.enroll("Ann", [_vec(20, a, 0.05), _vec(21, a, 0.05)]) == "S1"
    assert cl.enroll("Bob", [_vec(22, b, 0.05)]) == "S2"
    assert cl.names == {"S1": "Ann", "S2": "Bob"}
    assert cl.assign(_vec(23, b, 0.05), 2.0, None).speaker_id == "S2"
    assert not cl.assign(_vec(9), 3.0, None).is_new
    ef = EnrollFile.model_validate(
        {
            "speakers": [
                {"name": "A", "t_start": 0, "t_end": 4, "spans": [[6, 9]]},
                {"name": "B", "spans": [[4, 6]]},
            ]
        }
    )
    assert ef.speakers[0].spans == [(0, 4), (6, 9)] and ef.ready_at == 9


# ---------------------------------------------------------------- emotion
def test_emotion_labels_from_thresholds() -> None:
    cfg = EmotionConfig()
    assert label_for(-1.0, cfg) is Emotion.calm
    assert label_for(0.0, cfg) is Emotion.neutral
    assert label_for(1.0, cfg) is Emotion.excited
    assert label_for(2.0, cfg) is Emotion.peak


def test_text_cues() -> None:
    kws = {"goal": 1.0, "what a": 0.6}
    assert text_cue_score("GOAL! What a strike!", kws, 0.5, 2.0) == pytest.approx(2.0)
    assert text_cue_score("a quiet spell", kws, 0.5, 2.0) == 0.0


def _ctx(
    loud: float, pitch: float, words: int, t: float, spk: str = "S1", text: str = ""
) -> EmotionContext:
    ws = [Word(word="w", start=i * 0.4, end=i * 0.4 + 0.3, prob=1.0) for i in range(words)]
    return EmotionContext(
        features={"loudness_db": loud, "pitch_hz_median": pitch},
        text=text or "w " * words,
        words=ws,
        speaker_id=spk,
        t_start=t - 2,
        t_end=t,
    )


def test_emotion_relative_loudness_pitch_and_smoothing() -> None:
    emo = ProsodyEmotion(EmotionConfig())
    for i in range(6):  # calm-ish history
        r = emo.analyze(_ctx(-25 + (i % 2), 120 + (i % 3), 5, 2.0 * (i + 1)))
        assert r.label is Emotion.neutral  # no history yet / normal
    peak = emo.analyze(_ctx(-12, 190, 8, 20.0, text="Goal! Goal!"))
    assert peak.label is Emotion.peak and peak.arousal >= 1.8
    # downward jump after a peak is smoothed (0.7 current + 0.3 previous)
    after = emo.analyze(_ctx(-30, 110, 4, 23.0))
    assert after.arousal == pytest.approx(0.7 * after.features["arousal_raw"] + 0.3 * peak.arousal)
    quiet = ProsodyEmotion(EmotionConfig())
    for i in range(6):
        quiet.analyze(_ctx(-20, 150, 6, 2.0 * (i + 1)))
    calm = quiet.analyze(_ctx(-30, 120, 3, 20.0))
    assert calm.label is Emotion.calm


# ---------------------------------------------------------------- scheduler
def test_plan_playback_gap_overlap_and_catch_up() -> None:
    cfg = ScheduleConfig()
    p = plan_playback(
        tts_ready=12.0, t_start=8.0, t_end=10.0, speaker_id="S1", duration=2, prev=None, cfg=cfg
    )
    assert p.play_at == 12.0 and p.action == "none" and p.lag == pytest.approx(2.0)
    prev = PrevPlayback("S1", play_end=13.0, t_end=9.0)
    p = plan_playback(
        tts_ready=12.0, t_start=9.5, t_end=11.0, speaker_id="S1", duration=1, prev=prev, cfg=cfg
    )
    assert p.play_at == pytest.approx(13.08)  # same speaker: after previous + 80 ms gap
    # different speaker whose original overlapped by 0.25 s may overlap by 0.25 s
    prev = PrevPlayback("S1", play_end=13.0, t_end=9.75)
    p = plan_playback(
        tts_ready=12.0, t_start=9.5, t_end=11.0, speaker_id="S2", duration=1, prev=prev, cfg=cfg
    )
    assert p.play_at == pytest.approx(12.75)
    # soft lag → speed-up within [1, max_speedup]
    p = plan_playback(
        tts_ready=15.0, t_start=9.0, t_end=10.0, speaker_id="S1", duration=1, prev=None, cfg=cfg
    )
    assert p.action == "speedup" and 1.0 < p.speedup <= cfg.max_speedup
    p = plan_playback(
        tts_ready=20.0, t_start=9.0, t_end=10.0, speaker_id="S1", duration=1, prev=None, cfg=cfg
    )
    assert p.speedup == cfg.max_speedup


def test_drop_rules_never_drop_excitement() -> None:
    cfg = ScheduleConfig()
    assert should_drop(7.0, Emotion.neutral, 0.8, cfg)
    assert not should_drop(7.0, Emotion.neutral, 2.0, cfg)  # not filler
    assert not should_drop(7.0, Emotion.peak, 0.5, cfg)
    assert not should_drop(7.0, Emotion.excited, 0.5, cfg)
    assert not should_drop(5.0, Emotion.neutral, 0.5, cfg)  # below lag_hard


def test_drift_slope() -> None:
    t = list(np.linspace(0, 600, 50))
    assert drift_slope(t, [2.0] * 50) == pytest.approx(0.0, abs=1e-9)
    growing = [2.0 + 0.05 * x for x in t]
    assert drift_slope(t, growing) == pytest.approx(0.05)
    assert drift_warning(0.05) and not drift_warning(0.01)
    assert drift_slope([1.0, 2.0], [1.0, 9.0]) == 0.0


def test_segmenter_level_change_isolates_a_shout_after_a_short_gap() -> None:
    seg = LineSegmenter(SegmentConfig(level_split_db=6))
    pattern = []
    for _ in range(4):
        pattern += [(0.9, -30, n(1.5)), (0.0, -70, n(0.5))]
    # phrase, 128 ms micro-pause (< 350 ms pause rule), then a +12 dB shout, then a pause
    pattern += [(0.9, -30, n(1.2)), (0.0, -70, 4), (0.9, -18, n(0.7)), (0.0, -70, n(0.6))]
    lines = _run(seg, pattern)
    assert [ln.close_reason for ln in lines[4:]] == ["level_change", "burst"]
    assert lines[5].t_end - lines[5].t_start == pytest.approx(0.7, abs=2 * FD)


def test_segmenter_burst_ends_on_energy_drop_even_if_vad_stays_on() -> None:
    seg = LineSegmenter(SegmentConfig())
    pattern = []
    for _ in range(4):
        pattern += [(0.9, -30, n(1.5)), (0.0, -70, n(0.5))]
    # shout, then a crowd roar the VAD calls speech but 8 dB quieter
    pattern += [(0.9, -16, n(0.6)), (0.8, -24, n(1.5)), (0.0, -70, n(0.6))]
    lines = _run(seg, pattern)
    assert lines[4].close_reason == "burst"
    assert lines[4].t_end - lines[4].t_start == pytest.approx(0.6, abs=2 * FD)


def test_loudest_window_ignores_pauses() -> None:
    from engine.providers.free.emotion_prosody import loudest_window_db

    sr = 16000
    tone = (0.1 * np.sin(2 * np.pi * 200 * np.arange(sr) / sr)).astype(np.float32)
    silence = np.zeros(3 * sr, np.float32)
    x = np.concatenate([silence, tone, silence])
    # whole-line RMS is ~12 dB lower than the speech level; the loudest second is not
    assert loudest_window_db(x, sr) == pytest.approx(-23.0, abs=0.2)


def test_segmenter_phrase_break_at_breath() -> None:
    """V3: a ≥160 ms breath after ≥2 s of speech closes the phrase; shorter phrases stay whole."""
    seg = LineSegmenter(SegmentConfig(phrase_min_s=2.0, phrase_pause_ms=160))
    lines = _run(
        seg,
        [(0.9, -20, n(2.5)), (0.0, -60, n(0.2)), (0.9, -20, n(1.5)), (0.0, -60, n(0.2)),
         (0.9, -20, n(1.0)), (0.0, -60, n(0.6))],
    )  # fmt: skip
    assert [ln.close_reason for ln in lines] == ["phrase", "pause"]
    assert lines[0].t_end == pytest.approx(2.5, abs=2 * FD)
    assert lines[1].t_start == pytest.approx(2.7, abs=2 * FD)  # 1.5 s + 1.0 s kept together
    off = LineSegmenter(SegmentConfig())  # default: phrase splitting off
    assert len(_run(off, [(0.9, -20, n(2.5)), (0.0, -60, n(0.2)), (0.9, -20, n(1.0)),
                          (0.0, -60, n(0.6))])) == 1  # fmt: skip


def test_session_clock_pause_freezes_time() -> None:
    import asyncio
    import time

    from engine.ingest.feeder import SessionClock

    async def go() -> tuple[float, float, float]:
        c = SessionClock()
        c.start()
        await asyncio.sleep(0.05)
        c.pause()
        a = c.now()
        await asyncio.sleep(0.15)
        b = c.now()
        c.resume()
        t = time.monotonic()
        await c.sleep_until(b + 0.05)
        return a, b, time.monotonic() - t

    a, b, waited = asyncio.run(go())
    assert a == b  # frozen while paused
    assert 0.03 < waited < 0.15  # resumes counting from where it stopped


def test_synced_plan_lands_on_line_start() -> None:
    """Synced viewing (view delay d): a line whose voice is ready before t_start + d plays at
    exactly t_start + d — i.e. at the original moment in the viewer's picture."""
    from engine.config import ScheduleConfig
    from engine.schedule.scheduler import plan_playback

    d = 6.0
    plan = plan_playback(tts_ready=7.4, t_start=3.0 + d, t_end=5.5 + d, speaker_id="S1",
                         duration=2.4, prev=None, cfg=ScheduleConfig())  # fmt: skip
    assert plan.play_at - d == pytest.approx(3.0) and plan.action == "none"


def test_live_source_rechunks_and_clocks_by_audio() -> None:
    import asyncio

    from engine.ingest.live import LiveSource

    async def go() -> tuple[list[tuple[float, float, int]], float]:
        src = LiveSource(16000)
        pcm = (np.ones(4000, dtype=np.int16) * 1000).tobytes()  # 0.25 s per push
        out = []

        async def consume() -> None:
            async for ch in src.chunks(100):
                out.append((round(ch.media_start, 3), round(ch.media_end, 3), ch.samples.size))

        task = asyncio.create_task(consume())
        for _ in range(4):  # 1.0 s of audio in uneven pushes
            src.push_pcm16(pcm)
            await asyncio.sleep(0)
        clock_now = src.clock.now()
        src.close()
        await task
        return out, clock_now

    chunks, now = asyncio.run(go())
    assert len(chunks) == 10 and chunks[0] == (0.0, 0.1, 1600) and chunks[-1][1] == 1.0
    assert 1.0 <= now <= 1.3  # media clock = audio received (+ small interpolation)


def test_live_session_endpoint_needs_models() -> None:
    import os

    os.environ["LCV_SKIP_MODELS"] = "1"
    from fastapi.testclient import TestClient

    from app import main

    with TestClient(main.app) as c:
        assert c.post("/api/live/sessions", json={"max_speakers": 2}).status_code == 503
        assert c.post("/api/live/sessions", json={"max_speakers": 7}).status_code == 422
        r = c.get("/pcm-worklet.js")  # served for the Live capture page (when web is built)
        assert r.status_code in (200, 404)


def test_groq_limiter_stays_under_requests_per_minute(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from engine.providers.free.asr_groq import GroqASR

    monkeypatch.setenv("GROQ_RPM", "3")
    monkeypatch.setenv("GROQ_MAX_WAIT_S", "0")
    asr = GroqASR(fallback=object())
    assert [asr._take_slot() for _ in range(4)] == [True, True, True, False]


def test_lab_summary_flags_partial_runs() -> None:
    from app.lab import _summary

    m = {
        "delay": {},
        "schedule": {},
        "run": {},
        "wer": {"wer": 0.88, "ref_words": 525, "hyp_words": 60},
    }
    s = _summary("x", m, None)
    assert s["partial"] is True and s["wer"] is None
    m["wer"] = {"wer": 0.065, "ref_words": 525, "hyp_words": 520}
    assert _summary("x", m, None)["wer"] == 0.065
