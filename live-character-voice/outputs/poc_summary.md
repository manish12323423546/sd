# POC results — three live runs (speed 1.0)

Clip: `data/clips/synthetic_match.mp4` (178.4 s, 62 truth lines, two commentators, crowd bed). Same config for all three runs (config hash `debafa0274a3`), ASR `small.en` int8, Kokoro-82M, 4 vCPU, no GPU. Runs folders:

- `outputs/20261105-061712_synthetic_match_final1`
- `outputs/20261105-062141_synthetic_match_final2`
- `outputs/20261105-062601_synthetic_match_final3`

| Measure | Target | Run 1 | Run 2 | Run 3 | **Median** | Verdict |
|---|---|---|---|---|---|---|
| Median delay (line end → voice ready) | ≤ 4.0 s | 4.26 | 4.14 | 4.14 | **4.14** | ❌ |
| p95 delay | ≤ 7.0 s | 5.46 | 5.42 | 5.41 | **5.42** | ✅ |
| Max delay | — | 6.26 | 6.50 | 6.22 | **6.26** | — |
| Delay until the voice actually plays (p50) | — | 5.29 | 5.26 | 5.26 | **5.26** | — |
| Drift slope | ≈ 0 (|s| ≤ 0.02) | -0.0002 | -0.0015 | -0.0009 | **-0.0009** | ✅ |
| Word error rate | ≤ 12 % | 10.9 % | 10.9 % | 10.9 % | **10.9 %** | ✅ |
| Speaker accuracy (time) | ≥ 90 % | 92.9 % | 92.9 % | 92.9 % | **92.9 %** | ✅ |
| Emotion within one step | ≥ 80 % | 96.8 % | 96.8 % | 96.8 % | **96.8 %** | ✅ |
| Emotion exact | — | 59.7 % | 59.7 % | 59.7 % | **59.7 %** | — |
| Peak moments labelled peak | all | 7 | 7 | 7 | **7** | ❌ |
| Coverage (truth speech re-voiced) | — | 98.5 % | 98.5 % | 98.5 % | **98.5 %** | — |
| Ducking depth | ≥ 9 dB | 12.04 | 12.04 | 12.04 | **12.04** | ✅ |
| ASR stage p95 | ≤ 1.5 s (budget) | 3.19 | 2.80 | 2.75 | **2.80** | ❌ |
| TTS stage p95 | ≤ 1.6 s (M5) | 3.23 | 3.34 | 3.28 | **3.28** | ❌ |
| Crashes | 0 | 0 | 0 | 0 | **0** | ✅ |

## Verdict

- **The engine works live.** All three runs processed the clip at real speed with no look-ahead,
  re-voiced 55 of 56 detected lines (1 neutral filler dropped by the catch-up rule), kept the delay
  flat (no drift) and never crashed.
- **Accuracy targets are met:** word error rate 10.9 %, speaker accuracy 92.9 %, emotion within one
  step 96.8 %.
- **Median delay misses the 4.0 s target by 0.14 s** (4.14 s; p95 5.4 s is well inside 7.0 s).
  The CPU is the limit: on 4 vCPUs Whisper `small.en` and Kokoro share the cores (ASR busy ~95 s
  and TTS ~115 s of the 178 s clip, overlapping ~50 s), so each runs ~1.5–2.5× slower than alone.
- **Peak moments:** 7 of 10 labelled `peak`; the 3 misses are peaks merged into a longer line with
  calmer speech (segmentation), see BUILD_LOG M4.

## What was tried to close the delay gap (all measured live, see docs/BUILD_LOG.md M7)

| Change | Median delay | WER | Kept? |
|---|---|---|---|
| Baseline (4 ASR + 4 torch threads, expensive speaker-split check) | 4.09 s | 10.9 % | — |
| 2 + 2 threads | 4.68 s | 10.9 % | no (confounded by an npm install; isolated bench +17 % throughput) |
| ASR `base.en` | **3.54 s** | 19.8 % | no — WER fails |
| One priority "compute lane" for ASR + TTS | 8.59 s | 11.4 % | no — CPU under-used, queues grow |
| Incremental speaker-split embeddings (was 30–60 % CPU on long lines) | 4.25 s | 10.9 % | yes |
| Feeder chunks 500 → 250 ms (earlier end-of-line detection) | 4.14 s (final) | 10.9 % | yes |
| Kokoro through ONNX Runtime (fp32 / int8) | bench only: −15 % / ±0 vs torch at 2 threads | — | no (optional provider) |
| ASR `distil-small.en` | 5.59 s (hallucinated) | 137 % / 16–17 % without prompt | no |

## Top 3 fixes for the remaining 0.14 s (ordered by expected effect)

1. **Streaming TTS playback:** start a line as soon as its first sentence is synthesized (Kokoro is
   2–3× faster than real time when not contended). Expected −0.5…−1.0 s on multi-sentence lines.
2. **A bigger CPU or a small GPU** (8 vCPU removes most ASR/TTS contention; expected ≈ 2.5–3 s
   median from the isolated stage times 0.5 + 1.1 + 0.8 s). Paid option, see docs/12.
3. **Paid streaming ASR with end-of-turn detection** (e.g. Deepgram Flux, docs/12) removes the ASR
   stage from this CPU entirely — expectation, not measured.

