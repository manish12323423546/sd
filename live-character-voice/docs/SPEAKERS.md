# Speaker tracking (V7): many speakers, one stable label per person

## How it decides, line by line (live and recorded)
1. **Voice-print** of every phrase (ECAPA, 192 numbers, ≈ 0.2 s on CPU).
2. **Compare with each known person's voice bank**: up to 40 earlier prints per person; the score
   is the mean of the 3 closest (5 when people are enrolled). A shout is compared with that
   person's earlier shouts, not with an average of everything.
3. **Decide**
   - score ≥ 0.22 (0.15 with enrolled people) → that person, confidence high, learned from;
   - score < 0.18, phrase ≥ 1.5 s, not shouted, fewer than the limit → **new person**;
   - in between, or a shout, or a phrase < 0.8 s → the best/current person, confidence LOW, not
     learned from (one odd line cannot create or corrupt a speaker).
4. **Merge** two labels when their banks turn out to be the same voice; earlier lines are
   relabelled everywhere (transcript, side panel, reports). Two **enrolled** people are never merged.
5. **Mid-phrase change**: while a phrase is still open, the newest 1.5 s is compared with the
   phrase so far; a clear change to another known person splits the phrase there.
6. **Viewer fixes**: "Same person as…" merges two labels; names can be edited — both live.
7. **Recorded videos**: a second pass re-clusters the whole recording at the end
   (reported as *two-pass accuracy*).

## Measured (truth-scored synthetic panels, Kokoro source voices + crowd bed at −28 dB)
Why a single fingerprint fails (line vs line similarity): same person typical 0.37–0.48 but as low
as 0.02–0.12 (shouting vs normal); different people typical 0.05 but up to 0.66.

| Clip | old tracker (≤ 3) | new, live | new, two-pass | new + enrolled (10 s each) |
|---|---|---|---|---|
| 2 commentators | 94.3 % | 94.3 % | 94.5 % | — |
| 6 speakers (one joins late) | 40 % | 77.1 % | 85.7 % | **88.2 %** (6/6 labels) |
| 8 speakers (2 look-alike pairs) | 32 % | 66.8 % | 70.4 % | **89.9 %** (8/8 labels) |
With enrolled people, use the live labels: the two-pass re-clustering ignores the enrolment
(69–86 %). Remaining loss on unknown panels: 3–4 % of speech sits in phrases that contain two
people (hand-overs < 0.35 s); the rest is voice confusion between similar voices.
Offline bench on clean script lines (`scripts/speaker_bench.py`): new tracker 6 spk 87.5 %,
8 spk 72.9 % (8 spk held out from tuning); enrolled 97.2 % / 93.8 %.

Tried and rejected (measured): larger voice-print models (WeSpeaker ResNet34 / ResNet293: pair
error 17.4 % / 20.7 % vs ECAPA 13.6 % on the 8-speaker clip, and 4–15× slower); noise reduction
before the voice-print (pair error 13.6 % → 16.0 %).

## Scenarios and what to expect
| Situation | What happens | Accuracy | What helps most |
|---|---|---|---|
| 1–3 distinct commentators | stable from the first lines | 94–99 % | — |
| 4–8 speakers, unknown | new people found as they speak; some confusions between similar voices | 67–86 % | enrol them; two-pass for recordings |
| Known panel (studio show) | enrolled from Voice Lab samples, named from the first word | 88–90 % live (6–8 people) | 10–20 s clean sample each |
| Same person calm → shouting | shout scored against their earlier shouts; shouts never create people | low-confidence lines | enrolment sample with some excited speech |
| Very short interjection ("Yes!") | stays with the current speaker unless clearly someone else | often wrong person | inherent: < 0.8 s has too little voice |
| Two people at once (overlap) | the louder one gets the phrase | the quieter is lost | overlap model (roadmap) |
| Quick hand-over (< 0.35 s gap) | mid-phrase split if the new voice clearly matches someone | some phrases keep both | lower pause threshold for panels |
| Similar voices (same gender/accent) | most likely confusion | look-alike pairs drive most errors | enrolment; video (who is on screen) |
| Someone joins late | becomes a new label when first heard (≥ 1.5 s) | first short line may go to someone else | — |
| Ads / replays / other voices | treated as more speakers (up to the limit) | can use up labels | set the limit to the panel size |
| Remote guest on a phone line | channel changes the voice-print | may split | "Same person as…" once; enrol from the call audio |

## Live vs recorded
- **Live**: each phrase is labelled when it is understood (no extra delay: the voice-print runs in
  parallel with transcription, ≈ 0.2 s). Merges relabel past lines as soon as the evidence is there.
  In Synced mode, lines not yet played still get the corrected voice.
- **Recorded**: the same live labels, plus a two-pass re-clustering of the whole file for the
  report (better on many speakers: 85.7 % vs 77.1 % on 6).

## Audio + video (not built yet)
Commentators in sports are usually off-screen, so video rarely helps there. For studio panels and
talk shows, active-speaker detection (face tracks + lip movement, e.g. TalkNet / LoCoNet class
models) can tie each voice to an on-screen face and fix look-alike voices. It needs a GPU to run in
real time (≈ 25 fps face + audio-visual model) and only helps when the speaker is visible.
Captions with speaker tags (broadcast CEA-608 `>> NAME:`) can name speakers when present.
