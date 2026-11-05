# Pilot report — 2026-11-05

Pilot = the POC engine behind a FastAPI + WebSocket API and a React web player. All runs at speed 1.0 (live), 4 vCPU, no GPU, free models only (Whisper small.en, ECAPA, Kokoro-82M).

## Acceptance (docs/10 M10)

| Check | Target | Result | |
|---|---|---|---|
| Voice switch applies to the next unsynthesized line | ≥ 95 % | **56/56 = 100.0 %** | ✅ |
| 3-speaker accuracy (3-commentator clip) | ≥ 85 % | **96.0 %** | ✅ |
| 3-speaker accuracy (20-min clip) | ≥ 85 % | **93.5 %** | ✅ |
| 20-min run: crashes | 0 | **0** | ✅ |
| 20-min run: drift slope | ≈ 0 | **-0.00003 s/s** | ✅ |
| 20-min run: p95 delay | ≤ 6.0 s | **5.11 s** | ✅ |
| 20-min run: memory growth after the first minute | < 300 MB | **+162 MB (last 10 min +7.0 MB/min)** | ✅ |
| M8: line.complete / audio.ready coverage | ≥ 95 % | **100 % / 100 %** | ✅ |

## Sessions

| Session | Clip | Lines | Median / p95 / max delay | WER | Speakers | Switches |
|---|---|---|---|---|---|---|
| M8 — scripted client (`20261105-064041_9d7a25`) | synthetic_match.mp4 | 56 | 4.18 / 5.33 / 6.52 s | 10.9 % | 92.9 % | 0/0 |
| 3 commentators + switching (`20261105-064355_2b6dd7`) | synthetic_match_3spk.mp4 | 36 | 4.01 / 4.61 / 4.76 s | 8.6 % | 96.0 % | 13/13 |
| 20-minute stability (`20261105-073936_ad1b3c`) | synthetic_match_20min.mp4 | 396 | 3.93 / 5.11 / 7.33 s | 10.0 % | 93.5 % | 43/43 |

## Memory (20-minute run)

server RSS sampled every 30 s via /api/health: start 1862.7 MB (idle server) → first-minute trough 2835.4 MB → max 3120.9 MB, end 3115.2 MB. Retained memory (2-minute troughs, MB): [2835, 2857, 2873, 2955, 2925, 2935, 2940, 2905, 2991, 2997]. Growth after the first minute: +162 MB; slope over the last 10 minutes: +7.05 MB/min (≈ 0 means no leak). The saw-tooth is `malloc_trim` returning freed buffers every 60 s; the server runs with `MALLOC_ARENA_MAX=2` and warms the models with worst-case input sizes at start-up.

## Honest notes

- **Median delay** in the 20-minute run is 3.93 s. The product brief's Pilot aim (≤ 3.5 s median) is not reached on this 4-vCPU CPU-only machine; the POC analysis (`outputs/poc_summary.md`) shows why (ASR + TTS share the cores) and what would close it.
- WER on the 20-minute clip is higher than on the 3-minute clip because it rotates the invented player names through every loop (names are the hardest words for ASR).
- The web player was verified headless (Playwright): `outputs/ui/player.png`, `outputs/ui/session.webm` (no audio in browser recordings — listen via the POC demos).

## Files

- `m8_session/`, `three_commentators/`, `stability_20min/` — each with the session's `report.md`, `metrics.json`, `lines.csv`, `delay_over_time.png`, `record.json`, `ws_client.json`
- `stability_20min/server_rss.csv` — memory samples
