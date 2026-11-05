# Dwarka: round log

There are no reference images: the 10 attachments never reached the session, and the user chose to start without them. Shots are scored by zero-context critic subagents against the written brief, and each round's side-by-sides compare the previous round with the current one (`frames/rN_cmp_*.jpg`).

Shot list (src/shots.js): 01 hero bay · 02 aerial · 03 harbour · 04 temple low angle · 05 avenue · 06 ramparts · 07 ghats · 08 silhouette into the sun · 09 rooftop toward the sunset · 10 torana framing the temple.

| Round | Comp | Scale | Mat | Colour | Sky | Water | Detail | Variety | Slop | Weakest | Fix applied |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 45 | 40 | 30 | 35 | 40 | 50 | 35 | 25 | 55 | variety | (baseline) |

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
