# Live streams (V4): any tab, any live stream

## Workflow

```
 live stream in a Chrome tab (YouTube, Twitch, a broadcaster's player, …)
        │  capture: Chrome extension (chrome.tabCapture)  — or —  Live capture page (getDisplayMedia)
        ▼
 browser relay (web/src/live/relay.ts, one AudioContext = one clock)
   ├─ AudioWorklet → mono 16 kHz PCM16, 100 ms chunks ──WebSocket──► engine (FastAPI, your Mac)
   └─ DelayNode(D) → original sound (ducked under voices) ──► speakers        │
                                                                              ▼
              VAD → phrases → Groq ASR + ECAPA speaker + prosody emotion → Fish voices (fit to
              the original length) → schedule at line start + D → audio.ready{play_at_media}
        ┌─────────────────────────────────────────────────────────────────────┘
        ▼
 relay fetches each voice and starts it at  t0 + play_at_media + D  (t0 = clock time of the
 first captured sample): voice and original line start together. Picture: DelayedVideo
 (MediaRecorder VP8 → Media Source Extensions) held back by the same D.
```

Media time = seconds of audio the engine has received, so no wall-clock sync is needed between
the browser and the engine: both count the same samples.

## Ways to connect a live stream (compared)

| Option | Works on | Picture sync | Install | Status |
|---|---|---|---|---|
| **Chrome extension — Synced window** | any tab | exact (viewer held back D s) | load unpacked | **built** |
| **Chrome extension — Live overlay** | any tab | voices ~1 line late, subtitles on the page | load unpacked | **built** |
| **Live capture page** (web app) | any tab/window, via Chrome's share picker | exact (synced) or live | none | **built** |
| Command line (`scripts/live_stream_client.py`) | any URL ffmpeg/yt-dlp can read (HLS, RTMP, SRT, YouTube/Twitch pages) | — (tests, reports) | ffmpeg (+ yt-dlp) | **built** |
| Re-broadcast with OBS | your own channel | exact | OBS | **workflow** (see below) |
| System-wide audio (any app, not just Chrome) | desktop players, TV apps | — | virtual audio device (BlackHole) + desktop helper | future |

Why a browser extension first: every live stream a viewer watches already plays in a tab;
`chrome.tabCapture` gives the tab's sound and picture without screen-recording prompts, and the
voices/ducking/delay all happen in the same audio clock. Capturing mutes the tab, which is what we
want: the relay plays the original back (delayed in synced mode, ducked under the voices).

Why "synced" by delaying the picture: a line can only be re-voiced after it has been said (ASR
needs the words), so a voice can never start with the line *live*. Holding picture + original sound
back D seconds (as TV broadcasts do) makes every voice start exactly with its line.

### Re-broadcast (streamers): OBS
1. Start the extension's **Synced window** on the source tab.
2. In OBS add **Window Capture** → the "Synced viewer" window, and **Application Audio Capture** →
   Chrome (Windows) or a BlackHole/Loopback device (macOS).
3. Stream to YouTube/Twitch as usual — viewers get picture, original and character voices in sync.

## Measured (synthetic_match.mp4 played as a live source, 3 min, Groq + Fish, D = 6 s)
| Path | Lines voiced | Felt delay p50 / p95 / max | On time | Notes |
|---|---|---|---|---|
| live ingest, Python client (`v4_live_ingest`) | 60 / 60 | 0.00 / 0.62 / 1.28 s | 85 % | voice files arrive p50 1.6 s before needed |
| Live capture page in Chromium, run 1 | 59 / 60 | 0.00 / 0.86 / 1.45 s | 85 % | ASR WER 6.5 %, spoken WER 7.8 % |
| Live capture page, run 2 (streamed lines) | 59 / 60 | 0.00 / 1.69 / 3.03 s | 80 % | 0 lines late in the browser |
| Extension Synced viewer (test source), 43 s | 14 / 15 | 0.0 / 0.5 s | – | picture exactly 6 s behind |
Run-to-run spread comes from Fish's response time. Not testable headless: Chrome's tab picker and
the extension's tabCapture permission click (both need a real user click); everything after the
capture (worklet, WebSocket, engine, playback, delay, subtitles) was exercised.
