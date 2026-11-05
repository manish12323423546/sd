# 02 — Architecture

## Big picture

```
                 ┌──────────────────────────────────────────────────────────────┐
                 │                         ENGINE (Python)                       │
 clip.mp4 ──►  [1 Ingest + Live-speed Feeder] ──► audio chunks (16 kHz mono, 0.5 s)
                 │            │                                                  │
                 │            ▼                                                  │
                 │   [2 VAD + Line Segmenter] ── decides when a "line" is ready  │
                 │            │  (line audio + media start/end time)             │
                 │            ▼                                                  │
                 │   [3 ASR]  ──► text + word times                             │
                 │   [4 Speaker ID] ──► speaker_id + confidence                  │
                 │   [5 Emotion] ──► emotion label + intensity                   │
                 │            │      (3,4,5 run in parallel per line)            │
                 │            ▼                                                  │
                 │   ┌──────────────────────────────┐                            │
                 │   │   6 LIVE RECORD (in memory)  │◄── every stage writes here │
                 │   │   lines, speakers, timings   │──► event bus (pub/sub)     │
                 │   └──────────────────────────────┘                            │
                 │            │ line.complete event                              │
                 │            ▼                                                  │
                 │   [7 TTS Worker] ── voice for that speaker + emotion style    │
                 │            │  tts audio + duration                            │
                 │            ▼                                                  │
                 │   [8 Scheduler] ── play time, overlap + catch-up policy       │
                 │            │                                                  │
                 │     ┌──────┴────────┐                                         │
                 │     ▼               ▼                                         │
                 │ [9a Offline Renderer]  [9b Live Out: WebSocket to player]     │
                 │  demo_live.mp4         (Pilot only)                           │
                 │  demo_synced.mp4                                              │
                 │            │                                                  │
                 │   [10 Metrics + Report] ◄── reads the live record             │
                 └──────────────────────────────────────────────────────────────┘
                                         │ WebSocket + HTTP
                                         ▼
                 ┌──────────────────────────────────────────────────────────────┐
                 │                 PILOT PLAYER (React + Web Audio)             │
                 │  video element ─► gain (ducking) ─► speakers                 │
                 │  TTS buffers   ─► gain (voice)   ─► speakers                 │
                 │  per-commentator voice selector, live transcript, delay HUD  │
                 └──────────────────────────────────────────────────────────────┘
```

## Two clocks (the most important idea in this system)

1. **Media time** — seconds from the start of the clip. Every line stores `t_start` and `t_end` in media time. This is where the line *belongs*.
2. **Wall time** — the real clock (`time.monotonic()`). Every stage stamps when it finished. This is how we measure *delay*.

Because the feeder plays the clip at live speed, media time and wall time advance together:
`wall_time_of(media_t) = session_t0_wall + media_t`

**Delay of a line** = `tts_ready_wall − wall_time_of(line.t_end)`
(how long after the commentator *finished* the line the new voice was ready to play).

## Live-speed rule (no cheating)
The engine may only see audio up to the current wall time. The feeder releases 0.5 s chunks exactly when they would arrive in a real broadcast. No stage may read ahead in the file. This is what makes the POC numbers honest.

## Concurrency model
- One `asyncio` event loop in the engine process.
- CPU-heavy model calls (ASR, speaker embedding, TTS) run in a `concurrent.futures.ThreadPoolExecutor` (models release the GIL in native code) or a `ProcessPoolExecutor` when profiling shows the GIL is a bottleneck.
- Per-line work: ASR, speaker ID and emotion run **concurrently** for the same line; TTS starts when all three are done.
- Back-pressure: if the TTS queue holds more than `max_tts_backlog_s` seconds of audio, the scheduler applies the catch-up policy (see `04_PIPELINE_SPEC.md` §8).

## Provider interfaces (swappable)
Each AI stage is a Python `Protocol` in `engine/providers/base.py`:

```python
class ASRProvider(Protocol):
    def transcribe(self, audio: np.ndarray, sr: int) -> ASRResult: ...

class SpeakerProvider(Protocol):
    def embed(self, audio: np.ndarray, sr: int) -> np.ndarray: ...

class EmotionProvider(Protocol):
    def analyze(self, audio: np.ndarray, sr: int, text: str) -> EmotionResult: ...

class TTSProvider(Protocol):
    def voices(self) -> list[VoiceInfo]: ...
    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult: ...
```

Free implementations live in `engine/providers/free/`. Paid ones (later) go in `engine/providers/paid/`. The active provider for each stage is chosen in `config/engine.yaml`. Nothing outside `providers/` imports a model library directly.

## Where data lives
| Data | Where | Why |
|---|---|---|
| Live record (lines, speakers, timings) | In-process memory (`engine/record/store.py`) | Every stage must read/write within milliseconds. A database round-trip is too slow and unnecessary for one session. |
| Event bus | In-process `asyncio` pub/sub | Stages react to "line.created / line.asr_done / line.complete / tts.ready" instantly. |
| Session snapshot | `outputs/<run>/record.json` written at the end (and every 30 s as a checkpoint) | For the report and debugging. |
| Generated voice audio | `outputs/<run>/tts/<line_id>_<voice>.wav` | Served to the player; reused if the same line+voice is requested again. |
| Model weights | `~/.cache/huggingface`, `~/.cache/torch` | Never committed. |

Redis (pre-installed on the VM) is **not** used in A or B. It is the planned upgrade when the product runs many sessions across processes. Keep the `RecordStore` interface so a Redis-backed store can drop in later.

## Process layout
- **Stage A (POC):** one CLI process: `python -m engine.cli poc --clip ...`
- **Stage B (Pilot):** one FastAPI process (`uvicorn app.main:app`) that owns sessions; each session runs the same engine pipeline as an asyncio task. The React dev server (Vite) runs alongside and proxies `/api` and `/ws` to FastAPI.
