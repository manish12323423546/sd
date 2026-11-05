# Results report — 20261105-052242_synthetic_match_m3_enroll

## 1. Summary

- **Does the engine work live?** Not shown by this run — the clip was processed at speed 1.0 with no look-ahead; 0 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (line ended → new voice ready): **—** (target ≤ 4.0 s) —
- **Worst delays:** p95 **—** (target ≤ 7.0 s) —, max —; drift 0.0000 s/s —
- **Speaker accuracy:** **93.8 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **88.8 %** (WER 11.2 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `data/clips/synthetic_match.mp4` (178.36 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: asr | faster_whisper:small.en (int8) |
| Model: speaker | ecapa |
| Model load / warm-up | {'asr': 1.43, 'speaker': 2.28, 'warmup': 1.07} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | config/enroll.synthetic.yaml |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `38fef25b4bbc` |
| Wall time | 180.71 s (live part 178.37 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | — | — | — | 0 |
| Line end → voice plays | — | — | — | 0 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.55 | 0.83 | end of speech → line closed (pause detection) |
| asr | 1.45 | 2.65 | line closed → text ready |
| speaker | 0.44 | 1.08 | line closed → speaker known |
| emotion | 1.45 | 2.65 | line closed → emotion known (needs text) |
| complete | 1.45 | 2.65 | line closed → all three ready |
| tts_queue | — | — | complete → TTS started (waiting for a worker) |
| tts | — | — | TTS synthesis time |
| schedule_wait | — | — | voice ready → voice plays (ordering, gaps) |

**Drift:** slope 0.0000 s/s → the delay builds up over time; extrapolated delay after 10 min: —.

Schedule actions: {'none': 58}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **11.2 %** (sub 42, del 12, ins 5) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **93.8 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 96.5 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 51.6 % | — |
| Emotion agreement (within one step) | 96.8 % | ≥ 80 % |
| Peak moments detected | 5 / 10 | all |
| Lines out / truth | 58 / 62 (ratio 0.935) | ≈ 1.0 |
| Line boundaries inside a truth line | 18 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 0.0 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 14 | 1 | 0 |
| neutral | 0 | 20 | 4 | 0 |
| excited | 0 | 4 | 9 | 0 |
| peak | 0 | 1 | 6 | 3 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 —, p95 —; lines over 1.6× (voice too slow to keep up): 0
- Files with clipping: 0 / 0 (max peak —)
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

- Words are recognised accurately (WER 11.2 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 97 % of lines.

**Needs improving**

- Only 5/10 peak moments were labelled peak.

## 7. Recommendations

- ASR p95 is 2.65 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
