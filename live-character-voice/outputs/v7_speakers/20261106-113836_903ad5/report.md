# Results report — 20261106-113836_903ad5

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 86 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; live mode): **4.80 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **6.34 s** (target ≤ 7.0 s) ✅, max 7.40 s; drift 0.0017 s/s ✅
- **Speaker accuracy:** **88.2 %** of speech time labelled with the right commentator (target ≥ 90 %) ❌
- **Word accuracy:** **88.2 %** (WER 11.8 %, target WER ≤ 12 %) ✅

## 2. Setup

| Item | Value |
|---|---|
| Clip | `/home/user/sd/live-character-voice/data/clips/synthetic_panel_6spk.mp4` (245.48 s) |
| Speed | **1.0** (live, honest) |
| Source | asr |
| Model: torch_threads | 4 |
| Model: asr | groq:whisper-large-v3-turbo (fallback local small.en) |
| Model: speaker | ecapa |
| Model: tts | fish:s2.1-pro-free (balanced) |
| Model load / warm-up | {'asr': 2.09, 'speaker': 1.04, 'tts': 5.32, 'warmup': 11.67} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 8 |
| Enrollment | /home/user/sd/live-character-voice/config/enroll.synthetic_panel_6spk.yaml |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `3a8cc5eed36d` |
| Wall time | 251.82 s (live part 246.09 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 4.80 | 6.34 | 7.40 | 86 |
| Line end → voice plays | 2.46 | 5.01 | 5.47 | 86 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.58 | end of speech → line closed (pause detection) |
| asr | 0.59 | 2.04 | line closed → text ready |
| speaker | 0.16 | 0.40 | line closed → speaker known |
| emotion | 0.60 | 2.04 | line closed → emotion known (needs text) |
| complete | 0.59 | 2.05 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.85 | 1.19 | TTS start → first streamed audio |
| tts | 1.72 | 2.74 | TTS start → audio complete |
| schedule_wait | -0.67 | 2.72 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0017 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 3.06 s.

Schedule actions: {'fit': 63, 'none': 15, 'speedup': 8, 'noise': 1}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **11.8 %** (sub 42, del 24, ins 7) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **88.2 %** | ≥ 90 % ❌ |
| Speaker accuracy (lines) | 90.7 % | — |
| Speakers found / in truth | 6 / 6 (mapping {'S1': 'A', 'S2': 'B', 'S3': 'C', 'S4': 'D', 'S5': 'E', 'S6': 'F'}) | — |
| Emotion agreement (exact) | 42.9 % | — |
| Emotion agreement (within one step) | 89.6 % | ≥ 80 % |
| Peak moments detected | 6 / 13 | all |
| Lines out / truth | 87 / 77 (ratio 1.13) | ≈ 1.0 |
| Line boundaries inside a truth line | 63 | low |
| Short shouts on their own line | 0 / 0 | — |
| Coverage (truth speech re-voiced) | 82.9 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 1 | 20 | 1 | 1 |
| neutral | 3 | 20 | 0 | 1 |
| excited | 1 | 9 | 6 | 1 |
| peak | 0 | 4 | 3 | 6 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.91, p95 1.17; lines over 1.6× (voice too slow to keep up): 4
- Files with clipping: 0 / 86 (max peak -4.54 dBFS)
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
- Words are recognised accurately (WER 11.8 %).
- Emotion within one step of the truth on 90 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 4.796 s is above the 4.0 s target.
- Speaker labels are not reliable enough; overlaps and handovers are the hard part.
- Only 6/13 peak moments were labelled peak.
- 4 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 2.043 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.739 s: reduce CPU contention (torch threads) or use more workers.
- Provide an enroll file (8–15 s per commentator) for real clips.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
