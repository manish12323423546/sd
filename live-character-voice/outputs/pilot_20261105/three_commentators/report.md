# Results report — 20261105-064355_2b6dd7

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 35 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (line ended → new voice ready): **4.01 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **4.61 s** (target ≤ 7.0 s) ✅, max 4.76 s; drift -0.0014 s/s ✅
- **Speaker accuracy:** **96.0 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **91.5 %** (WER 8.6 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `/home/user/sd/live-character-voice/data/clips/synthetic_match_3spk.mp4` (111.30 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | faster_whisper:small.en (int8, 4 threads) |
| Model: speaker | ecapa |
| Model: tts | kokoro |
| Model load / warm-up | {'asr': 1.42, 'speaker': 1.17, 'tts': 5.1, 'warmup': 2.13} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 3 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'am_adam', 'S2': 'af_bella', 'S3': 'bm_george'} |
| Config hash | `93922eaf484e` |
| Wall time | 113.02 s (live part 112.51 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 4.01 | 4.61 | 4.76 | 35 |
| Line end → voice plays | 4.40 | 5.33 | 7.42 | 35 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.56 | end of speech → line closed (pause detection) |
| asr | 1.41 | 1.90 | line closed → text ready |
| speaker | 0.23 | 0.34 | line closed → speaker known |
| emotion | 1.41 | 1.90 | line closed → emotion known (needs text) |
| complete | 1.41 | 1.90 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts | 2.03 | 2.76 | TTS synthesis time |
| schedule_wait | 0.00 | 1.46 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope -0.0014 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 3.24 s.

Schedule actions: {'speedup': 34, 'dropped': 1, 'none': 1}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **8.6 %** (sub 19, del 5, ins 2) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **96.0 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 97.2 % | — |
| Speakers found / in truth | 3 / 3 (mapping {'S1': 'A', 'S2': 'B', 'S3': 'C'}) | — |
| Emotion agreement (exact) | 69.4 % | — |
| Emotion agreement (within one step) | 97.2 % | ≥ 80 % |
| Peak moments detected | 6 / 7 | all |
| Lines out / truth | 36 / 36 (ratio 1.0) | ≈ 1.0 |
| Line boundaries inside a truth line | 13 | low |
| Short shouts on their own line | 1 / 3 | — |
| Coverage (truth speech re-voiced) | 93.0 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 7 | 1 | 0 |
| neutral | 0 | 15 | 0 | 0 |
| excited | 0 | 2 | 4 | 0 |
| peak | 0 | 0 | 1 | 6 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.97, p95 1.14; lines over 1.6× (voice too slow to keep up): 1
- Files with clipping: 0 / 36 (max peak -1.65 dBFS)
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

- Delay does not build up over the clip (drift ≈ 0).
- Words are recognised accurately (WER 8.6 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 97 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 4.014 s is above the 4.0 s target.
- Only 6/7 peak moments were labelled peak.
- 1 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 1.896 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.76 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
