# Results report — 20261105-110039_synthetic_match_groqfish1

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 54 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (line ended → new voice ready): **3.21 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **4.41 s** (target ≤ 7.0 s) ✅, max 5.30 s; drift 0.0020 s/s ✅
- **Speaker accuracy:** **92.9 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **92.8 %** (WER 7.2 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `data/clips/synthetic_match.mp4` (178.36 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 5.01, 'speaker': 1.29, 'tts': 9.17, 'warmup': 13.01} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `0ece0422c610` |
| Wall time | 180.73 s (live part 179.99 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 3.21 | 4.41 | 5.30 | 54 |
| Line end → voice plays | 4.20 | 6.61 | 7.53 | 54 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.49 | 0.59 | end of speech → line closed (pause detection) |
| asr | 0.41 | 1.35 | line closed → text ready |
| speaker | 0.18 | 0.69 | line closed → speaker known |
| emotion | 0.43 | 1.35 | line closed → emotion known (needs text) |
| complete | 0.43 | 1.35 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts | 2.17 | 3.02 | TTS synthesis time |
| schedule_wait | 0.59 | 4.30 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0020 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 4.25 s.

Schedule actions: {'speedup': 42, 'none': 12, 'dropped': 2}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **7.2 %** (sub 25, del 7, ins 6) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **92.9 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 96.4 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 56.5 % | — |
| Emotion agreement (within one step) | 93.5 % | ≥ 80 % |
| Peak moments detected | 7 / 10 | all |
| Lines out / truth | 56 / 62 (ratio 0.903) | ≈ 1.0 |
| Line boundaries inside a truth line | 14 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 98.2 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 13 | 2 | 0 |
| neutral | 0 | 22 | 1 | 1 |
| excited | 0 | 4 | 8 | 1 |
| peak | 0 | 1 | 4 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.92, p95 1.68; lines over 1.6× (voice too slow to keep up): 3
- Files with clipping: 0 / 56 (max peak -2.47 dBFS)
- Files with an internal silence > 400 ms: 0
- Ducking: original commentary -12.04 dB while a voice plays vs 0.0 dB elsewhere → depth **12.04 dB** (target ≥ 9 dB)

Human listen-test (open `voices_only.wav` and `demo_live.mp4`, tick each box):

- [ ] Voices sound natural (no robotic or metallic artefacts)
- [ ] Excited / peak moments sound more energetic than calm ones
- [ ] Player and team names are pronounced correctly
- [ ] No clipped or cut-off words at the start or end of lines
- [ ] Each commentator keeps the same character voice throughout
- [ ] Original commentary is clearly turned down under the new voice; crowd sound stays

## 6. What worked well / what needs improving

**Worked well**

- Median delay 3.211 s is inside the 4.0 s target.
- Delay does not build up over the clip (drift ≈ 0).
- Words are recognised accurately (WER 7.2 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 94 % of lines.
- No generated line clips.

**Needs improving**

- Only 7/10 peak moments were labelled peak.
- 3 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- TTS p95 is 3.016 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [demo_live.mp4](demo_live.mp4) — what a viewer would hear live (voices at their measured delay)
- [demo_synced.mp4](demo_synced.mp4) — synced-mode preview (picture held back by D)
- [voices_only.wav](voices_only.wav) — generated voices only (for judging voice quality)
- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
