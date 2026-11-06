# Results report — 20261106-112906_c08d65

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 96 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; live mode): **4.60 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **6.00 s** (target ≤ 7.0 s) ✅, max 7.71 s; drift -0.0001 s/s ✅
- **Speaker accuracy:** **66.8 %** of speech time labelled with the right commentator (target ≥ 90 %) ❌
- **Word accuracy:** **83.3 %** (WER 16.7 %, target WER ≤ 12 %) ❌

## 2. Setup

| Item | Value |
|---|---|
| Clip | `/home/user/sd/live-character-voice/data/clips/synthetic_panel_8spk.mp4` (279.36 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 2.09, 'speaker': 1.04, 'tts': 5.32, 'warmup': 11.67} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 8 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `3a8cc5eed36d` |
| Wall time | 280.53 s (live part 279.36 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 4.60 | 6.00 | 7.71 | 96 |
| Line end → voice plays | 2.16 | 3.94 | 5.99 | 96 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.59 | end of speech → line closed (pause detection) |
| asr | 0.58 | 1.71 | line closed → text ready |
| speaker | 0.17 | 0.36 | line closed → speaker known |
| emotion | 0.59 | 1.71 | line closed → emotion known (needs text) |
| complete | 0.59 | 1.71 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.78 | 0.98 | TTS start → first streamed audio |
| tts | 1.57 | 2.57 | TTS start → audio complete |
| schedule_wait | -0.61 | 0.92 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope -0.0001 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 2.10 s.

Schedule actions: {'fit': 69, 'none': 23, 'speedup': 4, 'noise': 1}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **16.7 %** (sub 74, del 29, ins 11) | ≤ 12 % ❌ |
| Speaker accuracy (time) | **66.8 %** | ≥ 90 % ❌ |
| Speaker accuracy (lines) | 63.5 % | — |
| Speakers found / in truth | 5 / 8 (mapping {'S5': 'B', 'S4': 'C', 'S1': 'D', 'S3': 'E', 'S2': 'F'}) | — |
| Emotion agreement (exact) | 40.9 % | — |
| Emotion agreement (within one step) | 87.1 % | ≥ 80 % |
| Peak moments detected | 7 / 23 | all |
| Lines out / truth | 97 / 93 (ratio 1.043) | ≈ 1.0 |
| Line boundaries inside a truth line | 60 | low |
| Short shouts on their own line | 1 / 1 | — |
| Coverage (truth speech re-voiced) | 87.2 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 4 | 20 | 2 | 0 |
| neutral | 0 | 23 | 3 | 1 |
| excited | 0 | 11 | 6 | 0 |
| peak | 0 | 9 | 9 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.88, p95 1.42; lines over 1.6× (voice too slow to keep up): 4
- Files with clipping: 0 / 96 (max peak -3.88 dBFS)
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
- Emotion within one step of the truth on 87 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 4.604 s is above the 4.0 s target.
- Word error rate 16.7 % is above 12 %.
- Speaker labels are not reliable enough; overlaps and handovers are the hard part.
- Only 7/23 peak moments were labelled peak.
- 4 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 1.71 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.567 s: reduce CPU contention (torch threads) or use more workers.
- Provide an enroll file (8–15 s per commentator) for real clips.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
