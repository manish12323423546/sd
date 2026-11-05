"""WebSocket handler: the live protocol of docs/05 §5.4.

Server → client: session.ready, session.started, speaker.new, speaker.updated, line.complete,
audio.ready, metrics, warning, session.ended, pong, error.
Client → server: start, set_voice, played, stop, ping.
"""

from __future__ import annotations

import asyncio
import contextlib
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.sessions import ROOT, PilotSession, SessionManager
from engine.record.models import Line, Speaker
from engine.record.store import Event

FORWARD = (
    "speaker.new",
    "speaker.updated",
    "line.complete",
    "line.scheduled",
    "session.metrics",
    "session.warning",
    "session.ended",
)


ABANDON_GRACE_S = 15.0


def _stop_if_abandoned(manager: SessionManager, ps: PilotSession) -> None:
    if ps.clients == 0 and ps.status == "live":
        ps.engine.store.warn("all viewers disconnected — session stopped")
        manager.stop(ps)


def speaker_msg(sp: Speaker) -> dict[str, Any]:
    return {
        "speaker_id": sp.speaker_id,
        "display_name": sp.display_name,
        "color": sp.color,
        "voice_id": sp.voice_id,
    }


def line_msg(ln: Line) -> dict[str, Any]:
    return {
        "line_id": ln.line_id,
        "t_start": ln.t_start,
        "t_end": ln.t_end,
        "text": ln.text,
        "speaker_id": ln.speaker_id,
        "emotion": ln.emotion.value if ln.emotion else None,
        "arousal": ln.arousal,
    }


def tts_url(ps: PilotSession, path: str) -> str:
    rel = Path(path).resolve().relative_to((ROOT / "outputs" / "sessions").resolve())
    return "/media/tts/" + rel.as_posix().replace("/tts/", "/", 1)


def translate(ps: PilotSession, ev: Event) -> dict[str, Any] | None:
    store = ps.engine.store
    if ev.name in ("speaker.new", "speaker.updated"):
        sp = store.record.speakers[ev.data["speaker_id"]]
        return {"type": ev.name, "speaker": speaker_msg(sp)}
    if ev.name == "line.complete":
        return {"type": "line.complete", "line": line_msg(store.get(ev.data["line_id"]))}
    if ev.name == "line.scheduled":
        ln = store.get(ev.data["line_id"])
        if not ln.tts_path or ln.times.play_at is None:
            return None
        return {
            "type": "audio.ready",
            "line_id": ln.line_id,
            "voice_id": ln.voice_id,
            "url": tts_url(ps, ln.tts_path),
            "duration": ln.tts_duration,
            "play_at_media": ln.times.play_at,
            "schedule_action": ln.schedule_action,
            "delay_ready": None if ln.delay_ready is None else round(ln.delay_ready, 3),
        }
    if ev.name == "session.metrics":
        d = ev.data
        return {
            "type": "metrics",
            "p50_delay": d["p50_delay"],
            "p95_delay": d["p95_delay"],
            "last_delay": d["last_delay"],
            "drift_slope": d["drift_slope"],
            "lines": d["lines"],
            "dropped": d["dropped"],
        }
    if ev.name == "session.warning":
        return {"type": "warning", "message": ev.data.get("message", "")}
    if ev.name == "session.ended":
        return {"type": "session.ended", "report_url": f"/api/sessions/{ps.session_id}/report"}
    return None


async def handle(ws: WebSocket, manager: SessionManager, sid: str) -> None:
    await ws.accept()
    try:
        ps = manager.get(sid)
    except KeyError:
        await ws.send_json({"type": "error", "message": f"unknown session {sid}"})
        await ws.close()
        return
    voices = [
        {"voice_id": v.voice_id, "name": v.name, "preview_url": f"/media/previews/{v.voice_id}.wav"}
        for v in manager.catalog.pilot_voices()
    ]
    await ws.send_json(
        {
            "type": "session.ready",
            "session_id": sid,
            "media_url": f"/media/clips/{ps.clip_id}",
            "speakers_max": ps.cfg.speaker.max_speakers,
            "voices": voices,
            "speed": ps.cfg.speed,
            "speakers": [speaker_msg(s) for s in ps.engine.store.record.speakers.values()],
        }
    )

    sub = ps.engine.store.subscribe(*FORWARD)
    ps.clients += 1

    async def pump() -> None:
        async for ev in sub:
            msg = translate(ps, ev)
            if msg is not None:
                await ws.send_json(msg)
            if ev.name == "session.ended":
                # wait for the report to be written so its link works
                for _ in range(600):
                    if ps.report_ready:
                        break
                    await asyncio.sleep(0.1)

    pump_task = asyncio.create_task(pump())
    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")
            if kind == "ping":
                await ws.send_json(
                    {"type": "pong", "t": msg.get("t"), "server_wall": ps.engine.clock.now()}
                )
            elif kind == "start":
                if ps.task is None:
                    manager.start(ps)
                    # the engine sets t0 right after decode/VAD set-up; wait for it so the
                    # client starts its video at the same moment
                    for _ in range(300):
                        if ps.engine.clock.t0 is not None:
                            break
                        await asyncio.sleep(0.02)
                    await ws.send_json(
                        {"type": "session.started", "server_wall": ps.engine.clock.now()}
                    )
            elif kind == "set_voice":
                try:
                    ps.engine.set_voice(str(msg["speaker_id"]), str(msg["voice_id"]))
                except KeyError as e:
                    await ws.send_json({"type": "error", "message": f"unknown voice {e}"})
            elif kind == "played":
                lid = str(msg.get("line_id"))
                with contextlib.suppress(KeyError):
                    stamp: dict[str, Any] = {"times.played": round(ps.engine.clock.now(), 3)}
                    ps.engine.store.update_line(lid, **stamp)
            elif kind == "stop":
                manager.stop(ps)
            else:
                await ws.send_json({"type": "error", "message": f"unknown message type {kind!r}"})
    except WebSocketDisconnect:
        pass
    finally:
        ps.clients -= 1
        if ps.clients == 0 and ps.status == "live":
            # nobody is watching any more: stop after a grace period so an abandoned tab does not
            # block the (single) pilot session slot until the clip ends
            asyncio.get_running_loop().call_later(ABANDON_GRACE_S, _stop_if_abandoned, manager, ps)
        sub.close()
        pump_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await pump_task
