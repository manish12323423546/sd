# Results report — 20261106-072622_9965db

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 52 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; live mode): **4.79 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **6.92 s** (target ≤ 7.0 s) ✅, max 9.68 s; drift 0.0007 s/s ✅
- **Speaker accuracy:** **94.2 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **46.7 %** (WER 53.3 %, target WER ≤ 12 %) ❌

## 2. Setup

| Item | Value |
|---|---|
| Clip | `/home/user/sd/live-character-voice/data/clips/synthetic_match.mp4` (178.37 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 1.46, 'speaker': 0.99, 'tts': 5.4, 'warmup': 12.31} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `72f554c815c1` |
| Wall time | 179.35 s (live part 178.59 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 4.79 | 6.92 | 9.68 | 52 |
| Line end → voice plays | 2.06 | 3.22 | 6.83 | 52 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.57 | end of speech → line closed (pause detection) |
| asr | 0.52 | 1.40 | line closed → text ready |
| speaker | 0.17 | 0.35 | line closed → speaker known |
| emotion | 0.52 | 1.40 | line closed → emotion known (needs text) |
| complete | 0.54 | 1.52 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.79 | 1.01 | TTS start → first streamed audio |
| tts | 1.40 | 2.27 | TTS start → audio complete |
| schedule_wait | -0.45 | 0.19 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0007 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 2.46 s.

Schedule actions: {'none': 45, 'fit': 5, 'noise': 8, 'speedup': 2}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **53.3 %** (sub 15, del 265, ins 0) | ≤ 12 % ❌ |
| Speaker accuracy (time) | **94.2 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 98.1 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 56.5 % | — |
| Emotion agreement (within one step) | 96.8 % | ≥ 80 % |
| Peak moments detected | 3 / 10 | all |
| Lines out / truth | 60 / 62 (ratio 0.968) | ≈ 1.0 |
| Line boundaries inside a truth line | 16 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 95.4 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 1 | 12 | 2 | 0 |
| neutral | 0 | 22 | 2 | 0 |
| excited | 0 | 4 | 9 | 0 |
| peak | 0 | 0 | 7 | 3 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.62, p95 0.80; lines over 1.6× (voice too slow to keep up): 0
- Files with clipping: 0 / 52 (max peak -4.01 dBFS)
- Files with an internal silence > 400 ms: 2

Human listen-test (open `voices_only.wav` and `demo_live.mp4`, tick each box):

- [ ] Voices sound natural (no robotic or metallic artefacts)
- [ ] Excited / peak moments sound more energetic than calm ones
- [ ] Player and team names are pronounced correctly
- [ ] No clipped or cut-off words at the start or end of lines
- [ ] Each commentator keeps the same character voice throughout
- [ ] Original commentary is clearly turned down under the new voice; crowd sound stays

## 6. What worked well / what needs improving

**Worked well**

- Delay does not build up over the clip (drift ≈ 0).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 97 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 4.793 s is above the 4.0 s target.
- Word error rate 53.3 % is above 12 %.
- Only 3/10 peak moments were labelled peak.

## 7. Recommendations

- TTS p95 is 2.266 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
