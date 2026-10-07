# 07 — Audio: MetaSounds engine and the mix

Sound is half of what makes a chase feel fast. Plan the audio in two passes:

1. **In-engine (MetaSounds):** a procedural engine and FX driven by the recorded RPM, throttle and speed. You hear it during previz, and it gives timing-accurate stems.
2. **Final mix (DAW / DaVinci Resolve Fairlight):** the rendered stems plus designed hits, ambience and score, mixed to picture.

## Sourcing

- Engine recordings: buy a multi-RPM engine library, such as the Boom Library, Sonniss GDC bundles (free) or Pro Sound Effects car packs.
  - You want **steady-RPM loops** at about 1k / 2.5k / 4k / 5.5k / 7k / 8.5k RPM, recorded on-load and off-load.
  - You also want exhaust pops, gear shifts, a turbo or supercharger whine, and tyre skids on wet and dry surfaces.
- SUV: a diesel V8 set, plus suspension bangs, rattles and a searchlight motor hum.
- Ambience: night rainforest (insects, frogs, distant birds), rain, distant thunder.

## MetaSound: `MS_Engine_Hero`

**Inputs:** `RPM` (float), `Throttle` (0–1), `Speed` (km/h), `Gear` (int), `GearChanged` (trigger), `ThrottleLift` (trigger).

```
For each RPM layer i (6 loops, on-load and off-load = 12 Wave Players, looping, all started on Play):
    layerCentre_i     = recorded RPM of the loop
    pitch_i           = RPM / layerCentre_i                       -> Wave Player "Pitch Shift" (semitones = 12*log2(pitch_i))
    gain_i            = triangular crossfade: max(0, 1 - |RPM - layerCentre_i| / spacing)   (equal-power: sqrt)
    onLoadGain_i      = gain_i * Throttle
    offLoadGain_i     = gain_i * (1 - Throttle)
Sum -> Mono Mixer -> Biquad Low-Pass (cutoff lerp 4k -> 18k with Throttle)  -- off-throttle sounds darker
    -> Saturator/Bitcrusher (subtle, drive with Throttle)                   -- grit at high load
+ Turbo/whine:  Sine/Saw oscillator, freq = RPM * 0.6, gain = Throttle * Speed/300 * 0.1
+ Shift:        GearChanged -> trigger "shift" one-shot + duck engine 6 dB for GearChangeTime
+ Pops:         ThrottleLift (and RPM > 5000) -> Random Get from 6 pop samples, 2-4 repeats with 60-120 ms random delay
+ Wind:         Pink noise -> Band-pass (500-2k), gain = (Speed/300)^2
+ Tyres:        Skid loop gain = max wheel SlipMagnitude (sent from Blueprint) ; wet hiss gain = Speed * Wetness
Output: stereo, with "Engine" and "Exhaust" emitted from two Audio Components (front engine bay vs. rear exhaust)
```

**Make the chaser sound different:** use a lower RPM range (max 5,500), a heavier low-pass, and add `Rattle` and `SuspensionBang` triggers from a suspension-compression threshold.

## Doppler and pass-bys

The roadside shots (SH020, SH100, SH130, SH170) live or die by the pass-by.

- **Attenuation:** use a Sound Attenuation asset with *Natural Sound* falloff, an inner radius of 300 cm and a falloff of 20,000 cm. Turn on *Air Absorption* (low-pass with distance) and *Spatialisation* (HRTF/Binaural for headphones, panning for speakers).
- **Doppler:** compute it in the car Blueprint and send it to the MetaSound as `DopplerPitch`:
  ```
  toListener   = normalize(ListenerLocation - CarLocation)
  vRadial      = dot(CarVelocity, toListener)            // cm/s, + = approaching
  DopplerPitch = 34300 / (34300 - clamp(vRadial, -30000, 30000))
  ```
  Multiply every layer's pitch by `DopplerPitch`, and smooth it with a 50 ms one-pole filter to avoid zipper noise.
- **Designed whoosh:** in post, add a designed whoosh plus a sub-drop exactly on the closest-approach frame. Every big chase film does this.

## Getting audio out of Sequencer

- **Movie Render Queue ▸ Settings ▸ Output ▸ .wav Audio** renders the Sequencer audio tracks. Gameplay audio components only render if the cars are driven by the recorded takes during the render.
- More reliable: in **Take Recorder**, also record a **Submix** source (Audio ▸ Submix Recorder) of the engine audio while driving. That gives a clean engine stem per take.
- Export stems separately: hero engine, chaser engine, tyres/road, FX (pops, crash), ambience. Mixing them in a DAW gives the final control.

## Final mix guide

| Moment | Mix move |
|---|---|
| SH010 | Start in near silence: jungle ambience only, a distant thunder roll, then the engine creeping in |
| SH020 | Full doppler pass-by, the loudest moment so far; duck the ambience 10 dB under it |
| SH050–SH100 | Engines carry the mix; music enters at SH080 under the engines (not over them) |
| SH130 | **Drop everything** at take-off: low-passed wind, a heartbeat, a high sustained string note. **Slam** back at landing (+6 dB hit, sub boom) |
| SH150 | Crash: layered metal, glass, a tyre burst, then a debris tail |
| SH170 | The engine fades into the distance with a long reverb tail; jungle ambience returns; final music hit on the cut to black |

**Loudness targets:** −14 LUFS integrated for web or YouTube, and −24 LUFS (with dialnorm) for broadcast. Peak at −1 dBTP.
