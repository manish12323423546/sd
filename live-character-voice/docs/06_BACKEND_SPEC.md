# 06 — Backend Spec (engine + API)

## 6.1 Packages

```
engine/                     # pure pipeline, no web code
  config.py                 # load + validate config/engine.yaml (pydantic)
  orchestrator.py           # wires stages, owns the event loop tasks for one session
  ingest/decode.py          # ffmpeg decode → np.float32 16k mono
  ingest/feeder.py          # live-speed chunk release
  segment/vad.py            # Silero VAD wrapper (streaming)
  segment/segmenter.py      # line closing rules (pause, max_len, burst, speaker_change)
  providers/base.py         # Protocols: ASRProvider, SpeakerProvider, EmotionProvider, TTSProvider
  providers/registry.py     # pick provider by name from config
  providers/free/asr_faster_whisper.py
  providers/free/asr_captions.py
  providers/free/speaker_ecapa.py
  providers/free/speaker_resemblyzer.py   # fallback
  providers/free/emotion_prosody.py
  providers/free/tts_kokoro.py
  providers/free/tts_piper.py             # optional fallback
  speakers/online_cluster.py
  record/models.py
  record/store.py
  tts/worker.py
  tts/text_normalize.py
  tts/style.py              # emotion → DeliveryStyle
  schedule/scheduler.py
  render/mixer.py           # numpy mixing, ducking envelopes
  render/mux.py             # ffmpeg mux
  metrics/compute.py
  metrics/report.py         # report.md + chart
  cli.py                    # `python -m engine.cli ...`
app/                        # Pilot web API
  main.py                   # FastAPI app, static media, routes
  sessions.py               # SessionManager: create/run/stop sessions
  ws.py                     # WebSocket handler (protocol in 05)
  schemas.py                # API request/response models
scripts/
  make_synthetic_clip.py    # test clip + ground truth (see 09)
  bench_models.py           # per-model speed benchmark on this VM
  download_models.py        # pre-download all models, print sizes + licences
config/
  engine.yaml
  voices.yaml
  glossary.txt
  emotion_keywords.yaml
  enroll.example.yaml
tests/
  unit/ …                   # fast, no model downloads (use fakes)
  integration/ …            # use real models, marked @pytest.mark.slow
```

## 6.2 Config — `config/engine.yaml` (initial values)

```yaml
mode: poc                # poc | pilot
source: asr              # asr | captions
speed: 1.0               # 1.0 = honest live speed
audio:
  analysis_sr: 16000
  chunk_ms: 500
vad:
  threshold: 0.5
segment:
  end_silence_ms: 350
  max_line_s: 6.0
  min_line_ms: 250
  pad_ms: 120
  burst_db: 10
  split_sim: 0.45
asr:
  provider: faster_whisper
  model: small.en
  compute_type: int8
  cpu_threads: 4
  beam_size: 1
  fallback_model: base.en
speaker:
  provider: ecapa
  max_speakers: 2         # 3 for pilot
  assign_sim: 0.55
  ema_alpha: 0.1
  enroll_file: null
emotion:
  provider: prosody
  weights: {loudness: 0.45, pitch: 0.30, rate: 0.15, text: 0.10}
  thresholds: {calm: -0.5, excited: 0.8, peak: 1.8}
tts:
  provider: kokoro
  workers: 2
  lang_code: a
  voice_map: {S1: bm_george, S2: am_adam, S3: af_bella}
schedule:
  mode: fast
  gap_ms: 80
  lag_soft_s: 3.5
  lag_hard_s: 6.0
  max_speedup: 1.15
render:
  out_sr: 48000
  duck_gain: 0.25
  duck_ramp_ms: 80
  voice_gain_db: 0.0
```

## 6.3 CLI — `engine/cli.py`

```
python -m engine.cli check            # versions, CPU count, ffmpeg, espeak, model cache, network to HF
python -m engine.cli download-models  # pre-fetch all models
python -m engine.cli bench            # time each model on a 3 s sample; writes outputs/bench.json
python -m engine.cli poc --clip data/clips/synthetic_match.mp4 \
      [--truth data/clips/synthetic_match.truth.json] [--enroll config/enroll.yaml] \
      [--speakers 2] [--voices S1=bm_george,S2=am_adam] [--source asr|captions] \
      [--captions file.vtt] [--speed 1.0] [--separate] [--out outputs/]
python -m engine.cli report --run outputs/<run_id>   # recompute metrics + report from record.json
```

## 6.4 HTTP API (Pilot) — `app/main.py`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{"ok": true, "models_loaded": {...}}` |
| GET | `/api/voices` | list of approved voices: `voice_id, name, description, lang, preview_url` |
| GET | `/api/clips` | clips found in `data/clips/` with duration |
| POST | `/api/clips` | upload a clip (multipart, max 2 GB, mp4/mkv/mov) |
| POST | `/api/sessions` | body `{clip_id, max_speakers, voice_map?}` → `{session_id, ws_url}` |
| GET | `/api/sessions/{id}` | session status + speakers |
| GET | `/api/sessions/{id}/record` | full record JSON |
| GET | `/api/sessions/{id}/lines.csv` | delay log export |
| GET | `/api/sessions/{id}/report` | report.md rendered as HTML |
| WS | `/ws/sessions/{id}` | live protocol (05 §5.4) |
| GET | `/media/clips/{file}` | static clip (supports HTTP Range for seeking) |
| GET | `/media/tts/{session}/{file}` | generated voice files |
| GET | `/media/previews/{voice}.wav` | 3-second voice previews (generated at startup) |

## 6.5 Session lifecycle (Pilot)
1. `POST /api/sessions` → `SessionManager.create()` builds a `RecordStore` + orchestrator (models are loaded once per process and shared).
2. Client connects WS → server sends `session.ready`.
3. Client sends `start` → server sets `t0`, sends `session.started`, starts the feeder.
4. Pipeline runs; server pushes `speaker.new`, `line.complete`, `audio.ready`, `metrics`.
5. End of clip or `stop` → final checkpoint, metrics, report, `session.ended`.
6. Only **one active session at a time** in the Pilot (CPU budget). A second `POST /api/sessions` while one runs returns HTTP 409 with a clear message.

## 6.6 Models loading
- Load all models at process start (`app` lifespan / CLI start) and warm each with a 1 s dummy call so the first real line is not slow.
- Print load times and memory use to the log.

## 6.7 Error handling
- Any stage exception on a line → mark the line `error` with the message, publish `session.warning`, continue with the next line. A single bad line must never stop the session.
- Model download failure → stop with a clear message naming the blocked domain (see `00_START_HERE.md` step 4).
- FFmpeg missing → stop with install instruction.

## 6.8 Logging
Structured JSON logs (`run.log`), one event per stage per line with `line_id`, stage, duration_ms. This is the raw data behind the delay report.
