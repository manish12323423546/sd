# 09 — Testing, Metrics and the Results Report

## 9.1 Test data

### A. Synthetic match clip (built first, used everywhere) — `scripts/make_synthetic_clip.py`
We generate our own test clip so we can build and measure without any third-party footage, and so we have **exact ground truth**.

- **Script:** `data/scripts/synthetic_match.yaml` — about 3 minutes of invented two-commentator football commentary (~45 lines). Each line has `speaker` (A/B), `text`, `emotion` (calm/neutral/excited/peak), and `gap_after_ms` (sometimes negative = overlap 200–400 ms, to test overlaps). Include: build-up play, a near miss, a goal ("GOAL! GOAL!"), single-word shouts, a speaker change mid-sentence, names from `config/glossary.txt`.
- **Voices for the source commentators:** two Kokoro voices that are **not** used as output voices (e.g. `am_michael` for A and `bf_emma` for B), so speaker ID is tested on voices different from the outputs. Apply emotion shaping from `08` so the source has real loudness/speed variation.
- **Crowd bed:** generated noise — brown noise at −28 dBFS, with amplitude swells, plus louder "roar" bursts (filtered noise, +10 dB, 2–4 s) placed right after `peak` lines. Optional: a CC0 crowd recording from Openverse/Freesound if the user adds one to `data/sfx/` (never download automatically).
- **Video:** `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=25` with a burned-in clock and the current line's speaker letter (helps judge sync by eye).
- **Outputs:** `data/clips/synthetic_match.mp4`, `data/clips/synthetic_match.truth.json` (every line: speaker, text, emotion, t_start, t_end), `config/enroll.synthetic.yaml` (first 8 s span of each speaker).
- Also generate a **long** version (20 min, by looping the script with variations) for the Pilot stability test: `synthetic_match_20min.mp4`.

### B. Real clip (later)
User places a cleared clip in `data/clips/` and optionally a `.truth.json` they correct by hand (Claude Code can produce a draft truth from an offline, non-live, high-quality pass with `large-v3` if time allows; mark it "draft").

## 9.2 Unit tests (fast, no models) — `tests/unit/`
- Feeder releases chunks on schedule (fake clock).
- Segmenter closes lines on pause / max length / burst (synthetic VAD probabilities).
- Online clustering assigns/creates speakers correctly (synthetic vectors).
- Emotion labels from given features; smoothing rule.
- Scheduler: overlap gap, catch-up speedup/drop/merge thresholds, drift slope.
- Mixer: ducking envelope shape, no clipping, correct placement in samples.
- Text normalisation: scores, numbers, filler removal.
- Record store: events published in order; checkpoint round-trip.

## 9.3 Integration tests (real models, `@pytest.mark.slow`) — `tests/integration/`
- Each provider on a 3 s sample: returns valid output, timing logged.
- End-to-end on a 30 s cut of the synthetic clip at `speed=1.0`: report produced, ≥ 80% lines have text, speaker accuracy ≥ 80%.

## 9.4 Metrics — `engine/metrics/compute.py`

| Metric | How |
|---|---|
| Delay per line | `times.tts_ready − t_end` (seconds). Also `play_at − t_end` (when it actually plays). |
| Delay p50 / p95 / max | over all non-dropped lines |
| Stage time p50/p95 | ASR, speaker, emotion, TTS, from stage stamps |
| Drift slope | linear regression of delay vs. `t_end`; report s/s and "delay after 10 min" extrapolation |
| WER | `jiwer.wer` of concatenated truth text vs. concatenated output text, both normalised (lowercase, no punctuation, numbers as words) |
| Speaker accuracy | map output speaker IDs to truth speakers by Hungarian matching on overlap time; accuracy = share of line-time with correct speaker |
| Emotion agreement | share of lines where output label equals truth label; also within-one-step agreement (calm/neutral/excited/peak ordered) |
| Line segmentation | output lines per truth line (≈1.0 is ideal); count of split words at boundaries |
| Coverage | share of truth speech time covered by an output voice line |
| Dropped/merged/speedup counts | from `schedule_action` |
| TTS duration ratio | TTS duration / original line duration, p50/p95 |
| Errors | count of lines with stage errors |

## 9.5 The results report — `outputs/<run>/report.md`
Sections (plain language first, numbers second):
1. **Summary** — 5 bullet verdict: does the engine work live? median delay, worst delay, speaker accuracy, word accuracy.
2. **Setup** — clip, duration, speed (must be 1.0 for reported numbers), source (ASR/captions), models + versions, VM CPU count, config snapshot hash.
3. **Delay** — table p50/p95/max, stage breakdown, chart `delay_over_time.png`, drift verdict.
4. **Accuracy** — WER, speaker accuracy, emotion agreement, segmentation stats.
5. **Voice quality** — automatic checks + the human listen-test checklist (empty boxes for the user to tick).
6. **What worked well / what needs improving** — written from the numbers.
7. **Recommendations** — next tuning steps; expected effect of paid providers (clearly marked as expectation).
8. **Files** — links to demo videos, record.json, lines.csv.

## 9.6 What to commit from runs
- Commit `report.md`, `metrics.json`, `lines.csv`, `delay_over_time.png`, and the demo MP4s **only if each is < 25 MB** (encode demos at 720p, CRF 28, AAC 128k).
- Never commit `tts/` folders or model files. Add them to `.gitignore`.
