# Results report — 20261105-111454_synthetic_match_stream2

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 55 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (line ended → new voice ready): **1.79 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **2.86 s** (target ≤ 7.0 s) ✅, max 3.94 s; drift 0.0032 s/s ✅
- **Speaker accuracy:** **92.9 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **93.1 %** (WER 6.9 %, target WER ≤ 12 %) ✅

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
| Model load / warm-up | {'asr': 1.52, 'speaker': 1.19, 'tts': 5.43, 'warmup': 12.51} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `3e50403b1e8b` |
| Wall time | 180.28 s (live part 179.54 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 1.79 | 2.86 | 3.94 | 55 |
| Line end → voice plays | 2.83 | 5.62 | 8.77 | 55 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.48 | 0.59 | end of speech → line closed (pause detection) |
| asr | 0.43 | 1.48 | line closed → text ready |
| speaker | 0.18 | 0.60 | line closed → speaker known |
| emotion | 0.44 | 1.48 | line closed → emotion known (needs text) |
| complete | 0.44 | 1.48 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.79 | 1.03 | TTS start → first streamed audio |
| tts | 2.04 | 3.17 | TTS start → audio complete |
| schedule_wait | -0.07 | 3.32 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0032 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 3.60 s.

Streaming: 55 lines started on their first audio; 0 would have stalled (max 0.0 s).

Schedule actions: {'none': 21, 'speedup': 34, 'dropped': 1}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **6.9 %** (sub 24, del 7, ins 5) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **92.9 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 96.4 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 56.5 % | — |
| Emotion agreement (within one step) | 93.5 % | ≥ 80 % |
| Peak moments detected | 7 / 10 | all |
| Lines out / truth | 56 / 62 (ratio 0.903) | ≈ 1.0 |
| Line boundaries inside a truth line | 14 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 98.4 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 13 | 2 | 0 |
| neutral | 0 | 22 | 1 | 1 |
| excited | 0 | 4 | 8 | 1 |
| peak | 0 | 1 | 4 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.98, p95 1.73; lines over 1.6× (voice too slow to keep up): 3
- Files with clipping: 0 / 56 (max peak -4.38 dBFS)
- Files with an internal silence > 400 ms: 3
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

- Median delay 1.795 s is inside the 4.0 s target.
- Delay does not build up over the clip (drift ≈ 0).
- Words are recognised accurately (WER 6.9 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 94 % of lines.
- No generated line clips.

**Needs improving**

- Only 7/10 peak moments were labelled peak.
- 3 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- TTS p95 is 3.166 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [demo_live.mp4](demo_live.mp4) — what a viewer would hear live (voices at their measured delay)
- [demo_synced.mp4](demo_synced.mp4) — synced-mode preview (picture held back by D)
- [voices_only.wav](voices_only.wav) — generated voices only (for judging voice quality)
- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
