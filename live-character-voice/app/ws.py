"""WebSocket handler: the live protocol of docs/05 §5.4.

Server → client: session.ready, session.started, speaker.new, speaker.updated, line.complete,
audio.ready, metrics, warning, session.ended, pong, error.
Client → server: start, set_voice, played, stop, ping.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
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
        # extras for live panels (docs/05 additions): speaker match 0–1, which transcriber
        "speaker_conf": ln.speaker_conf,  # "high" | "medium" | "low" | "new" …
        "speaker_sim": None if ln.speaker_sim is None else round(float(ln.speaker_sim), 3),
        "asr_by": ln.features.get("asr_by"),
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
            # the viewer's media time: synced mode runs the picture view_delay behind live
            "play_at_media": round(ln.times.play_at - ps.engine.view_delay, 3),
            "t_start": ln.t_start,
            "text": ln.text,
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
        {
            "voice_id": v.voice_id,
            "name": v.name,
            "preview_url": f"/media/previews/{manager.preview_name(v.voice_id)}",
        }
        for v in manager.catalog.pilot_voices()
    ]
    await ws.send_json(
        {
            "type": "session.ready",
            "session_id": sid,
            "media_url": None if ps.live is not None else f"/media/clips/{ps.clip_id}",
            "live_input": ps.live is not None,
            "speakers_max": ps.cfg.speaker.max_speakers,
            "voices": voices,
            "speed": ps.cfg.speed,
            "view_delay_s": ps.engine.view_delay,
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
            raw = await ws.receive()
            if raw.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect(raw.get("code", 1000))
            if raw.get("bytes") is not None:  # live input: PCM16 mono 16 kHz audio
                if ps.live is not None and ps.status == "live":
                    ps.live.push_pcm16(raw["bytes"])
                continue
            try:
                msg = json.loads(raw.get("text") or "{}")
            except ValueError:
                continue
            kind = msg.get("type")
            if kind == "ping":
                await ws.send_json(
                    {"type": "pong", "t": msg.get("t"), "server_wall": ps.engine.clock.now()}
                )
            elif kind == "start":
                if ps.task is None:
                    manager.start(ps)
                # the engine sets t0 right after decode/VAD set-up; wait for it so the client
                # starts its video at the same moment. A viewer joining a session that is
                # already running (e.g. a Quality Lab run) gets the current time and catches up.
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
            elif kind in ("pause", "resume"):
                # the viewer paused: freeze session time so nothing runs ahead of the picture
                if kind == "pause":
                    ps.engine.clock.pause()
                else:
                    ps.engine.clock.resume()
                state = "session.paused" if kind == "pause" else "session.resumed"
                await ws.send_json({"type": state, "server_wall": ps.engine.clock.now()})
            elif kind == "stop":
                manager.stop(ps)
            else:
                await ws.send_json({"type": "error", "message": f"unknown message type {kind!r}"})
    except WebSocketDisconnect:
        pass
    finally:
        ps.clients -= 1
        if ps.live is not None and ps.clients == 0:
            manager.stop(ps)  # the capture client went away: the live input has ended
        elif ps.clients == 0 and ps.status == "live":
            # nobody is watching any more: stop after a grace period so an abandoned tab does not
            # block the (single) pilot session slot until the clip ends
            asyncio.get_running_loop().call_later(ABANDON_GRACE_S, _stop_if_abandoned, manager, ps)
        sub.close()
        pump_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await pump_task
