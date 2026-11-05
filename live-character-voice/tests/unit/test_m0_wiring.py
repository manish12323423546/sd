"""M0: configs load, record models round-trip, providers registry and `check` CLI are wired."""

from __future__ import annotations

import json

import pytest

from engine import cli
from engine.config import load_engine_config, load_voice_catalog
from engine.providers import registry
from engine.record.models import Emotion, Line, SessionRecord, line_id_for


def test_engine_config_loads_with_spec_defaults() -> None:
    cfg = load_engine_config()
    assert cfg.speed == 1.0
    assert cfg.audio.chunk_ms == 500
    assert cfg.segment.end_silence_ms == 350
    assert cfg.asr.model == "small.en"
    assert cfg.tts.voice_map["S1"] == "bm_george"
    assert len(cfg.snapshot_hash()) == 12


def test_voice_catalog_has_four_pilot_voices_and_tts_map_uses_catalog() -> None:
    cat = load_voice_catalog()
    assert [v.name for v in cat.pilot_voices()] == ["The Veteran", "Hype Host", "Spark", "Coach"]
    cfg = load_engine_config()
    for voice_id in cfg.tts.voice_map.values():
        cat.get(voice_id)  # raises KeyError if the map points outside the catalog


def test_line_delay_and_record_round_trip() -> None:
    line = Line(line_id=line_id_for(42), t_start=61.2, t_end=64.0, close_reason="pause")
    assert line.line_id == "L000042"
    assert line.delay_ready is None
    line.times.tts_ready = 66.1
    assert line.delay_ready == pytest.approx(2.1)
    line.text, line.speaker_id, line.emotion = "Goal!", "S1", Emotion.peak
    assert line.is_complete
    rec = SessionRecord(
        session_id="s",
        clip_path="c.mp4",
        mode="poc",
        speed=1.0,
        source="asr",
        started_at_iso="2026-11-05T00:00:00Z",
        config_snapshot={},
        lines=[line],
    )
    again = SessionRecord.model_validate_json(rec.model_dump_json())
    assert again.lines[0].emotion is Emotion.peak


def test_registry_reports_unknown_provider() -> None:
    with pytest.raises(KeyError, match="no asr provider"):
        registry.create("asr", "does_not_exist")


def test_check_json_without_network(capsys: pytest.CaptureFixture[str]) -> None:
    cli.main(["check", "--json", "--no-network"])
    data = json.loads(capsys.readouterr().out)
    assert int(data["system"]["cpu_count"]) >= 1
    names = {c["name"] for c in data["checks"]}
    assert {"ffmpeg", "espeak-ng", "py:numpy"} <= names
    assert not any(n.startswith("net:") for n in names)


def test_check_tool_reports_missing_binary() -> None:
    item = cli.check_tool("nope-tool", ["definitely-not-a-real-binary-xyz"])
    assert not item.ok and "install" in item.detail
