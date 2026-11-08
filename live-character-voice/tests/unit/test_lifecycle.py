"""Session lifecycle (app/lifecycle.py) and how the manager, HTTP API and WebSocket use it.

No models are loaded: sessions use a tiny fake engine with a real RecordStore and SessionClock.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

os.environ["LCV_SKIP_MODELS"] = "1"  # routes only: no models are loaded
from fastapi.testclient import TestClient

from app import lifecycle as lc
from app import main
from app.lifecycle import State
from app.sessions import PilotSession, SessionBusyError, SessionManager
from engine.ingest.feeder import SessionClock
from engine.record.models import SessionRecord
from engine.record.store import RecordStore


class FakeEngine:
    def __init__(self) -> None:
        rec = SessionRecord(session_id="s", clip_path="x.mp4", mode="pilot", speed=1.0,
                            source="asr", started_at_iso="", config_snapshot={})  # fmt: skip
        self.store = RecordStore(rec)
        self.clock = SessionClock(1.0)
        self.view_delay = 0.0
        self.stopped = False

    def stop(self) -> None:
        self.stopped = True

    def metrics_snapshot(self) -> dict[str, float]:
        return {"lines": 0}


def _session(sid: str = "s1", owner: str = "viewer") -> PilotSession:
    cfg: Any = SimpleNamespace(speed=1.0, speaker=SimpleNamespace(max_speakers=2))
    ps = PilotSession(sid, Path(f"{sid}.mp4"), cfg, FakeEngine(), Path("/tmp"), use_enroll=False)  # type: ignore[arg-type]
    ps.owner = owner
    return ps


def _manager(*sessions: PilotSession) -> SessionManager:
    m = SessionManager.__new__(SessionManager)
    m.sessions = {s.session_id: s for s in sessions}
    m.load_log = []
    m.pending_reload = False
    return m


# ---- the table itself
def test_transition_table() -> None:
    assert lc.can("ready", "live") and lc.can("live", "stopping") and lc.can("stopping", "ended")
    assert not lc.can("ended", "live") and not lc.can("error", "ready")
    with pytest.raises(lc.InvalidTransition):
        lc.check(State.ENDED, State.LIVE)
    for terminal in lc.TERMINAL:
        assert not lc.TRANSITIONS[terminal]  # nothing leaves a terminal state


def test_allowed_actions() -> None:
    assert lc.allowed_actions("ready") == ["start", "stop"]
    live = lc.allowed_actions("live")
    assert "pause" in live and "resume" not in live and "stop" in live
    assert "resume" in lc.allowed_actions("live", paused=True)
    assert lc.allowed_actions("ended") == []
    assert lc.allowed_actions("ended", report_ready=True) == ["report"]
    assert lc.allowed_actions("stopping") == []


# ---- manager
def test_stop_unstarted_ends_and_tells_clients() -> None:
    ps = _session()
    m = _manager(ps)
    published: list[str] = []
    ps.engine.store.bus.publish = lambda name, **kw: published.append(name)  # type: ignore[method-assign]
    m.stop(ps)
    assert ps.status == State.ENDED and published == ["session.ended"]
    m.stop(ps)  # idempotent
    assert ps.status == State.ENDED


def test_ended_session_cannot_restart() -> None:
    """Regression: a replaced (ended) session came back as live when its client sent start."""
    ps = _session()
    m = _manager(ps)
    m.stop(ps)
    assert m.start(ps) is False and ps.status == State.ENDED and ps.task is None


def test_stopping_frees_the_slot() -> None:
    async def run() -> None:
        ps = _session()
        m = _manager(ps)
        m._set_state(ps, State.LIVE)
        ps.task = asyncio.get_running_loop().create_future()  # type: ignore[assignment]
        ps.clients = 1
        assert m.active() is ps
        m.stop(ps)
        assert ps.status == State.STOPPING and ps.engine.stopped  # type: ignore[attr-defined]
        assert m.active() is None and m.occupying() is None
        assert not m.is_idle()  # still writing its report: don't restart the server now

    asyncio.run(run())


def test_busy_error_is_structured() -> None:
    async def run() -> None:
        ps = _session()
        m = _manager(ps)
        m._set_state(ps, State.LIVE)
        ps.task = asyncio.get_running_loop().create_future()  # type: ignore[assignment]
        ps.clients = 1
        with pytest.raises(SessionBusyError) as e:
            m._replace_stuck()
        d = e.value.detail()
        assert d["code"] == "session_busy" and d["session_id"] == "s1" and d["state"] == "live"
        assert "stop" in d["actions"]

    asyncio.run(run())


def test_impossible_transition_raises() -> None:
    ps = _session()
    m = _manager(ps)
    m.stop(ps)  # → ended
    with pytest.raises(lc.InvalidTransition):
        m._set_state(ps, State.LIVE)


# ---- HTTP + WebSocket
@pytest.fixture()
def client() -> TestClient:
    with TestClient(main.app) as c:
        yield c  # type: ignore[misc]


def test_http_status_has_state_and_actions(client: TestClient) -> None:
    ps = _session("http1")
    main.manager.sessions[ps.session_id] = ps
    try:
        r = client.get("/api/sessions/http1").json()
        assert r["status"] == "ready" and r["actions"] == ["start", "stop"] and r["paused"] is False
        assert any(s["session_id"] == "http1" for s in client.get("/api/sessions").json())
        r = client.post("/api/sessions/http1/stop").json()
        assert r["status"] == "ended"
        assert client.post("/api/sessions/http1/stop").json()["status"] == "ended"  # idempotent
    finally:
        main.manager.sessions.pop("http1", None)


def test_late_joiner_of_ended_session_is_told(client: TestClient) -> None:
    ps = _session("ws1")
    main.manager.sessions[ps.session_id] = ps
    try:
        main.manager.stop(ps)
        with client.websocket_connect("/ws/sessions/ws1") as ws:
            ready = ws.receive_json()
            assert ready["type"] == "session.ready" and ready["state"] == "ended"
            assert ws.receive_json()["type"] == "session.ended"
            ws.send_json({"type": "start"})  # can't restart a finished session
            assert ws.receive_json()["type"] == "session.ended"
    finally:
        main.manager.sessions.pop("ws1", None)
