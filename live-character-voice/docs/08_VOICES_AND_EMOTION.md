# 08 — Voices and Emotion Delivery

## 8.1 Voice rules (non-negotiable)
- Use **only** the built-in voices of the open-licensed TTS model (Kokoro-82M, Apache-2.0).
- **Never** clone, imitate or name a voice after a real person or a known character (Mickey, Donald, Goofy, Minnie, any celebrity or real commentator). Those need licences we do not have.
- Character names shown to viewers are our own invented names (below).
- When licensed character voices become available later, they plug in through the `TTSProvider` interface without code changes elsewhere.

## 8.2 Approved voice catalog — `config/voices.yaml`

Starting set (Kokoro voice IDs confirmed on its model page; Claude Code must list the installed voices with `scripts/download_models.py` and confirm each ID exists before using it).

| voice_id | Display name | Character idea | Default for |
|---|---|---|---|
| `bm_george` | The Veteran | Warm, measured British broadcaster | S1 |
| `am_adam` | Hype Host | Energetic American host | S2 |
| `af_bella` | Spark | Bright, quick, playful | S3 |
| `am_michael` | Coach | Steady, confident analyst | — |
| `bf_emma` | The Pro | Clear, polished British presenter | — |
| `bm_lewis` | Night Shift | Deep, calm late-night voice | — |

POC uses 2 voices (S1, S2). Pilot offers 4 in the dropdown: The Veteran, Hype Host, Spark, Coach (others can be enabled in `voices.yaml`).

Each entry in `voices.yaml`:
```yaml
- voice_id: bm_george
  name: The Veteran
  description: Warm, measured British broadcaster
  lang_code: b
  base_speed: 1.0
  enabled_in_pilot: true
```

At startup, generate a 3-second preview per enabled voice: "And that's a brilliant start to the second half!" → `media/previews/<voice_id>.wav`.

## 8.3 Emotion → delivery style — `engine/tts/style.py`

Kokoro has no explicit emotion control, so delivery is shaped with speed, loudness, punctuation and (optionally) a small pitch lift. Values are starting points; tune by listening to `voices_only.wav` and log changes.

| Emotion | Kokoro `speed` (× base) | Gain | Text shaping | Optional pitch shift |
|---|---|---|---|---|
| `calm` | 0.95 | −2 dB | end sentences with "." | 0 |
| `neutral` | 1.00 | 0 dB | keep punctuation | 0 |
| `excited` | 1.08 | +2 dB | end with "!" if no punctuation | +0.5 semitone |
| `peak` | 1.12 | +4 dB (limit to −1 dBFS peak) | single-word/short lines get "!"; repeat key word if the commentator repeated it ("Goal! Goal!") | +1 semitone |

- Intensity inside a label scales linearly with `arousal` between the label's thresholds (e.g. low `excited` ≈ 1.04 speed, high `excited` ≈ 1.10).
- Pitch shift uses `librosa.effects.pitch_shift` and is **off by default** (`style.pitch_shift: false`) because it adds CPU time; enable only if measurements leave headroom.
- Always apply a soft limiter so no output clips.

## 8.4 Quality checks for voices (in the report)
- Listen-test checklist written into `report.md` for a human: natural? matches emotion? names pronounced right? any robotic artefacts? clipped words?
- Automatic checks: clipping count, silence > 400 ms inside a line, TTS duration vs. original line duration ratio (flag if > 1.6× — the voice is too slow to keep up).
