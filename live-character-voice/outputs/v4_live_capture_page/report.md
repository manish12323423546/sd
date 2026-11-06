# Results report — 20261106-084107_live_3fc31a

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 60 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; picture held back 6 s (synced mode)): **0.00 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **0.86 s** (target ≤ 7.0 s) ✅, max 1.45 s; drift 0.0053 s/s ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `live/3c940dea-a415-448c-97da-5d96f56907b8` (178.00 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 1.4, 'speaker': 1.26, 'tts': 5.15, 'warmup': 12.5} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `b1955ce343fd` |
| Wall time | 178.31 s (live part 178.2 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 0.00 | 0.86 | 1.45 | 60 |
| Line end → voice plays | 3.60 | 5.59 | 5.87 | 60 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.49 | 0.63 | end of speech → line closed (pause detection) |
| asr | 0.51 | 3.12 | line closed → text ready |
| speaker | 0.20 | 0.48 | line closed → speaker known |
| emotion | 0.51 | 3.12 | line closed → emotion known (needs text) |
| complete | 0.51 | 3.14 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.81 | 1.01 | TTS start → first streamed audio |
| tts | 2.07 | 2.71 | TTS start → audio complete |
| schedule_wait | 0.26 | 3.54 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0053 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 5.07 s.

Schedule actions: {'fit': 42, 'none': 18, 'noise': 1}. Lines with errors: 0.

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.95, p95 1.76; lines over 1.6× (voice too slow to keep up): 4
- Files with clipping: 0 / 60 (max peak -4.43 dBFS)
- Files with an internal silence > 400 ms: 0

Human listen-test (open `voices_only.wav` and `demo_live.mp4`, tick each box):

- [ ] Voices sound natural (no robotic or metallic artefacts)
- [ ] Excited / peak moments sound more energetic than calm ones
- [ ] Player and team names are pronounced correctly
- [ ] No clipped or cut-off words at the start or end of lines
- [ ] Each commentator keeps the same character voice throughout
- [ ] Original commentary is clearly turned down under the new voice; crowd sound stays

## 6. What worked well / what needs improving

**Worked well**

- Median delay 0.0 s is inside the 4.0 s target.
- Delay does not build up over the clip (drift ≈ 0).
- No generated line clips.

**Needs improving**

- 4 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 3.123 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.714 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
