# 05 — Niagara FX

Every system is driven by **User parameters** that the car Blueprint sets each tick ([03 §5](03-vehicles-chaos.md#5-blueprint-glue-per-tick)). Because those values are recorded with Take Recorder, the FX stay in sync with the driving.

For final renders, set every system's **Determinism** to on with a fixed **Random Seed**. Re-renders then match frame-for-frame, and temporal sub-samples don't flicker.

## Tyre smoke — `NS_TyreSmoke`

| Module | Setting |
|---|---|
| Emitter | GPU sprites, local space off |
| Spawn Rate | `User.Slip` remapped 0.2→1.0 to 0→400 particles/s; only when `User.Skidding` |
| Initialize | lifetime 2–5 s, size 40–120 cm, colour (0.6,0.6,0.62), alpha 0.3 |
| Velocity | inherit 30% of car velocity + random cone up/back 150 cm/s |
| Size over life | grows ×6 (smoke expands) |
| Drag | 2.5 (stops quickly behind the car) |
| Curl noise | strength 80, frequency 0.002 |
| Renderer | sub-UV smoke flipbook 8×8, **Lit** translucent; shadows on via Volumetric Self-Shadow, or use *Heterogeneous Volumes* for hero shots |

In headlights the smoke must be **lit**. Unlit smoke is the classic "game" giveaway.

## Water spray — `NS_WaterSpray`

- Spawns from the tyre contact point when `User.Wetness > 0`. Rate scales with speed, about 2,000/s at 250 km/h.
- **Rooster tail:** mesh droplets plus sprite mist, ejected backward-up from the rear tyres, with gravity and collision on the depth buffer.
- **Side sheet:** a ribbon or sprite fan from the front tyres in puddles. Trigger a burst on puddle entry using a Physical Material check.
- **Mist layer:** large soft sprites that hang in the air behind the car. They light up in the chaser's headlights, and in the low-angle shots SH020 and SH140 this looks incredible.

## Rain — `NS_Rain` (optional but recommended)

- Attach a camera-relative emitter box (40 m × 40 m × 20 m) to the active camera. Stretched streak sprites (motion-blurred look) fall at 900 cm/s.
- **Splashes:** use Depth-buffer collision. On collision, spawn a small crown-splash flipbook plus ripples. The ripples come from the puddle normal in the road material (`MPC_Weather.RainIntensity`).
- **Drops on lens:** for the interior and bumper shots, add a lens-droplet post-process material (refraction based on a screen-space droplet texture).

## Sparks — `NS_Sparks`

- Burst on scrape or contact events, such as the chaser hitting the barrier or the hero's splitter grounding on landing after the crest.
- Spawn 200–600 mesh or sprite sparks with velocity reflected off the contact normal and gravity.
  - Collision is on and bounces once.
  - Colour is emissive black-body 1,800–2,500 K, fading over 0.4 s.
- Add a matching quick **point light** (Niagara Light Renderer, 1 frame).

## Fireflies and moths — `NS_Fireflies`

- Volumetric scattering of tiny points in clearings.
  - Emissive (0.8,1,0.3) with slow pulsing alpha.
  - Curl-noise wander and avoid the cars (vector field away from the car velocity).
- **Moths in headlight beams:** spawn inside each headlight cone (attached to the car), with a short life. They make the beams feel volumetric.

## Leaves and debris kicked up — `NS_LeafVortex`

- Fallen leaves on the road get sucked into the car's wake. Spawn them on the road ahead of the car, then add a velocity impulse toward the wake when the car passes within 3 m, with tumbling mesh rotation.

## Ground mist — `NS_GroundMist`

- Large (8–15 m) soft sprites at road level with a very slow drift, alpha 0.05–0.1, and depth fade.
- Better still, in UE 5.4+ use **Heterogeneous Volumes / Sparse Volume Textures** (an OpenVDB fog bank from Houdini or EmberGen) for hero shots. They light physically correctly from the headlights.
- **Car wake:** add a mist displacement on the road with a radial force behind each car, so the mist swirls apart as the car tears through it.

## Exhaust — `NS_ExhaustPops`

- Pops on gear changes and throttle lift. Read `Gear` changes and throttle drops from the Blueprint, and fire a short burst:
  - an orange flame flipbook plus a light flash
  - a puff of heat-distortion sprites (refraction material)
- Pair it with the pop SFX in [07](07-audio-metasounds.md).

## Chaser crash

- Use a **Chaos Destruction** geometry collection for the SUV body panels and glass.
- Drive the break with a **Field System** (anchor plus strain) at impact.
- Add `NS_Sparks`, a dust and dirt burst (a Megascans debris mesh emitter), a glass-shard sprite burst and a **fire/smoke** plume.
  - Use the Fire/Smoke simulation from the **Niagara Fluids** plugin for a hero quality plume, or EmberGen VDB.
- Cache everything with **Chaos Cache Manager** before final render.
