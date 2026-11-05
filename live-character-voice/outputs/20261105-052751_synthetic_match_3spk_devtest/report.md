# Results report — 20261105-052751_synthetic_match_3spk_devtest

> ⚠️ **Not a live run** (speed 4.0). Numbers below are NOT live numbers.

## 1. Summary

- **Does the engine work live?** Not shown by this run — the clip was processed at speed 4.0 with no look-ahead; 4 lines were re-voiced and placed back in time; crashes: 1.
- **Median delay** (line ended → new voice ready): **91.93 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **150.49 s** (target ≤ 7.0 s) ❌, max 154.82 s; drift 1.3326 s/s ❌
- **Speaker accuracy:** **96.0 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **90.8 %** (WER 9.2 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `data/clips/synthetic_match_3spk.mp4` (111.28 s) |
| Speed | **4.0** (development only) |
| Source | asr |
| Model: asr | faster_whisper:small.en (int8) |
| Model: speaker | ecapa |
| Model: tts | kokoro |
| Model load / warm-up | {'asr': 1.32, 'speaker': 2.02, 'tts': 7.54, 'warmup': 2.02} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 3 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `35d37e65a383` |
| Wall time | 66.4 s (live part -2530.51 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 91.93 | 150.49 | 154.82 | 33 |
| Line end → voice plays | 30.89 | 38.05 | 38.17 | 4 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.65 | 0.84 | end of speech → line closed (pause detection) |
| asr | 82.82 | 139.91 | line closed → text ready |
| speaker | 0.81 | 2.20 | line closed → speaker known |
| emotion | 82.82 | 139.91 | line closed → emotion known (needs text) |
| complete | 82.82 | 139.91 | line closed → all three ready |
| tts_queue | 0.00 | 0.01 | complete → TTS started (waiting for a worker) |
| tts | 9.84 | 12.77 | TTS synthesis time |
| schedule_wait | 0.00 | 0.00 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 1.3326 s/s → the delay builds up over time; extrapolated delay after 10 min: 818.44 s.

Schedule actions: {'speedup': 4, 'dropped': 3, 'none': 29}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **9.2 %** (sub 20, del 5, ins 3) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **96.0 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 97.2 % | — |
| Speakers found / in truth | 3 / 3 (mapping {'S1': 'A', 'S2': 'B', 'S3': 'C'}) | — |
| Emotion agreement (exact) | 69.4 % | — |
| Emotion agreement (within one step) | 100.0 % | ≥ 80 % |
| Peak moments detected | 6 / 7 | all |
| Lines out / truth | 36 / 36 (ratio 1.0) | ≈ 1.0 |
| Line boundaries inside a truth line | 13 | low |
| Short shouts on their own line | 1 / 3 | — |
| Coverage (truth speech re-voiced) | 12.0 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 8 | 0 | 0 |
| neutral | 0 | 15 | 0 | 0 |
| excited | 0 | 2 | 4 | 0 |
| peak | 0 | 0 | 1 | 6 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 1.41, p95 1.93; lines over 1.6× (voice too slow to keep up): 10
- Files with clipping: 0 / 33 (max peak -1.04 dBFS)
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

- Words are recognised accurately (WER 9.2 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 100 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 91.931 s is above the 4.0 s target.
- Worst-case (p95) delay 150.491 s is above 7.0 s.
- Delay builds up over the clip — the pipeline is slower than real time.
- Only 6/7 peak moments were labelled peak.
- 10 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 139.907 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 12.765 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
