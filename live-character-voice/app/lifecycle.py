"""Session lifecycle: the one explicit state machine every part of the server uses.

    ready ──start──▶ live ──stop──▶ stopping ──engine drained──▶ ended
      │               │                 │
      │               └──── crash ──────┴──────────────────────▶ error
      └──stop / replaced (never started)──────────────────────▶ ended

* `ready`    created, waiting for a viewer/capture client/lab to send `start`.
* `live`     the engine is running (it may be paused by the viewer: see `paused`).
* `stopping` stop was requested; the engine is draining queued lines and writing the report.
             It no longer holds the one-session slot, so a new session can start.
* `ended`    finished normally (report written when `report_ready`).
* `error`    the engine crashed (`PilotSession.error` says why). Terminal.

Values are plain strings on the wire (`"ready"`, `"live"`, …) so existing clients keep working.
`allowed_actions()` tells a UI or an agent exactly what it may do next. See
docs/STATE_MACHINES.md for every other state machine in the app.
"""

from __future__ import annotations

from enum import StrEnum


class State(StrEnum):  # str(State.LIVE) == "live"; compares equal to the plain string
    READY = "ready"
    LIVE = "live"
    STOPPING = "stopping"
    ENDED = "ended"
    ERROR = "error"


TRANSITIONS: dict[State, frozenset[State]] = {
    State.READY: frozenset({State.LIVE, State.ENDED}),
    State.LIVE: frozenset({State.STOPPING, State.ENDED, State.ERROR}),
    State.STOPPING: frozenset({State.ENDED, State.ERROR}),
    State.ENDED: frozenset(),
    State.ERROR: frozenset(),
}

TERMINAL = frozenset({State.ENDED, State.ERROR})

# What a client may do in each state (HTTP: POST /api/sessions/{id}/stop; WS: the message types).
ACTIONS: dict[State, tuple[str, ...]] = {
    State.READY: ("start", "stop"),
    State.LIVE: ("pause", "resume", "stop", "set_voice", "merge_speakers", "rename_speaker"),
    State.STOPPING: (),
    State.ENDED: ("report",),
    State.ERROR: ("report",),
}


class InvalidTransition(RuntimeError):
    pass


def can(src: State | str, dst: State | str) -> bool:
    return State(dst) in TRANSITIONS[State(src)]


def check(src: State | str, dst: State | str) -> State:
    """The new state, or InvalidTransition (never a silent, impossible jump)."""
    if not can(src, dst):
        raise InvalidTransition(f"session cannot go from {State(src).value} to {State(dst).value}")
    return State(dst)


def allowed_actions(
    state: State | str, paused: bool = False, report_ready: bool = False
) -> list[str]:
    acts = list(ACTIONS[State(state)])
    if State(state) == State.LIVE:
        acts.remove("resume" if not paused else "pause")
    if "report" in acts and not report_ready:
        acts.remove("report")
    return acts
