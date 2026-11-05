# 14 — Risks and Limits (honest list)

## Limits of the free, CPU-only stack
- **Delay:** CPU speech recognition and voice generation are slower than paid streaming services. Expect roughly 2–4 s median delay after each line ends (estimate, to be measured). Paid streaming ASR and faster TTS are expected to reduce this.
- **Emotion:** Kokoro has no emotion controls; emotion is shaped through speed, loudness and punctuation. It will sound "more energetic" vs "calmer", not truly acted. Expressive paid TTS (e.g. Fish Audio Drama 3) is the planned upgrade.
- **Game sound:** the Pilot turns the original commentary down (ducking); it does not remove it. The original voice stays faintly audible under the new one. Real-time separation is a later, likely paid, step.
- **Speaker ID:** works well with 2–3 distinct voices and an enrollment sample; it gets harder with similar-sounding commentators, crowd noise peaks and very short lines.
- **One session at a time:** the Pilot backend runs one live session per process (CPU budget).
- **Captions mode:** live TV captions usually arrive several seconds late, so captions mode adds that lag on top of processing.

## Product risks
- **Voice rights:** famous character voices (Disney etc.) are not licensable for this use without a deal. Build and demo with original voices only.
- **Footage rights:** test with the synthetic clip and cleared footage only.
- **Broadcast rights:** altering a broadcaster's commentary for viewers needs the rights holder's permission; plan this before any public launch.

## Technical risks and mitigations
| Risk | Mitigation in this build |
|---|---|
| Delay builds up over long matches | Catch-up policy, drift check, 20-min stability test |
| One stage failure stops the show | Per-line error isolation; session continues |
| Model download blocked in the cloud VM | Custom network domains; clear error naming the domain |
| VM resource limits (4 vCPU, 16 GB) | Small models, int8, one session at a time, measured bench in M1 |
| Results that look good only on synthetic data | Report always separates synthetic vs real-clip results; add a real cleared clip before showing numbers to the client |

## Not in this build (full application later)
Real live broadcast/stream ingest, synced viewing mode in the player, real-time separation, more than three commentators, guests/studio segments, viewer accounts and saved choices, large voice library, mobile and TV apps, broadcaster/platform integration, multi-viewer scaling, prerecorded shows and films mode.
