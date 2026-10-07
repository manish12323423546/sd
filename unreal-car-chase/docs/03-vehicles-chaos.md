# 03 — Vehicles: Chaos physics, driving rig and recorded performances

Two cars:

| | Hero | Chaser |
|---|---|---|
| Type | Mid-engine hypercar (AWD, ~1,200 hp) | Lifted armoured 4×4 SUV with roof searchlight |
| Look | Gloss clear-coat paint (deep orange or electric blue), carbon aero, LED light signature | Matte black, bull bar, mud-caked lower body |
| Mass | 1,450 kg | 2,600 kg |
| Behaviour | Planted, fast direction changes, brief power slides | Heavy, body roll, bouncing over ruts, brute force |

## 1. Getting the car assets

- **Fab:** search for "hypercar", "supercar" or "sports car" with *Unreal Engine* format and **rigged/vehicle-ready**. Check the licence allows film/commercial use.
- **Or bring your own.** Import a high-poly model (500k–5M tris, Nanite on body panels) from Blender/Maya. It needs:
  - a **skeletal mesh** with a root bone and 4 wheel bones (`wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`), wheel pivots exactly at the hub centres, and X-forward orientation
  - separate material slots: paint, carbon, glass, tyre, rim, brake disc, calipers, head/tail light lenses, emissive LEDs, interior
  - a **Physics Asset** with a simple convex hull or boxes for the body and **spheres for the wheels**. Set the wheel bodies to *Kinematic* or delete their constraints: Chaos Vehicles simulates wheels itself.
- **Note on Nanite:** Nanite works on skeletal meshes from UE 5.5 (experimental) and has been on static meshes for a long time. A common approach is to keep the body as **Nanite static meshes attached to the skeletal mesh bones**, which gives full-detail panels with wheels still animated by the skeleton.

## 2. Vehicle Blueprint

1. Create **Blueprint Class ▸ WheeledVehiclePawn** and name it `BP_HeroSupercar`.
2. Assign the skeletal mesh and an **Anim Blueprint** with the *Wheel Controller* node (Vehicle Anim Instance). This spins and steers the wheels and moves the suspension.
3. Create two **ChaosVehicleWheel** Blueprints: `BP_Wheel_Front` and `BP_Wheel_Rear`.
4. In **Chaos Vehicle Movement Component ▸ Wheel Setups**, add four entries with the bone names and wheel classes.
5. Add components:
   - 2× **SpotLight** headlights (IES profile, 2,000–3,000 lm, volumetric scattering 3–5)
   - 2× **RectLight** tail lights (small, red)
   - brake-light emissive driven from the brake input
   - an **Audio** component for the MetaSound engine (see [07](07-audio-metasounds.md))
   - 4× **Niagara** components at the wheel contact points (smoke/spray, see [05](05-niagara-fx.md))
   - a **SpringArm + Camera** for driving, plus extra arms for the rig mounts used in shots SH040, SH070 and SH150

> If your car Blueprints already have their own lights, set `ADD_CAR_LIGHTS = False` in `scripts/chase_config.py` so the sequence script doesn't add a second set.

## 3. Tuning: starting values

These are starting values, not gospel. Change one group at a time and test-drive the same corner each time.

### Chaos Vehicle Movement Component (hero)

| Section | Property | Value | Notes |
|---|---|---|---|
| Vehicle Setup | Mass | 1450 | |
| | Drag Coefficient | 0.30 | top speed is set by drag + torque |
| | Downforce Coefficient | 0.9 | more grip at speed; stops it floating over crests |
| | Center Of Mass Override | (0, 0, -15) | low CoM = less roll and fewer flips |
| | Chassis Width / Height | 200 / 115 | |
| Engine | Max Torque | 1000 | Nm |
| | Max RPM | 8500 | |
| | Engine Idle RPM | 1000 | |
| | Engine Brake Effect | 0.15 | |
| | Engine Rev Up MOI | 4 | lower = snappier revs (sounds great) |
| | Engine Rev Down Rate | 800 | |
| | Torque Curve | rises to 1.0 at 5500, holds to 7500, 0.85 at 8500 | |
| Transmission | Automatic | ✔ | |
| | Forward Gear Ratios | 3.2, 2.2, 1.65, 1.3, 1.05, 0.85, 0.7 | 7-speed DCT |
| | Final Ratio | 3.4 | |
| | Change Up / Down RPM | 7800 / 4500 | |
| | Gear Change Time | 0.08 | dual-clutch speed |
| Differential | Type | All Wheel Drive | |
| | Front Rear Split | 0.35 | rear-biased AWD: stable but slides on throttle |
| Steering | Steering Type | Ackermann | |
| | Steering Curve | 1.0 at 0 km/h → 0.35 at 250 km/h | prevents twitchiness at speed |
| Stability (Torque Control) | Enabled, Yaw Torque Scaling 2 | | helps the controller hold a slide |
| Arcade Control | Target Rotation Control | off | turn on only if a wheel isn't available and gamepad driving looks robotic |

### Wheels

| Property | Front | Rear |
|---|---|---|
| Wheel Radius / Width | 36 / 26 | 37 / 33 |
| Max Steer Angle | 38 | 0 |
| Affected By Handbrake | ✘ | ✔ |
| Affected By Engine | ✔ | ✔ |
| Friction Force Multiplier | 3.0 | 3.2 |
| Cornering Stiffness | 1200 | 1100 (lower = easier to slide) |
| Slip Threshold / Skid Threshold | 25 / 25 | 20 / 20 (drives the smoke/skid FX) |
| Max Brake Torque | 4500 | 3000 |
| Max Hand Brake Torque | 0 | 6000 |
| Suspension Max Raise / Drop | 6 / 9 | 6 / 9 |
| Spring Rate | 400 | 450 |
| Spring Preload | 80 | 90 |
| Damping Ratio | 0.55 | 0.55 |
| Suspension Smoothing | 4 | 4 |
| Rollbar Scaling | 0.6 | 0.4 |

**Chaser SUV:** use mass 2600, CoM (0, 0, +10) for more body roll, torque 800, rev-up MOI 8, suspension travel 18/22, spring rate 200, damping 0.35. The bouncier, heavier motion contrasts with the hero's precision.

## 4. Record real driving with Take Recorder

Keyframed paths (what `02_build_sequence.py` makes) are fine for previz, but **real driving** gives the micro-corrections, weight transfer and imperfect lines that make a chase believable.

1. **Input.** Map throttle, brake, steer, handbrake and gear to Enhanced Input. Use **Raw Input** for a wheel.
   - Add a steering deadzone of 0.02.
   - Use a throttle response curve (exponent 1.5–2) for finer control.
2. **Practice mode.** Set `t.MaxFPS 60` and fixed physics substepping (*Project Settings ▸ Physics ▸ Substepping*, max substep delta 0.008), so the car behaves the same every take.
3. **Record the hero.**
   - Open **Window ▸ Cinematics ▸ Take Recorder** and add *Player* as a source. Set *Record Type: Possessable* and record **transform + skeletal animation (wheels)**.
   - Press Record, then **Play** (Simulate). Drive the whole route at the limit. Do 5–10 takes.
4. **Record the chaser against the hero.**
   - Add the best hero take to a sequence.
   - Play it back while possessing the chaser and recording.
   - The chaser now reacts to the hero, with real near-misses and real dive-bombs into corners.
5. **Assemble.** Drop both takes into `SEQ_JungleChase_Master`, replacing the keyframed car bindings. Re-run only the camera part of the script, or nudge the cameras by hand. The script's camera maths work off the road path, so for recorded takes you can also:
   - parent rig cameras (bumper/wheel/interior) directly to the car with the Sequencer **Attach** track
   - use **Camera Rig Rail** / **Camera Rig Crane** actors for dolly/crane moves
   - set **Focus Tracking** to the car's actor
6. **Clean up the curves.** In Sequencer's Curve Editor, apply a light **Smooth** filter on Z only. Never smooth X/Y: you'd lose the speed variation.

### Stunts that are hard to drive

- **The crest jump (SH130):** record it driven. If it isn't spectacular enough, raise the crest 50 cm, or add a hidden kicker ramp (an invisible collision mesh).
  - For slow motion, put SH130 in a **subsequence** and set its *Play Rate* to 0.4.
  - Raise `TEMPORAL_SAMPLES` to 32 for that shot. Slow motion shows sampling artefacts.
- **The chaser crash (around SH160):** swap the chaser for a **Chaos Destruction Geometry Collection** at the moment of impact.
  - Use a pre-fractured body panel set, glass with Voronoi fracture and a few bumper pieces.
  - Record the simulation with Take Recorder, or cache it with **Chaos Cache Manager**, so it renders deterministically.
- **Near misses with foliage:** let the car physically clip foliage that has **Interactive Foliage** or Niagara leaf bursts at the contact point.

## 5. Blueprint glue (per tick)

On `BP_HeroSupercar` **Event Tick**:

```
Speed      = VehicleMovement.GetForwardSpeed() * 0.036          // cm/s -> km/h
RPM        = VehicleMovement.GetEngineRotationSpeed()
Gear       = VehicleMovement.GetCurrentGear()
for each wheel i (0..3):
    WS = VehicleMovement.GetWheelState(i)                        // FWheelStatus
    SmokeNiagara[i].SetFloatParameter("User.Slip", WS.SlipMagnitude)
    SmokeNiagara[i].SetBoolParameter ("User.Skidding", WS.bIsSkidding)
    SmokeNiagara[i].SetVectorParameter("User.ContactPoint", WS.ContactPoint)
    SprayNiagara[i].SetFloatParameter("User.Wetness", PhysMat(WS.PhysMaterial) == Wet ? 1 : 0)
EngineAudio.SetFloatParameter("RPM", RPM)
EngineAudio.SetFloatParameter("Throttle", ThrottleInput)
EngineAudio.SetFloatParameter("Speed", Speed)
BrakeLightMID.SetScalarParameterValue("BrakeGlow", BrakeInput > 0.05 ? 40 : 4)
BrakeDiscMID.SetScalarParameterValue("Heat", FInterpTo(Heat, BrakeInput * Speed / 250, dt, 0.5))
```

Mark these values with **Expose to Cinematics** where you want to keyframe them directly, for example brake glow in a slow-motion shot.
