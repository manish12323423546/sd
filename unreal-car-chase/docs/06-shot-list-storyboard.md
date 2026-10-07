# 06 — Shot list and storyboard

**Title:** *Jungle Night Chase* · **Length:** 60 s · **Frame rate:** 24 fps · **Aspect:** 16:9 (2.39:1 scope optional, see [08](08-render-and-grade.md#aspect-ratio)) · **Shots:** 17

The shots below are defined as data in [`../scripts/chase_shots.py`](../scripts/chase_shots.py). `02_build_sequence.py` turns each one into a keyed Cine Camera and a Camera Cuts section. To change a shot, edit it there and re-run the script.

## Story beats

| Act | Time | Beat |
|---|---|---|
| 1 — Reveal | 0–12.5 s | Silence and mist. Then the hero car tears out of the dark. A beat later, the chaser's searchlight cuts through the trees behind it. |
| 2 — Pressure | 12.5–30 s | The chaser closes the gap. The jungle gets tighter and the cutting gets faster (shots drop from about 4 s to 2–3 s). |
| 3 — Crest & escape | 30–60 s | Peak tension: a dutch angle, the chaser at its closest. Then the crest jump in slow motion, the chaser loses it, the hero escapes into the mist, and we fade to black. |

## Shot by shot

**Lens notes:**

- **Wide (18–24 mm)** for speed and environment.
- **Normal (35–50 mm)** for character.
- **Long (85–135 mm)** for compression and danger: the chaser feels on top of the hero.

**Shutter:** 180° throughout, except SH130 (slow motion), which uses 270° for a dreamier blur.

| # | Time | Shot | Lens / f-stop | Camera move | Action | Sound |
|---|---|---|---|---|---|---|
| SH010 | 0.0–4.5 | **Aerial reveal** | 24 mm f/5.6 | Drone descends through canopy mist toward the road | Moonlit jungle, mist. Headlight beams appear through fog, then the hero bursts into frame | Insects, distant thunder, then a faint engine rising |
| SH020 | 4.5–7.0 | **Roadside whip** | 35 mm f/2.0 | Locked low in the ferns, whip-pans as the car passes | Hero rips past about 9 m from lens; ferns thrash in its wake | Massive doppler pass-by, leaves rustling |
| SH030 | 7.0–10.0 | **Front reverse track** | 50 mm f/2.0 | Arrow-car rig reversing ahead of the hero, slowly closing | Hero's face-on light signature. Behind it, through mist, the chaser's lights and searchlight appear | Engine on-throttle, second engine (lower, diesel) enters |
| SH040 | 10.0–12.5 | **Bumper low** | 18 mm f/4 | Hard-mounted front quarter | Wheel, wet tarmac, spray, foliage streaking | Tyre roar, gravel spit |
| SH050 | 12.5–15.0 | **Chaser POV** | 85 mm f/2.8 | Over the chaser's hood | Long-lens compression; hero's tail lights dead ahead, searchlight on it | SUV engine dominant, searchlight hum |
| SH060 | 15.0–18.0 | **Side track** | 35 mm f/2.2 | Parallel tracking, drifts forward along the car | Tree trunks flash between lens and car | Rhythmic whoosh of trees (sync to cuts) |
| SH070 | 18.0–20.0 | **Wheel arch** | 24 mm f/2.8 | Mounted, aimed at rear wheel | Hard brake for the hairpin: discs glow orange, then a downshift and an exhaust pop | Brake squeal, downshift blip, pop |
| SH080 | 20.0–24.0 | **Aerial chase** | 35 mm f/5.6 | Drone behind and above both, descending | Two sets of beams carving fog through the hairpin; scale of the jungle | Score kicks in |
| SH090 | 24.0–27.0 | **Interior** | 24 mm f/2.8 | Over-shoulder, mounted | Road rushes at windscreen; mirror fills with chaser lights | Muffled interior engine, gear whine, heartbeat-like sub |
| SH100 | 27.0–30.0 | **Telephoto approach** | 135 mm f/2.8 | Planted far down the road, small pan | Both cars barrel straight at camera, stacked by compression | Rising engines, score build |
| SH110 | 30.0–33.0 | **Front 3/4 close, dutch** | 35 mm f/1.8 | Close tracking, 4° dutch | Peak tension: the chaser is right there | Engines at redline |
| SH120 | 33.0–36.0 | **Chaser side** | 35 mm f/2.2 | Tracking the chaser's flank | Searchlight swings, SUV slams over ruts, body roll | Suspension bangs, diesel growl |
| SH130 | 36.0–40.0 | **Crest jump (slow-mo)** | 18 mm f/4 | Worm's-eye from the verge at the crest | Hero goes airborne over the crest in silhouette against the moon, retimed to 40% | Sound drops out: only wind and a heartbeat, then a SLAM on landing |
| SH140 | 40.0–44.0 | **Chaser rear** | 50 mm f/2.8 | Behind the chaser looking past it at the hero | Chaser follows over the crest, lands badly, fishtails | Crunch, tyre squeal |
| SH150 | 44.0–48.0 | **Rear mount look-back** | 28 mm f/2.8 | Mounted on the hero's diffuser | Chaser's lights fill frame, then it loses the rear end and spins off into the trees | Impact, glass |
| SH160 | 48.0–53.0 | **Hero orbit** | 28 mm f/2.0 | 140° orbit around the hero | Beauty shot of the hero pulling away, chaser's wreck glowing behind | Score swells, engine settles into a cruise |
| SH170 | 53.0–60.0 | **Crane pull-away** | 24 mm f/5.6 | Planted high at the roadside, pans as the car passes | Tail lights shrink into the mist. Fade to black at 59 s | Engine fades, jungle returns, final score hit |

## Coverage and editing notes

- **Tempo:** the shots average 4 s in Act 1, 2.5–3 s in Act 2 and 4–7 s in Act 3. The slow motion and the release need room to breathe.
- **Screen direction:** the hero always travels **left → right** on screen in side shots, and the chaser follows the same way.
  - Crossing the line is allowed once, deliberately, at SH110 for disorientation.
  - In `chase_shots.py`, `offset` right (+Y) is camera-right of the car, so keep side shots on the same side of the line.
- **Handles:** each camera is keyed one frame beyond its cut range, so motion blur at the cut frame is correct. Add more handles if you plan to re-edit in Resolve.
- **Retiming SH130:** move it into a subsequence (right-click the shot ▸ *Convert to Subsequence*), set the subsequence's *Play Rate* to 0.4, and raise MRQ temporal samples to 32 for that shot.

## Storyboard frames: image-generation prompts

Use these to make boards in Midjourney, Flux, Nano Banana or Gemini, or with the platform's storyboard tools.

**Keep consistent across every frame:**

> *photoreal cinematic film still, moonlit tropical rainforest road at night, low ground mist, wet cracked asphalt, volumetric god-rays through dense canopy, orange mid-engine hypercar with thin LED light signature, matte black lifted armoured SUV with roof searchlight, anamorphic look, 35mm film grain, cool blue moonlight with warm headlight highlights, shot on ARRI Alexa*

| # | Prompt (add the style block above) |
|---|---|
| SH010 | high aerial drone view looking down through misty jungle canopy at a winding road, two headlight beams cutting through fog in the distance, 24mm |
| SH020 | ground-level view from inside roadside ferns, orange hypercar blurring past left to right, motion-blurred ferns in foreground, water spray off tyres, 35mm |
| SH030 | front view of orange hypercar speeding toward camera on wet jungle road, LED headlights flaring, far behind it a pair of headlights and a searchlight beam in the fog, 50mm shallow depth of field |
| SH040 | extreme low camera mounted on front wheel of hypercar, spinning wheel and wet asphalt streaking, foliage blur, 18mm |
| SH050 | over the hood of a black SUV at night, 85mm compressed view of an orange hypercar's red tail lights ahead in the searchlight beam, rain spray |
| SH060 | side tracking shot of orange hypercar at speed, dark tree trunks blurring in the foreground between camera and car, moonlight rim on the bodywork, 35mm |
| SH070 | close-up of hypercar rear wheel arch, carbon-ceramic brake disc glowing orange-hot under braking, mud spray, exhaust flame pop, 24mm |
| SH080 | aerial chase shot from behind and above, black SUV following an orange hypercar through a hairpin in a misty jungle valley, two sets of headlight beams in the fog |
| SH090 | interior over-the-shoulder shot from inside a hypercar cockpit at night, road rushing toward the windscreen, rear-view mirror filled with harsh white headlights |
| SH100 | 135mm telephoto view down a straight jungle road, hypercar and SUV headlights stacked by lens compression, heat-shimmer mist, strong lens flare |
| SH110 | tight front three-quarter of the hypercar with a 4 degree dutch angle, the SUV's bull bar looming right behind, searchlight flare, 35mm f/1.8 |
| SH120 | side view of a black armoured SUV slamming over ruts, body roll, roof searchlight sweeping across jungle trees, mud flying, 35mm |
| SH130 | worm's-eye view from road verge, orange hypercar airborne over a road crest in silhouette against a huge moon, mist and water droplets suspended, slow motion, 18mm |
| SH140 | from behind a black SUV landing hard after a crest, sparks under its bumper, hypercar tail lights ahead, 50mm |
| SH150 | rear-mounted camera on hypercar looking back, black SUV fishtailing and spinning off the road into dense foliage, glass and debris |
| SH160 | beauty orbit shot of orange hypercar on a wet jungle road, moonlight reflections across the clear-coat paint, distant orange glow of a wreck in the mist behind, 28mm |
| SH170 | high wide roadside view, hypercar's red tail lights disappearing into mist down the jungle road, fireflies, quiet, end of film |
