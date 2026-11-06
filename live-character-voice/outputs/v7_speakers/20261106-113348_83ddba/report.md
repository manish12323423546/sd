# Results report — 20261106-113348_83ddba

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 97 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; live mode): **4.77 s** (target ≤ 4.0 s) ❌
- **Worst delays:** p95 **6.14 s** (target ≤ 7.0 s) ✅, max 6.75 s; drift 0.0007 s/s ✅
- **Speaker accuracy:** **89.9 %** of speech time labelled with the right commentator (target ≥ 90 %) ❌
- **Word accuracy:** **84.0 %** (WER 16.0 %, target WER ≤ 12 %) ❌

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
| Enrollment | /home/user/sd/live-character-voice/config/enroll.synthetic_panel_8spk.yaml |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `3a8cc5eed36d` |
| Wall time | 286.3 s (live part 279.36 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 4.77 | 6.14 | 6.75 | 97 |
| Line end → voice plays | 2.43 | 3.79 | 4.23 | 97 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.59 | end of speech → line closed (pause detection) |
| asr | 0.67 | 1.82 | line closed → text ready |
| speaker | 0.16 | 0.31 | line closed → speaker known |
| emotion | 0.67 | 1.82 | line closed → emotion known (needs text) |
| complete | 0.67 | 1.82 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.79 | 1.02 | TTS start → first streamed audio |
| tts | 1.66 | 2.48 | TTS start → audio complete |
| schedule_wait | -0.63 | 1.08 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope 0.0007 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 2.52 s.

Schedule actions: {'fit': 63, 'none': 33, 'speedup': 1}. Lines with errors: 1.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **16.0 %** (sub 70, del 29, ins 10) | ≤ 12 % ❌ |
| Speaker accuracy (time) | **89.9 %** | ≥ 90 % ❌ |
| Speaker accuracy (lines) | 88.7 % | — |
| Speakers found / in truth | 8 / 8 (mapping {'S1': 'A', 'S2': 'B', 'S3': 'C', 'S4': 'D', 'S5': 'E', 'S6': 'F', 'S7': 'G', 'S8': 'H'}) | — |
| Emotion agreement (exact) | 39.8 % | — |
| Emotion agreement (within one step) | 90.3 % | ≥ 80 % |
| Peak moments detected | 3 / 23 | all |
| Lines out / truth | 97 / 93 (ratio 1.043) | ≈ 1.0 |
| Line boundaries inside a truth line | 58 | low |
| Short shouts on their own line | 1 / 1 | — |
| Coverage (truth speech re-voiced) | 87.4 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 3 | 23 | 0 | 0 |
| neutral | 0 | 25 | 2 | 0 |
| excited | 0 | 10 | 7 | 0 |
| peak | 0 | 9 | 12 | 2 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.88, p95 1.48; lines over 1.6× (voice too slow to keep up): 5
- Files with clipping: 0 / 97 (max peak -3.92 dBFS)
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
- Emotion within one step of the truth on 90 % of lines.
- No generated line clips.

**Needs improving**

- Median delay 4.769 s is above the 4.0 s target.
- Word error rate 16.0 % is above 12 %.
- Speaker labels are not reliable enough; overlaps and handovers are the hard part.
- Only 3/23 peak moments were labelled peak.
- 5 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- ASR p95 is 1.824 s: switch to `base.en` or lower `max_line_s` (docs/04 levers).
- TTS p95 is 2.481 s: reduce CPU contention (torch threads) or use more workers.
- Provide an enroll file (8–15 s per commentator) for real clips.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart

Warnings during the run (1): line L000015 tts: ChunkedEncodingError: Response ended prematurely
