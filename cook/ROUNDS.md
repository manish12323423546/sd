# Dwarka: round log

There are no reference images: the 10 attachments never reached the session, and the user chose to start without them. Shots are scored by zero-context critic subagents against the written brief, and each round's side-by-sides compare the previous round with the current one (`frames/rN_cmp_*.jpg`).

Shot list (src/shots.js): 01 hero bay · 02 aerial · 03 harbour · 04 temple low angle · 05 avenue · 06 ramparts · 07 ghats · 08 silhouette into the sun · 09 rooftop toward the sunset · 10 torana framing the temple.

| Round | Comp | Scale | Mat | Colour | Sky | Water | Detail | Variety | Slop | Weakest | Fix applied |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 45 | 40 | 30 | 35 | 40 | 50 | 35 | 25 | 55 | variety | (baseline) |
| 1 | 52 | 45 | 30 | 48 | 50 | 55 | 38 | 35 | 70 | materials | AO/grime, anti-tiling, post grade (r2) |
| 4 | 62 | 55 | 38 | 50 | 58 | 60 | 45 | 40 | 80 | materials | lime washes, paving (r5) |
| 5 | 62 | 45 | 35 | 52 | 42 | 55 | 45 | 38 | 82 | materials | anti-tiling scale bug, clouds, plaster share (r6-r7) |
| 7 | 58 | 48 | 32 | 52 | 60 | 55 | 40 | 36 | 74 | materials | lamplit windows, 720p critic input (r8-r9) |
| 9 | 58 | 45 | 38 | 62 | 60 | 55 | 42 | 40 | 80 | materials | reflection blobs, gateway, tower clones (r10) |

## Round 0: baseline
- First full build: procedural sky/clouds, planar-reflection sea with sun glitter and shore foam, a Jagat-Mandir-style main temple, precinct, ~1500 houses, ramparts with bastions, ghats, harbour, boats, palms, flags.
- Critic: one sandstone brick tile everywhere, a lavender-grey sky, the gateway reading as a torii with a gold orb, cloned towers and houses, the city a flat strip in the wide shots.

## Round 1: colour plus materials (critic: variety, but colour comes first in the brief)
- Sky gradient re-keyed: hot gold horizon to apricot to warm blue; peach on the anti-sun side instead of grey; clouds lit warm gold and salmon.
- Water: high-frequency octaves cut to stop grey noise.
- New lime-plaster material for houses (70%); finer, softer ashlar for the temples.
- About 50 neighbourhood temples with porches and flags added to the skyline; ramparts lowered 3.5 m so the city shows over them.
- Torana rebuilt in the Sanchi type (square carved posts, three straight architraves with volutes, a dharmachakra on top); the orb is gone.
- Harbour silos replaced with battered crenellated towers with chhatris.

## Round 2: materials (critic r1 weakest: materials 30; scores r1: comp 52 · scale 45 · mat 30 · colour 48 · sky 50 · water 55 · detail 38 · variety 35 · slop 70)
- Per-vertex ambient occlusion and grime gradient up the first 3 m of every wall; dark wet tide band below 1.6 m on all masonry.
- Masonry shader: anti-tiling (second rotated, scaled sample blended by world noise), world-space macro tint variation, vertical rain streaks.
- Plaster "leopard spot" loss patches cut back to rare, large patches.
- Palette widened: rose-gold and red sandstone; painted shutters and doors (madder, indigo-teal, turmeric) on about 22% of openings.
- Post chain: HDR target, bloom only on the sun and glitter (threshold 2.2), ACES, then a grade (S-curve, warm highlights, umber shadows, vignette, grain).
- Removed the distant mainland strip (the orange horizon smear the critic flagged twice); glitter clamped.

## Round 3: scale and the shot that failed (07 ghats invisible)
- Root cause: terrain was covering the ghat steps. groundHeight now carves the ghat sector down to the step profile.
- About 1,800 procedural people (sari, dhoti, turban, pot-on-head variants; five skin tones; nine garment colours), market stalls with produce, and bullock carts along the avenues; pilgrims on the ghats; crowds in the precinct and on the quay.
- 30% of bastions are now square towers with galleries and pyramidal roofs; round tower heights and radii vary.

## Round 4: water and sky realism
- Reflection distortion made anisotropic (long vertical streaks, slight sideways smear): the city now mirrors in the sea instead of breaking into orange speckle.
- Anti-sun sky changed from grey-lavender to a rose Belt of Venus.
- Clouds domain-warped into heaped masses instead of pure streaks.
- Ghats shot re-blocked as an elevated three-quarter view down the flight of steps.

## Round 5: materials and colour monotony (critic r4 weakest: materials 38; scores r4: comp 62 · scale 55 · mat 38 · colour 50 · sky 58 · water 60 · detail 45 · variety 40 · slop 80)
- Plaster texture made neutral, with hue driven per house by lime washes: ochre 34%, whitewash 28%, rose 16%, weathered grey 15%, indigo 7%.
- Analytic flagstone paving shader on avenues, ring roads and the temple courtyard (staggered slabs, per-slab tint, dusty joints).
- Cooler sky-blue hemisphere fill and a teal-violet shadow lift in the grade, against the warm key.
- Zenith darkened so upward shots (04, 10) read as dusk, not midday blue.
- Palms: 30% short, dense date palms; coconut palms taller, with fuller fronds.

## Round 6: materials (critic r5 weakest: materials 35, "blocks read as toy bricks")
- Root cause: the anti-tiling pass sampled the masonry at 0.37× UVs, overlaying a ghost block pattern 2.7× too large. It now samples at 1.618× with a 90° rotation.
- Carved niche friezes and twin lotus cornices on every tier of the temple platform.
- Zenith shifted to a dusk violet (critics kept calling 04 and 10 "midday blue").

## Round 7: sky (critic r5: clouds read as paint daubs, sky 42)
- Cloud domain warp cut from 0.9 to 0.4; detail noise erodes the edges into wisps; softer density ramp.
- 85% of houses now lime-plastered (was 70%), so brick-looking ashlar is mostly kept for temples and fortifications.

## Rounds 8-9: materials and composition (critic r7: materials 32 · comp 58 · scale 48 · colour 52 · sky 60 · water 55 · detail 40 · variety 36 · slop 74)
- Previews and critic input moved from 640×360 to 1280×720: the surface detail the critics kept missing was below preview resolution.
- Black window voids now about 30–50% lamplit (warm emissive, varied per window; denser toward the centre). Sanctum and gate doorways glow faintly.
- Torana volutes were reading as "C-hooks". They're replaced with face-on drum ends carrying spiral relief, as at Sanchi.
- Hero reframed (fov 36 to 28, closer): the main shikhara is about twice its former size in frame.
- r8 blew the windows out to white; r9 drops the emissive from 2.4 to 0.75.

## Round 10: fixing named defects (critic r9 weakest: materials 38, but its top concrete bugs were these)
- Palm crowns reflected as dark "floating weeds": foliage moved to its own render layer that the reflection camera skips. It still renders, lights and casts shadows.
- Twin harbour towers made distinct: the north pier now has a tall square tower with a gallery and pyramidal roof.
- Sanchi torana (a Buddhist form, off-brief for Dwarka) replaced with a Gujarati kirti-torana of the Vadnagar/Modhera type: square-to-octagonal-to-round carved pillars, bracket capitals, a seven-lobed cusped arch, a banded architrave, and a crest of miniature pediments. The chakra prop is gone.
- Vegetation kept 13 m clear of avenue centrelines (no more giant palm in the middle of shot 05).
- Temple hall interior now dimly lamplit instead of black voids between the pillars.
