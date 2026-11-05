# Results report — 20261105-063116_synthetic_match_distil1

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 51 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (line ended → new voice ready): **5.59 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **25.42 s** (target ≤ 7.0 s) ❌, max 51.26 s; drift 0.0206 s/s ❌
- **Speaker accuracy:** **92.9 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **-37.3 %** (WER 137.3 %, target WER ≤ 12 %) ❌

## 2. Setup

| Item | Value |
|---|---|
| Clip | `data/clips/synthetic_match.mp4` (178.36 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | faster_whisper:distil-small.en (int8, 4 threads) |
| Model: speaker | ecapa |
| Model: tts | kokoro |
| Model load / warm-up | {'asr': 1.11, 'speaker': 1.3, 'tts': 4.77, 'warmup': 1.9} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `89ff66457986` |
| Wall time | 207.3 s (live part 206.61 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 5.59 | 25.42 | 51.26 | 51 |
| Line end → voice plays | 74.58 | 125.91 | 128.78 | 51 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.49 | 0.59 | end of speech → line closed (pause detection) |
| asr | 2.36 | 4.12 | line closed → text ready |
| speaker | 0.24 | 0.66 | line closed → speaker known |
| emotion | 2.37 | 4.12 | line closed → emotion known (needs text) |
| complete | 2.37 | 4.13 | line closed → all three ready |
| tts_queue | 0.00 | 8.85 | complete → TTS started (waiting for a worker) |
| tts | 2.36 | 21.16 | TTS synthesis time |
| schedule_wait | 64.58 | 114.56 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0206 s/s → the delay builds up over time; extrapolated delay after 10 min: 19.83 s.

Schedule actions: {'speedup': 49, 'merged': 5, 'dropped': 2}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **137.3 %** (sub 120, del 14, ins 587) | ≤ 12 % ❌ |
| Speaker accuracy (time) | **92.9 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 96.4 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 48.4 % | — |
| Emotion agreement (within one step) | 95.2 % | ≥ 80 % |
| Peak moments detected | 7 / 10 | all |
| Lines out / truth | 56 / 62 (ratio 0.903) | ≈ 1.0 |
| Line boundaries inside a truth line | 14 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 98.2 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 13 | 2 | 0 |
| neutral | 0 | 18 | 6 | 0 |
| excited | 0 | 6 | 7 | 0 |
| peak | 0 | 1 | 4 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.99, p95 8.14; lines over 1.6× (voice too slow to keep up): 10
- Files with clipping: 0 / 52 (max peak -2.23 dBFS)
- Files with an internal silence > 400 ms: 8
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

- Commentators are told apart reliably.
- Emotion within one step of the truth on 95 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 5.591 s is above the 4.0 s target.
- Worst-case (p95) delay 25.423 s is above 7.0 s.
- Delay builds up over the clip — the pipeline is slower than real time.
- Word error rate 137.3 % is above 12 %.
- Only 7/10 peak moments were labelled peak.
- 10 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 4.124 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- Lines wait 8.849 s (p95) for a TTS worker: add a worker or shorten lines.
- TTS p95 is 21.159 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [demo_live.mp4](demo_live.mp4) — what a viewer would hear live (voices at their measured delay)
- [demo_synced.mp4](demo_synced.mp4) — synced-mode preview (picture held back by D)
- [voices_only.wav](voices_only.wav) — generated voices only (for judging voice quality)
- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart

Warnings during the run (1): delay drift 0.155 s/s at t=120 s
