"""Voice-switch scoring used by the M10 acceptance check (scripts/ws_client.py)."""

from __future__ import annotations

import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "ws_client", Path(__file__).resolve().parents[2] / "scripts" / "ws_client.py"
)
assert spec and spec.loader
try:
    ws_client = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ws_client)
except ModuleNotFoundError:  # httpx / websockets missing in a minimal env
    ws_client = None


def _line(lid: str, spk: str, tts_start: float, voice: str) -> dict[str, object]:
    return {"line_id": lid, "speaker_id": spk, "voice_id": voice, "times": {"tts_start": tts_start}}


def test_switch_passes_when_next_line_uses_new_voice() -> None:
    if ws_client is None:
        return
    rec = {
        "lines": [
            _line("L1", "S1", 5, "bm_george"),
            _line("L2", "S2", 8, "am_adam"),
            _line("L3", "S1", 12, "af_bella"),
            _line("L4", "S1", 20, "af_bella"),
        ]
    }
    res = ws_client.score_switches(rec, [{"speaker_id": "S1", "voice_id": "af_bella", "t": 10.0}])
    assert res["tested"] == 1 and res["passed"] == 1 and res["pass_rate"] == 1.0


def test_switch_fails_when_old_voice_is_used_after_the_switch() -> None:
    if ws_client is None:
        return
    rec = {"lines": [_line("L1", "S1", 12, "bm_george")]}
    res = ws_client.score_switches(rec, [{"speaker_id": "S1", "voice_id": "af_bella", "t": 10.0}])
    assert res["passed"] == 0 and res["detail"][0]["result"] == "fail"
    none = ws_client.score_switches({"lines": []}, [{"speaker_id": "S1", "voice_id": "x", "t": 1}])
    assert none["tested"] == 0 and none["pass_rate"] is None
