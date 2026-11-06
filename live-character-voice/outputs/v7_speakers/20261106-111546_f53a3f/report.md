# Results report — 20261106-111546_f53a3f

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 60 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; live mode): **5.09 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **5.92 s** (target ≤ 7.0 s) ✅, max 7.30 s; drift -0.0006 s/s ✅
- **Speaker accuracy:** **94.3 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **94.5 %** (WER 5.5 %, target WER ≤ 12 %) ✅

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
| Model load / warm-up | {'asr': 1.61, 'speaker': 1.05, 'tts': 5.58, 'warmup': 13.11} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 8 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `3a8cc5eed36d` |
| Wall time | 179.21 s (live part 178.37 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 5.09 | 5.92 | 7.30 | 60 |
| Line end → voice plays | 2.48 | 4.10 | 4.60 | 60 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.48 | 0.57 | end of speech → line closed (pause detection) |
| asr | 0.60 | 2.07 | line closed → text ready |
| speaker | 0.20 | 0.41 | line closed → speaker known |
| emotion | 0.60 | 2.07 | line closed → emotion known (needs text) |
| complete | 0.60 | 2.07 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.79 | 0.97 | TTS start → first streamed audio |
| tts | 1.93 | 2.74 | TTS start → audio complete |
| schedule_wait | -0.94 | 1.59 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope -0.0006 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 1.87 s.

Schedule actions: {'fit': 47, 'none': 7, 'speedup': 6}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **5.5 %** (sub 21, del 4, ins 4) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **94.3 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 95.0 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 53.2 % | — |
| Emotion agreement (within one step) | 93.5 % | ≥ 80 % |
| Peak moments detected | 7 / 10 | all |
| Lines out / truth | 60 / 62 (ratio 0.968) | ≈ 1.0 |
| Line boundaries inside a truth line | 16 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 98.2 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 0 | 13 | 2 | 0 |
| neutral | 0 | 22 | 1 | 1 |
| excited | 0 | 6 | 6 | 1 |
| peak | 0 | 1 | 4 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.94, p95 1.77; lines over 1.6× (voice too slow to keep up): 4
- Files with clipping: 0 / 60 (max peak -4.04 dBFS)
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

- Delay does not build up over the clip (drift ≈ 0).
- Words are recognised accurately (WER 5.5 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 94 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 5.094 s is above the 4.0 s target.
- Only 7/10 peak moments were labelled peak.
- 4 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 2.066 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.738 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
