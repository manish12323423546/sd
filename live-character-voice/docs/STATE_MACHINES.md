# State machines

Every place in the app where something moves through states. **One is explicit** (the session
lifecycle, the one everything else depends on); the rest are listed with their states, where
they live, and what is still risky — in order of impact, so the next fix is obvious.

Rule for contributors and coding agents: **a session's status changes only through
`SessionManager._set_state` (app/sessions.py), which checks the table in `app/lifecycle.py`.**
Never assign `ps.status` directly. Clients decide what to show from `actions`, not from status.

## 1. Session lifecycle — explicit (app/lifecycle.py)

```
ready ──start──▶ live ──stop──▶ stopping ──engine drained──▶ ended
  │               │                 │
  │               └──── crash ──────┴──────────────────────▶ error
  └──stop / replaced (never started)──────────────────────▶ ended
```

| State | Meaning | Holds the one-session slot | Allowed actions |
|---|---|---|---|
| `ready` | created, waiting for `start` | yes | start, stop |
| `live` | engine running (`paused` may be true for recorded videos) | yes | pause *or* resume, stop, set_voice, merge_speakers, rename_speaker |
| `stopping` | draining queued lines, writing the report | no (a new session may start) | — |
| `ended` | finished | no | report (once written) |
| `error` | crashed (`error` says why) | no | report (once written) |

How each surface exposes it:
- **HTTP** `GET /api/sessions` (all sessions in this process) and `GET /api/sessions/{id}` →
  `status`, `paused`, `actions`, `owner` (viewer | capture | lab), `live_input`, `clients`.
  `POST /api/sessions/{id}/stop` is idempotent and returns the same object.
- **409 when busy** → `{"detail": {"code": "session_busy", "message", "session_id", "state", "actions"}}`.
  The Studio shows a **Stop that session** button from it (no text parsing).
- **/api/health** → `active_session`, `active_state`, `active_actions`.
- **WebSocket** `session.ready` carries `state`, `paused`, `actions`; a late joiner of a finished
  session immediately gets `session.ended` (with `state`, and `error` after a crash); `start` on a
  finished session answers `session.ended` instead of a fake `session.started`;
  `session.paused` / `session.resumed` go to **every** viewer and only when the state really
  changed; pause on live input answers an `error` instead of a pretend confirmation.
- **TypeScript** `SessionLifecycle`, `SESSION_STATES`, `ScheduleAction` in web/src/types/protocol.ts;
  `ApiError.detail` in web/src/net/api.ts.

"Busy" now has one meaning per question:
- `occupying()` — holds the slot (ready/live), stuck or not.
- `active()` — really blocks a new session (occupying and not stuck). Used by /api/health, key reload.
- `_stuck()` — can't or won't finish: unstarted, already done, paused or live input with nobody
  connected. Quality Lab runs (`owner="lab"`) are never stuck or "abandoned".
- `is_idle()` — safe for the auto-updater to restart: nothing live, nothing still writing its
  report, no Quality Lab run scoring, no pro voice being built.

Bugs this removed (each has a test in tests/unit/test_lifecycle.py / test_stuck_session.py):
a paused session whose tab closed blocked every new session forever; a replaced session could
be started again and run alongside the new one; a late joiner saw a finished session as live;
watching a Quality Lab run and leaving killed it after 15 s; saving keys during a session
returned an error although they were saved (now: saved, engines switch when it ends);
the auto-updater could restart mid-scoring or mid-clone; every live-input start waited 6 s for
audio that could not arrive while it waited (measured after the fix: 0.00 s); a crash showed
as a normal end in the viewer.

## 2. Inventory of the others (implicit), by impact

| # | Machine | States (literal values) | Where | Remaining risk | UX/DX/AX |
|---|---|---|---|---|---|
| 2 | Line lifecycle | `_status` pending/ready/skip; `schedule_action` none/fit/speedup/merged/noise/dropped; stage events line.created → asr/speaker/emotion_done → line.complete → tts.first/ready → line.scheduled → played | orchestrator.py, record/models.py, scheduler.py | `merged` means both "absorbed, silent" and "head line, voiced"; `dropped` decided in two places; "played" on the server means "scheduled"; a streamed line can fail after being scheduled | M/H/H |
| 3 | Extension state | background `mode` null/synced/overlay; hub `status`, `originalMode` full/crowd/off, `voicesMuted` | extension/background.js, hub.js, sidepanel.js, viewer.js | popup and side panel can disagree after a stream ends; side-panel Stop in Synced mode doesn't clear background mode; state lost when the service worker restarts | H/M/L |
| 4 | Live relay | `RelayStatus.state` connecting/live/ended/error, `t0`, voice lane | web/src/live/relay.ts (→ extension/lib/live-core.js) | never enters `error` itself; capture keeps running after the server ends | H/M/L |
| 5 | Speaker tracker | confidence high/low/new; enrolled; merges | engine/speakers/tracker.py | a line can be labelled with a speaker merged away in the same step; manual merge can drop an enrolled person; display names repeat after merges | M/H/M |
| 6 | Session clock | `t0` None = not started, `paused_at` = paused (SessionClock); MediaClock never pauses | engine/ingest/feeder.py, live.py | live media time drifts after an overflow drop (`dropped_s` not reported) | M/M/M |
| 7 | Quality Lab run | `stage` starting/playing/finishing/scoring/error; `partial` | app/lab.py | now ends in `error` (listed under `failed`) instead of "finishing" forever | M/M/H |
| 8 | Pro voice job | queued → read/speech/speaker/moods/build/test/train → done/error | engine/voices_pro.py | rebuild deletes the old voice before the new one succeeds; jobs lost on restart (UI keeps polling) | M/M/M |
| 9 | Keys / engines | engines.text {online, name, note, choice, deepgram}; asr choice auto/deepgram/groq/local | orchestrator.py, app/main.py | `connected` means "key present", not "works" | M/M/M |
| 10 | Client session store | idle/ready/live/ended/error + paused | web/src/store/session.ts, Player.tsx | no reconnect when the socket drops | M/M/L |
| 11 | Access gate | open / wrong / required | app/hosting.py, AccessGate.tsx | WS close 4401 shows as a generic connection error | M/L/M |
| 12 | Auto-update | disabled / waiting-for-idle / exit | app/hosting.py | state not exposed (only `commit`) | L/M/M |
| 13 | Live source | open/closed | engine/ingest/live.py | pushes after close ignored silently | L/L/L |

Next best steps, in order: (1) split `schedule_action` "merged" into `merged_into` (silent) and
`merged_head`, and stamp real `played` from the relay too; (2) make the extension's background the
single owner of run state (persisted in chrome.storage.session) and have relay errors reach it;
(3) return the final speaker id after merges in the tracker; (4) report `dropped_s` for live input.
