# Results report — 20261106-073054_9b896f

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 52 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; picture held back 6 s (synced mode)): **0.00 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **0.17 s** (target ≤ 7.0 s) ✅, max 1.09 s; drift 0.0018 s/s ✅
- **Speaker accuracy:** **94.2 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **47.4 %** (WER 52.6 %, target WER ≤ 12 %) ❌

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
| Model load / warm-up | {'asr': 1.42, 'speaker': 1.19, 'tts': 5.01, 'warmup': 13.24} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `687fddbd478e` |
| Wall time | 179.16 s (live part 178.37 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 0.00 | 0.17 | 1.09 | 52 |
| Line end → voice plays | 3.31 | 4.54 | 4.72 | 52 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.48 | 0.57 | end of speech → line closed (pause detection) |
| asr | 0.52 | 1.56 | line closed → text ready |
| speaker | 0.17 | 0.40 | line closed → speaker known |
| emotion | 0.52 | 1.56 | line closed → emotion known (needs text) |
| complete | 0.51 | 1.30 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.81 | 1.09 | TTS start → first streamed audio |
| tts | 1.43 | 2.34 | TTS start → audio complete |
| schedule_wait | 0.83 | 2.58 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0018 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 2.95 s.

Schedule actions: {'none': 50, 'fit': 2, 'noise': 8}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **52.6 %** (sub 11, del 265, ins 0) | ≤ 12 % ❌ |
| Speaker accuracy (time) | **94.2 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 98.1 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 53.2 % | — |
| Emotion agreement (within one step) | 96.8 % | ≥ 80 % |
| Peak moments detected | 3 / 10 | all |
| Lines out / truth | 60 / 62 (ratio 0.968) | ≈ 1.0 |
| Line boundaries inside a truth line | 16 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 94.6 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 13 | 2 | 0 |
| neutral | 0 | 22 | 2 | 0 |
| excited | 0 | 5 | 8 | 0 |
| peak | 0 | 0 | 7 | 3 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.61, p95 0.82; lines over 1.6× (voice too slow to keep up): 0
- Files with clipping: 0 / 52 (max peak -3.51 dBFS)
- Files with an internal silence > 400 ms: 1

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
- Commentators are told apart reliably.
- Emotion within one step of the truth on 97 % of lines.
- No generated line clips.

**Needs improving**

- Word error rate 52.6 % is above 12 %.
- Only 3/10 peak moments were labelled peak.

## 7. Recommendations

- ASR p95 is 1.556 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.336 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
