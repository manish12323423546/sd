# 01 — Product Brief

## One-line summary
A viewer watches a sports broadcast and hears the commentary in AI character voices of their choice: same words, matching emotion, each commentator with their own voice, switchable at any time, with the original game sound kept.

## Why live sports first
It is the hardest and most valuable case. If the system works live, prerecorded shows and films are easier versions of the same problem.

## What the system does, in plain words
While the match plays, the system keeps doing these things at the same time:
1. **Listen** — takes the broadcast audio continuously, a second or two at a time.
2. **Understand the words** — turns commentary into text (or reads the broadcast captions file when available).
3. **Know who said it** — identifies which commentator is speaking and keeps that consistent for the whole broadcast.
4. **Keep a live record** — writes every line into a shared, constantly updated record: what was said, who said it, exactly when, and how it was said.
5. **Read the emotion** — calm build-up vs. excited goal moment.
6. **Generate the new voice** — re-speaks each line in the voice chosen for that commentator, with matching emotion.
7. **Place it back in time** — plays the new voice at the right point, turns the original commentary down, keeps crowd and game sound, and does not let the delay build up.

## The real challenge (what the engineering is for)
No single step is the hard part. The hard part is keeping every step working together, live, for a full match:
- **Everything depends on the live record.** If it is late, incomplete or wrong, every later step inherits the problem.
- **Deciding when a line is ready.** Wait too long → the voice falls behind. Speak too early → a thought is cut in half or the emotion is wrong.
- **Small delays add up.** A pipeline only slightly too slow keeps falling further behind over a long match. It must stay within a time budget per line and catch up when one line runs long.
- **Real sports audio is messy.** Commentators talk over each other, the crowd roars, someone shouts "Goal!", the speaker changes mid-sentence.
- **Most problems only show when everything runs live.** So we test at live speed, measure every line, fix, and run again.

## Stage A — Proof of Concept (engine only, no app)
**Goal:** prove the core engine and measure real delay and quality.
- One 2–5 minute clip with two commentators (synthetic test clip first, then a cleared real clip).
- Text from speech as it plays, or from a captions file.
- Two commentators identified and labelled consistently.
- A different approved voice per commentator.
- Emotion in the delivery (calm vs excited).
- Clip processed at live speed (no looking ahead), delay measured per line.
- Outputs: processed demo video(s) + results report (delay, word accuracy, speaker accuracy, voice quality notes, what worked, what needs improving).

**Not in A:** viewer app, real live feeds, viewer voice choice/switching, ready-to-use product.

## Stage B — Pilot Version (MVP)
**Goal:** first working version of the product people can try.
- Everything in A.
- A web player: video plays with the new character voices.
- A 10–30 minute recorded broadcast streamed as if live.
- Two to three commentators identified correctly throughout.
- A choice of 3–4 approved voices per commentator, switchable during playback.
- Emotion-based delivery.
- Original commentary turned down while the new voice plays; crowd/game sound kept.
- Stable for 10–20+ minutes without breaking or delay building up.
- A delay record for every line, visible in the app and exported.

**Not in B:** real live broadcast feeds, synced viewing mode, more than three commentators, accounts, mobile/TV apps, broadcaster integration.

## Success measures (targets for the free stack, to be confirmed by measurement)
| Measure | POC target | Pilot target |
|---|---|---|
| Median delay (end of spoken line → new voice ready) | ≤ 4.0 s | ≤ 3.5 s |
| 95th percentile delay | ≤ 7.0 s | ≤ 6.0 s |
| Delay drift over the clip | none (slope ≈ 0) | none over 20 min |
| Word error rate on synthetic clip | ≤ 12% | ≤ 12% |
| Speaker label accuracy (line level) | ≥ 90% | ≥ 90% |
| Crashes during a run | 0 | 0 in a 20-min run |

These are targets for a free, CPU-only stack. Paid services later (see `12_COSTS_AND_PAID_UPGRADES.md`) are expected to cut delay roughly in half; that is an expectation, not a measured fact.
