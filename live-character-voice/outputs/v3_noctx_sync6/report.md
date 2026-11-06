# Results report — 20261106-074053_713bdb

## 1. Summary

- **Does the engine work live?** Yes — the clip was processed at speed 1.0 with no look-ahead; 60 lines were re-voiced and placed back in time; crashes: 0.
- **Median delay** (original line starts → its new voice starts, as the viewer sees it; picture held back 6 s (synced mode)): **0.00 s** (target ≤ 4.0 s) ✅
- **Worst delays:** p95 **0.43 s** (target ≤ 7.0 s) ✅, max 1.22 s; drift -0.0003 s/s ✅
- **Speaker accuracy:** **94.3 %** of speech time labelled with the right commentator (target ≥ 90 %) ✅
- **Word accuracy:** **93.1 %** (WER 6.9 %, target WER ≤ 12 %) ✅

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
| Model load / warm-up | {'asr': 1.42, 'speaker': 1.18, 'tts': 5.04, 'warmup': 11.79} s |
| VM | 4 vCPU, CPU only |
| Max speakers | 2 |
| Enrollment | none (online clustering only) |
| Voices | {'S1': 'bm_george', 'S2': 'am_adam', 'S3': 'af_bella'} |
| Config hash | `b1955ce343fd` |
| Wall time | 179.18 s (live part 178.37 s) |

## 3. Delay

| Delay | p50 | p95 | max | n |
|---|---|---|---|---|
| Line end → voice ready | 0.00 | 0.43 | 1.22 | 60 |
| Line end → voice plays | 3.46 | 5.81 | 6.24 | 60 |

Stage breakdown (seconds, measured on the session clock):

| Stage | p50 | p95 | what it is |
|---|---|---|---|
| close_wait | 0.47 | 0.57 | end of speech → line closed (pause detection) |
| asr | 0.53 | 1.26 | line closed → text ready |
| speaker | 0.17 | 0.38 | line closed → speaker known |
| emotion | 0.53 | 1.26 | line closed → emotion known (needs text) |
| complete | 0.53 | 1.26 | line closed → all three ready |
| tts_queue | 0.00 | 0.00 | complete → TTS started (waiting for a worker) |
| tts_first_audio | 0.79 | 1.05 | TTS start → first streamed audio |
| tts | 1.93 | 2.69 | TTS start → audio complete |
| schedule_wait | 0.39 | 4.10 | voice ready → voice plays (ordering, gaps) |

![Delay over time](delay_over_time.png)

**Drift:** slope -0.0003 s/s → no drift — the delay does not build up; extrapolated delay after 10 min: 1.96 s.

Schedule actions: {'fit': 46, 'none': 14}. Lines with errors: 0.

## 4. Accuracy

| Measure | Result | Target |
|---|---|---|
| Word error rate | **6.9 %** (sub 29, del 4, ins 3) | ≤ 12 % ✅ |
| Speaker accuracy (time) | **94.3 %** | ≥ 90 % ✅ |
| Speaker accuracy (lines) | 96.7 % | — |
| Speakers found / in truth | 2 / 2 (mapping {'S1': 'A', 'S2': 'B'}) | — |
| Emotion agreement (exact) | 56.5 % | — |
| Emotion agreement (within one step) | 93.5 % | ≥ 80 % |
| Peak moments detected | 7 / 10 | all |
| Lines out / truth | 60 / 62 (ratio 0.968) | ≈ 1.0 |
| Line boundaries inside a truth line | 16 | low |
| Short shouts on their own line | 3 / 5 | — |
| Coverage (truth speech re-voiced) | 98.2 % | — |

Emotion confusion (rows = truth, columns = engine):

| truth \ engine | calm | neutral | excited | peak |
|---|---|---|---|---|
| calm | 1 | 12 | 2 | 0 |
| neutral | 0 | 22 | 1 | 1 |
| excited | 0 | 5 | 7 | 1 |
| peak | 0 | 1 | 4 | 5 |

## 5. Voice quality

Automatic checks:

- TTS duration ÷ original line duration: p50 0.99, p95 1.69; lines over 1.6× (voice too slow to keep up): 4
- Files with clipping: 0 / 60 (max peak -4.04 dBFS)
- Files with an internal silence > 400 ms: 2

Human listen-test (open `voices_only.wav` and `demo_live.mp4`, tick each box):

- [ ] Voices sound natural (no robotic or metallic artefacts)
- [ ] Excited / peak moments sound more energetic than calm ones
- [ ] Player and team names are pronounced correctly
- [ ] No clipped or cut-off words at the start or end of lines
- [ ] Each commentator keeps the same character voice throughout
- [ ] Original commentary is clearly turned down under the new voice; crowd sound stays

## 6. What worked well / what needs improving

**Worked well**

- Median delay 0.0 s is inside the 4.0 s target.
- Delay does not build up over the clip (drift ≈ 0).
- Words are recognised accurately (WER 6.9 %).
- Commentators are told apart reliably.
- Emotion within one step of the truth on 94 % of lines.
- No generated line clips.

**Needs improving**

- Only 7/10 peak moments were labelled peak.
- 4 voice lines are > 1.6× longer than the original.

## 7. Recommendations

- TTS p95 is 2.686 s: reduce CPU contention (torch threads) or use more workers.
- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster hosted TTS would cut the delay roughly in half (docs/12).

## 8. Files

- [record.json](record.json) — the full live record
- [lines.csv](lines.csv) — delay log, one row per line
- [metrics.json](metrics.json) — all computed metrics
- [delay_over_time.png](delay_over_time.png) — delay chart
