"""A paused session whose viewers left must stop (it used to wait forever and block new ones)."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.sessions import SessionManager
from engine.ingest.feeder import SessionClock
from engine.orchestrator import Session


def test_stop_resumes_a_paused_clock() -> None:
    async def run() -> None:
        clock = SessionClock(1.0)
        clock.start()
        clock.pause()
        fake = SimpleNamespace(_stop=asyncio.Event(), clock=clock, live=None)
        Session.stop(fake)  # type: ignore[arg-type]
        assert fake._stop.is_set() and not clock.paused
        await asyncio.wait_for(clock.sleep_until(0.0), 1.0)  # no longer blocks

    asyncio.run(run())


def _ps(**kw: object) -> SimpleNamespace:
    base = dict(status="live", task=None, clients=0, live=None,
                engine=SimpleNamespace(clock=SimpleNamespace(paused=False)))  # fmt: skip
    base.update(kw)
    return SimpleNamespace(**base)


def test_stuck_rules() -> None:
    running = SimpleNamespace(done=lambda: False)
    assert SessionManager._stuck(_ps(status="ready"))  # type: ignore[arg-type]
    assert SessionManager._stuck(_ps(task=SimpleNamespace(done=lambda: True)))  # type: ignore[arg-type]
    paused = SimpleNamespace(clock=SimpleNamespace(paused=True))
    assert SessionManager._stuck(_ps(task=running, engine=paused))  # type: ignore[arg-type]
    # a lab test runs with no viewers and is not paused: never replaced
    assert not SessionManager._stuck(_ps(task=running))  # type: ignore[arg-type]
    # someone is watching a paused session: keep it
    assert not SessionManager._stuck(_ps(task=running, engine=paused, clients=1))  # type: ignore[arg-type]
