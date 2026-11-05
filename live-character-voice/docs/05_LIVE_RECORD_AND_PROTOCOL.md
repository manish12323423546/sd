# 05 — Live Record, Data Shapes, and Protocol

## 5.1 Live record (pydantic models) — `engine/record/models.py`

```python
from enum import Enum
from pydantic import BaseModel, Field

class Emotion(str, Enum):
    calm = "calm"; neutral = "neutral"; excited = "excited"; peak = "peak"

class Speaker(BaseModel):
    speaker_id: str                 # "S1" or enrolled name
    display_name: str               # "Commentator 1" or enrolled name
    color: str                      # hex for UI
    centroid_n: int = 0             # how many lines updated the centroid
    voice_id: str | None = None     # current voice for this speaker

class StageTimes(BaseModel):        # wall-clock seconds since session t0
    created: float | None = None    # line closed by segmenter
    asr_done: float | None = None
    speaker_done: float | None = None
    emotion_done: float | None = None
    complete: float | None = None   # all three present
    tts_start: float | None = None
    tts_ready: float | None = None
    play_at: float | None = None    # scheduled playback (wall)
    played: float | None = None     # Pilot: browser confirms playback start

class Line(BaseModel):
    line_id: str                    # "L000123"
    t_start: float                  # media seconds
    t_end: float                    # media seconds
    close_reason: str               # pause | max_len | burst | speaker_change | end
    text: str | None = None
    words: list[tuple[str, float, float, float]] = []
    asr_conf: float | None = None
    speaker_id: str | None = None
    speaker_sim: float | None = None
    speaker_conf: str | None = None # high | low
    emotion: Emotion | None = None
    arousal: float | None = None
    features: dict[str, float] = {}
    voice_id: str | None = None
    tts_path: str | None = None
    tts_duration: float | None = None
    schedule_action: str = "none"   # none | speedup | dropped | merged
    times: StageTimes = Field(default_factory=StageTimes)

    @property
    def delay_ready(self) -> float | None:   # seconds after the line ended
        return None if self.times.tts_ready is None else self.times.tts_ready - self.t_end

class SessionRecord(BaseModel):
    session_id: str
    clip_path: str
    mode: str                       # poc | pilot
    speed: float                    # 1.0 for honest runs
    source: str                     # asr | captions
    started_at_iso: str
    config_snapshot: dict
    speakers: dict[str, Speaker] = {}
    lines: list[Line] = []
    warnings: list[str] = []
```

Note: since media time and wall time advance together at speed 1.0, `wall_time_of(t) == t` when wall times are stored as "seconds since t0". This keeps every delay a simple subtraction.

## 5.2 Record store API — `engine/record/store.py`

```python
class RecordStore:
    def add_line(self, line: Line) -> None
    def update_line(self, line_id: str, **fields) -> Line        # publishes line.updated
    def get(self, line_id: str) -> Line
    def lines_between(self, t_a: float, t_b: float) -> list[Line]
    def last_n(self, speaker_id: str, n: int) -> list[Line]
    def upsert_speaker(self, sp: Speaker) -> None
    def snapshot(self) -> SessionRecord
    def checkpoint(self, path: Path) -> None
    def subscribe(self, event: str) -> AsyncIterator[Event]
```

Events: `line.created`, `line.asr_done`, `line.speaker_done`, `line.emotion_done`, `line.complete`, `tts.ready`, `line.scheduled`, `speaker.new`, `session.warning`, `session.ended`.

## 5.3 Files written per run — `outputs/<run_id>/`

```
record.json          full SessionRecord
lines.csv            one row per line: ids, times, text, speaker, emotion, all stage times, delay
metrics.json         computed metrics (see 09)
report.md            human-readable results report
delay_over_time.png  chart
demo_live.mp4        (POC)
demo_synced.mp4      (POC)
voices_only.wav      (POC)
tts/                 generated line audio (not committed; regenerated on demand)
run.log              structured log
```

`run_id` format: `YYYYMMDD-HHMMSS_<clipname>`.

## 5.4 WebSocket protocol (Pilot) — `ws://<host>/ws/sessions/{session_id}`

All messages are JSON with a `type` field. Times: `media` = clip seconds; `wall` = seconds since session t0 on the server.

**Server → client**
```jsonc
{ "type": "session.ready", "session_id": "...", "media_url": "/media/clips/match1.mp4",
  "speakers_max": 3, "voices": [ {"voice_id":"bm_george","name":"The Veteran","preview_url":"/media/previews/bm_george.wav"} ] }

{ "type": "session.started", "server_wall": 0.0 }                  // client starts video at this moment

{ "type": "speaker.new", "speaker": {"speaker_id":"S1","display_name":"Commentator 1","color":"#4FA3FF","voice_id":"bm_george"} }

{ "type": "line.complete", "line": { "line_id":"L000042","t_start":61.2,"t_end":64.0,
  "text":"And he's through on goal!","speaker_id":"S1","emotion":"peak","arousal":2.1 } }

{ "type": "audio.ready", "line_id":"L000042","voice_id":"bm_george",
  "url":"/media/tts/<session>/L000042_bm_george_<hash>.wav",
  "duration":2.3, "play_at_media":66.1, "schedule_action":"none",
  "delay_ready":2.1 }

{ "type": "metrics", "p50_delay":2.2, "p95_delay":3.9, "last_delay":2.1,
  "drift_slope":0.001, "lines":42, "dropped":0 }                    // every 5 s

{ "type": "warning", "message":"Delay above 6 s, catch-up active" }
{ "type": "session.ended", "report_url":"/api/sessions/<id>/report" }
```

**Client → server**
```jsonc
{ "type": "start" }                                                  // begin live-speed playback
{ "type": "set_voice", "speaker_id":"S1", "voice_id":"am_adam" }     // applies to lines not yet synthesized
{ "type": "played", "line_id":"L000042", "client_media_time":66.12 } // client confirms playback
{ "type": "stop" }
{ "type": "ping", "t": 123.4 }                                       // server replies { "type":"pong", "t":123.4 }
```

**Voice switch rule:** lines already synthesized keep their voice; any line whose TTS has not started uses the new voice. If the viewer switches back to a voice used earlier, cached audio is reused.

**Clock sync rule:** the client measures round-trip with `ping/pong` at start and every 10 s, estimates server wall time, and keeps the video at `media_time ≈ server_wall_now` (live). If the video drifts by > 300 ms, nudge `playbackRate` (0.97–1.03) until back in sync; if > 2 s, seek.
