"""Quality Lab (V6): run a scored test from the app and get measured — not estimated — results.

A test plays a clip that has a truth script (`data/clips/*.truth.json`) through the full live
pipeline at real speed (same code path as a viewer's session), then scores it:
transcription WER, what the voices actually said (re-transcribed), missing words, speaker and
emotion accuracy, felt delay, lines on time, dropped lines, which transcriber handled each line.
Results are saved in outputs/lab/<session>.json and listed with every recent session.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.sessions import CLIPS_DIR, ROOT, SESSIONS_DIR, SessionBusyError, SessionManager

LAB_DIR = ROOT / "outputs" / "lab"
router = APIRouter()
_manager: SessionManager | None = None
_running: dict[str, dict[str, Any]] = {}


def bind(manager: SessionManager) -> None:
    global _manager
    _manager = manager


class LabRun(BaseModel):
    clip_id: str
    view_delay_s: float = Field(6.0, ge=0.0, le=15.0)


def _summary(sid: str, metrics: dict[str, Any], spoken: dict[str, Any] | None) -> dict[str, Any]:
    d = metrics.get("delay", {})
    sch = metrics.get("schedule", {})
    felt = d.get("delay_felt", {})
    out: dict[str, Any] = {
        "session_id": sid,
        "clip": Path(metrics.get("run", {}).get("clip", "")).name,
        "view_delay_s": d.get("view_delay_s"),
        "felt_p50": felt.get("p50"),
        "felt_p95": felt.get("p95"),
        "felt_max": felt.get("max"),
        "on_time": d.get("felt_on_time_share"),
        "lines": sch.get("lines_with_text"),
        "voiced": sch.get("lines_played"),
        "actions": sch.get("actions"),
        "asr_by": sch.get("asr_by"),
        "wer": (metrics.get("wer") or {}).get("wer"),
        "speaker_accuracy": (metrics.get("speaker") or {}).get("speaker_accuracy"),
        "emotion_exact": (metrics.get("emotion") or {}).get("emotion_exact"),
        "emotion_within_one": (metrics.get("emotion") or {}).get("emotion_within_one"),
        "crashes": metrics.get("run", {}).get("crashes"),
        "commit": metrics.get("run", {}).get("commit"),
    }
    w = metrics.get("wer") or {}
    # a session stopped early is scored against the WHOLE script: flag it instead of showing a
    # misleading word error rate (heard < 85 % of the script's words)
    if w.get("ref_words") and w.get("hyp_words", 0) < 0.85 * w["ref_words"]:
        out["partial"] = True
        out["wer"] = None
    if spoken:
        out["spoken_wer"] = (spoken.get("spoken") or {}).get("wer")
        out["spoken_deletions"] = (spoken.get("spoken") or {}).get("deletions")
        out["ref_words"] = spoken.get("ref_words")
        out["missing_words"] = spoken.get("missing_words", [])[:40]
    return out


async def _score(sid: str, truth: Path) -> None:
    from engine.metrics.spoken import spoken_check

    assert _manager is not None
    ps = _manager.get(sid)
    st = _running[sid]
    while not ps.report_ready:
        st["stage"] = "playing" if ps.status == "live" else "finishing"
        st["media_t"] = round(ps.engine.clock.now(), 1)
        await asyncio.sleep(1)
    st["stage"] = "scoring (re-listening to every voice line)"
    loop = asyncio.get_running_loop()
    try:
        spoken = await loop.run_in_executor(None, spoken_check, ps.out_dir, truth)
    except Exception as e:  # report what we have; never hide a failure
        spoken = {"error": f"{type(e).__name__}: {e}"}
    metrics = json.loads((ps.out_dir / "metrics.json").read_text())
    res = _summary(sid, metrics, spoken)
    res["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
    res["source"] = "quality-lab"
    LAB_DIR.mkdir(parents=True, exist_ok=True)
    (LAB_DIR / f"{sid}.json").write_text(json.dumps({**res, "spoken": spoken}, indent=2))
    _running.pop(sid, None)


@router.post("/api/lab/runs")
async def start_run(body: LabRun) -> dict[str, Any]:
    if _manager is None or _manager.models is None:
        raise HTTPException(503, "models are not loaded")
    clip = CLIPS_DIR / Path(body.clip_id).name
    truth = clip.with_suffix(".truth.json")
    if not clip.exists() or not truth.exists():
        raise HTTPException(400, "pick a scored clip (one with a truth script)")
    n_spk = len({t["speaker"] for t in json.loads(truth.read_text())["lines"]})
    try:
        ps = _manager.create(clip.name, max(1, min(3, n_spk)), None, False, 1.0, body.view_delay_s)
    except SessionBusyError as e:
        raise HTTPException(409, str(e)) from e
    _manager.start(ps)
    _running[ps.session_id] = {"session_id": ps.session_id, "clip": clip.name, "stage": "starting",
                               "duration": None, "started": time.time()}  # fmt: skip
    asyncio.get_running_loop().create_task(_score(ps.session_id, truth))
    return {"session_id": ps.session_id}


@router.get("/api/lab/runs")
def list_runs() -> dict[str, Any]:
    done = []
    if LAB_DIR.exists():
        for f in sorted(LAB_DIR.glob("*.json"), reverse=True)[:30]:
            try:
                d = json.loads(f.read_text())
                d.pop("spoken", None)
                done.append(d)
            except (OSError, ValueError):
                continue
    running = []
    for sid, st in _running.items():
        r = dict(st)
        with contextlib.suppress(KeyError):
            r["duration"] = round(_manager.get(sid).engine.duration, 1) if _manager else None
        r["elapsed_s"] = round(time.time() - st["started"], 1)
        running.append(r)
    return {"running": running, "runs": done}


@router.get("/api/lab/sessions")
def recent_sessions() -> list[dict[str, Any]]:
    """Every recent session (clips, live streams, lab runs) with its measured numbers."""
    out = []
    dirs = sorted((p for p in SESSIONS_DIR.iterdir() if p.is_dir()), reverse=True)[:40]
    for p in dirs:
        m = p / "metrics.json"
        if not m.exists():
            continue
        try:
            s = _summary(p.name, json.loads(m.read_text()), None)
        except (OSError, ValueError):
            continue
        s["live_input"] = "_live_" in p.name
        out.append(s)
    return out
