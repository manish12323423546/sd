# Results report — 20261106-075317_b6ac15

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 38 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; picture held back 6 s (synced mode)): **0.00 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **0.14 s** (target ≤ 7.0 s) ✅, max 0.28 s; drift -0.0021 s/s ✅
- **Speaker accuracy:** **96.0 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **90.1 %** (WER 9.9 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `/home/user/sd/live-character-voice/data/clips/synthetic_match_3spk.mp4` (111.30 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 1.44, 'speaker': 1.32, 'tts': 5.01, 'warmup': 12.57} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 3 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `f7e16e781840` |
| Wall time | 111.89 s (live part 111.4 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 0.00 | 0.14 | 0.28 | 38 |
| Line end → voice plays | 3.81 | 5.01 | 5.74 | 38 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.45 | 0.56 | end of speech → line closed (pause detection) |
| asr | 0.58 | 1.24 | line closed → text ready |
| speaker | 0.15 | 0.33 | line closed → speaker known |
| emotion | 0.58 | 1.24 | line closed → emotion known (needs text) |
| complete | 0.58 | 1.24 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.81 | 1.05 | TTS start → first streamed audio |
| tts | 1.84 | 2.35 | TTS start → audio complete |
| schedule_wait | 0.88 | 2.76 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope -0.0021 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 1.05 s.

Schedule actions: {'fit': 24, 'none': 14}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **9.9 %** (sub 24, del 5, ins 1) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **96.0 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 97.4 % | — |
| Speakers found / in truth | 3 / 3 (mapping {'S1': 'A', 'S2': 'B', 'S3': 'C'}) | — |
| Emotion agreement (exact) | 63.9 % | — |
| Emotion agreement (within one step) | 97.2 % | ≥ 80 % |
| Peak moments detected | 6 / 7 | all |
| Lines out / truth | 38 / 36 (ratio 1.056) | ≈ 1.0 |
| Line boundaries inside a truth line | 17 | low |
| Short shouts on their own line | 1 / 3 | — |
| Coverage (truth speech re-voiced) | 93.5 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 7 | 1 | 0 |
| neutral | 0 | 14 | 1 | 0 |
| excited | 0 | 2 | 4 | 0 |
| peak | 0 | 0 | 2 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.97, p95 1.18; lines over 1.6× (voice too slow to keep up): 1
- Files with clipping: 0 / 38 (max peak -3.61 dBFS)
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
- Words are recognised accurately (WER 9.9 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 97 % of lines.
- No generated line clips.

**Needs improving**

- Only 6/7 peak moments were labelled peak.
- 1 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- TTS p95 is 2.354 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
