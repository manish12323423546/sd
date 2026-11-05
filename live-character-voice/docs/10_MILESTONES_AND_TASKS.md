# 10 — Milestones and Tasks

Each milestone ends with: tests pass → acceptance check run → numbers written to `docs/BUILD_LOG.md` → commit + push → short report to the user → **stop and wait**.

---

## STAGE A — PROOF OF CONCEPT

### M0 — Environment and skeleton
- Run `check-tools`; record Python/Node/FFmpeg versions and CPU count in BUILD_LOG.
- Install system deps if missing: `ffmpeg espeak-ng libsndfile1 sox`.
- Create repo structure from `11_REPO_STRUCTURE_AND_CONVENTIONS.md`, `pyproject.toml` (uv or pip), `Makefile`, `.gitignore`, `config/*.yaml` from `06 §6.2` and `08 §8.2`, empty `docs/BUILD_LOG.md`, `THIRD_PARTY_LICENSES.md`.
- Install CPU torch from `https://download.pytorch.org/whl/cpu`.
- `python -m engine.cli check` prints: tools OK, network to huggingface.co OK/blocked.
- GitHub Actions CI: lint + unit tests (no model downloads).
- **Accept:** `make lint` and `make test` pass on an empty-but-wired codebase; `check` output pasted in the report. If Hugging Face is blocked, stop and tell the user the exact domains to add.

### M1 — Models + synthetic test clip
- `scripts/download_models.py`: fetch faster-whisper `small.en` + `base.en`, ECAPA, Kokoro; list Kokoro voices actually available; record licences in `THIRD_PARTY_LICENSES.md`.
- `scripts/bench_models.py`: time ASR, ECAPA, Kokoro on 3 s samples (10 runs each, p50/p95) → `outputs/bench.json`.
- `scripts/make_synthetic_clip.py` per `09 §9.1` (3-min + truth + enroll file).
- **Accept:** synthetic clip plays (ffprobe shows video + audio, correct duration); truth JSON valid; bench numbers in BUILD_LOG. Decide ASR model (`small.en` vs `base.en`) from bench: ASR p95 on 3 s must be ≤ 1.5 s.

### M2 — Ingest, live-speed feeder, VAD, segmenter, live record
- Implement `ingest/`, `segment/`, `record/` per `04 §1–2, §6` and `05`.
- CLI `poc --stop-after segment` writes `record.json` with lines (no text yet).
- **Accept:** on the synthetic clip at speed 1.0: segmented lines vs truth lines ratio 0.8–1.3; "GOAL!" burst lines detected; run takes clip duration ± 2 s (proves live speed).

### M3 — ASR + speaker ID
- Implement ASR provider, captions provider, ECAPA provider, online clustering, enrollment.
- Run ASR, speaker, (stub emotion) in parallel per line.
- **Accept:** WER ≤ 15% and speaker accuracy ≥ 85% on the synthetic clip (with and without enroll file — report both). Stage timings logged.

### M4 — Emotion
- Prosody features + labels + smoothing per `04 §5`.
- **Accept:** emotion within-one-step agreement ≥ 80%; exact agreement reported; `peak` lines detected for every truth `peak`.

### M5 — TTS + voices + emotion delivery
- Kokoro provider (per-language pipelines), text normalisation, style mapping (`08 §8.3`), worker pool, cache, previews.
- **Accept:** every complete line gets audio; `voices_only.wav` produced; TTS p95 for a 3 s line ≤ 1.6 s; no clipping.

### M6 — Scheduler + renderer
- Scheduler with fast mode, overlap gap, catch-up, drift check. Offline renderer for `demo_live.mp4`, `demo_synced.mp4`, `voices_only.wav`; optional `--separate` (Demucs) path.
- **Accept:** both demo files produced, durations match the clip, ducking audible in `demo_live.mp4` (verify with RMS of original track inside vs outside voice lines: ≥ 9 dB lower inside).

### M7 — Metrics + report → POC complete
- Metrics + `report.md` + chart per `09 §9.4–9.5`.
- Run the **full POC** on the synthetic clip at speed 1.0, three times; report all three runs and the median of each metric.
- **Accept (POC done):** median delay ≤ 4.0 s, p95 ≤ 7.0 s, no drift, WER ≤ 12%, speaker accuracy ≥ 90%, 0 crashes. If a target is missed, report honestly with the reason and the top 3 fixes; do not hide it.
- Commit demo files + report. Write the user a plain-language summary.

---

## STAGE B — PILOT VERSION

### M8 — Backend API + WebSocket sessions
- FastAPI app per `06 §6.4–6.5`; sessions reuse the engine; protocol per `05 §5.4`; static media with Range support; previews at startup.
- **Accept:** a scripted Python WS client runs a full session on the synthetic clip and receives `line.complete` + `audio.ready` for ≥ 95% of lines; delay numbers match the POC within 10%.

### M9 — Web player
- React app per `07`: Home, Player, Report; audio graph with ducking; scheduling by `play_at_media`; transcript; delay HUD; export CSV.
- **Accept:** Playwright smoke test passes; screenshot `outputs/ui/player.png` committed.

### M10 — Voice switching, 3 commentators, stability → Pilot complete
- `set_voice` end-to-end with cache reuse; `max_speakers=3`; synthetic 3-commentator clip (add speaker C to the script generator).
- 20-minute stability run (`synthetic_match_20min.mp4`) through the WS client at speed 1.0.
- **Accept (Pilot done):** voice switch applies to the next unsynthesized line in ≥ 95% of tests; 3-speaker accuracy ≥ 85%; 20-min run: 0 crashes, drift slope ≈ 0, p95 delay ≤ 6.0 s, memory growth < 300 MB. Final Pilot report in `outputs/pilot_<date>/report.md`.

---

## After the Pilot (not in this kit)
Real live feeds (RTMP/HLS ingest), synced viewing mode in the player, cleaner separation in real time, more speakers, accounts, multi-viewer scaling (Redis-backed record store, TTS cache shared per voice), mobile/TV apps, broadcaster integration, paid-provider swap-in. See `14_RISKS_AND_LIMITS.md`.
