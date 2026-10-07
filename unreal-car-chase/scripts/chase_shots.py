"""
Shot list for the 60-second "Jungle Night Chase" sequence.

Each shot becomes a Cine Camera Actor plus a section on the Camera Cuts track.
docs/06-shot-list-storyboard.md describes the same shots for the storyboard.

Fields
  name           unique camera name
  start / end    seconds on the master timeline
  mode           "follow"  camera rides along with `subject` at `offset` (-> `offset_end`)
                 "static"  camera planted at `offset` from where `subject` is at `anchor`
                           (0..1 through the shot) and pans to follow it (roadside cam)
                 "orbit"   camera circles `subject` at `radius`, `orbit_deg` over the shot
  subject        "hero" or "chaser" - which car the camera position is relative to
  look_at        which car the camera aims at (defaults to subject)
  offset         (forward, right, up) in cm, relative to the subject car
  look_offset    (forward, right, up) aim point relative to the look_at car
  focal_mm       lens focal length
  fstop          aperture - lower = shallower depth of field
  shake          handheld/rig vibration amplitude in degrees (0 = locked off)
  dutch_deg      camera roll for tension
  mounted        camera is rigged onto the subject car (rides inside its bounds)
  lock_rotation_to_car + aim  hard-mounted rig cameras (bumper/door/interior)
"""

SHOTS = [
    # --- ACT 1: the reveal -------------------------------------------------
    {
        "name": "SH010_AerialReveal", "start": 0.0, "end": 4.5, "mode": "follow",
        "offset": (3500, -1200, 2600), "offset_end": (900, -600, 1400),
        "look_offset": (1500, 0, 0), "focal_mm": 24, "fstop": 5.6, "shake": 0.08,
        "note": "Drone drops through mist over the canopy; headlights cut through fog as the hero enters frame.",
    },
    {
        "name": "SH020_RoadsideWhip", "start": 4.5, "end": 7.0, "mode": "static", "anchor": 0.55,
        "offset": (0, 950, 45), "focal_mm": 35, "fstop": 2.0, "shake": 0.25,
        "note": "Ground-level camera in the ferns; hero screams past inches away, whip-pan follows it.",
    },
    {
        "name": "SH030_FrontReverse", "start": 7.0, "end": 10.0, "mode": "follow",
        "offset": (1100, 0, 110), "offset_end": (850, -60, 95),
        "look_offset": (0, 0, 70), "focal_mm": 50, "fstop": 2.0, "shake": 0.18,
        "note": "Arrow-car tracking backwards in front of the hero. Chaser's lights appear behind it.",
    },
    {
        "name": "SH040_BumperLow", "mounted": True, "start": 10.0, "end": 12.5, "mode": "follow",
        "offset": (260, -95, 35), "lock_rotation_to_car": True, "aim": (-2.0, 25.0),
        "focal_mm": 18, "fstop": 4.0, "shake": 0.35,
        "note": "Rig mount on the front quarter: wheel, wet asphalt and foliage streaking by.",
    },
    # --- ACT 2: the chase heats up -----------------------------------------
    {
        "name": "SH050_ChaserPOV", "mounted": True, "start": 12.5, "end": 15.0, "mode": "follow", "subject": "chaser", "look_at": "hero",
        "offset": (120, -40, 150), "look_offset": (0, 0, 60), "focal_mm": 85, "fstop": 2.8, "shake": 0.3,
        "note": "Over the chaser's hood, long lens compresses the gap. The hero's tail lights are the target.",
    },
    {
        "name": "SH060_SideTrack", "start": 15.0, "end": 18.0, "mode": "follow",
        "offset": (-150, 520, 80), "offset_end": (250, 480, 80), "focal_mm": 35, "fstop": 2.2, "shake": 0.15,
        "note": "Parallel tracking: trees whip between lens and car (foreground occlusion sells the speed).",
    },
    {
        "name": "SH070_WheelArch", "mounted": True, "start": 18.0, "end": 20.0, "mode": "follow",
        "offset": (-210, -120, 30), "lock_rotation_to_car": True, "aim": (0.0, 70.0),
        "focal_mm": 24, "fstop": 2.8, "shake": 0.4,
        "note": "Rear wheel close-up: spray, brake glow, tyre deformation.",
    },
    {
        "name": "SH080_AerialChase", "start": 20.0, "end": 24.0, "mode": "follow", "subject": "chaser", "look_at": "hero",
        "offset": (-1800, 400, 1500), "offset_end": (-900, 200, 900), "look_offset": (-300, 0, 0),
        "focal_mm": 35, "fstop": 5.6, "shake": 0.1,
        "note": "Drone behind and above both cars; both sets of headlights carve the volumetric fog.",
    },
    {
        "name": "SH090_Interior", "mounted": True, "start": 24.0, "end": 27.0, "mode": "follow",
        "offset": (-20, -30, 115), "lock_rotation_to_car": True, "aim": (-4.0, 0.0),
        "focal_mm": 24, "fstop": 2.8, "shake": 0.3,
        "note": "Over the driver's shoulder through the windscreen: road rushes at camera, rear-view mirror shows the chaser.",
    },
    {
        "name": "SH100_TeleApproach", "start": 27.0, "end": 30.0, "mode": "static", "anchor": 0.95,
        "offset": (3500, 250, 160), "look_offset": (0, 0, 60), "focal_mm": 135, "fstop": 2.8, "shake": 0.12,
        "note": "135 mm down the road: heat-haze-like compression, both cars barrelling straight at camera.",
    },
    # --- ACT 3: the crest and the escape -----------------------------------
    {
        "name": "SH110_FrontCloseHero", "start": 30.0, "end": 33.0, "mode": "follow",
        "offset": (600, 120, 80), "offset_end": (520, -80, 70), "focal_mm": 35, "fstop": 1.8, "shake": 0.2, "dutch_deg": 4.0,
        "note": "Tight front three-quarter, slight dutch angle as tension peaks.",
    },
    {
        "name": "SH120_ChaserSide", "start": 33.0, "end": 36.0, "mode": "follow", "subject": "chaser",
        "offset": (0, -480, 90), "offset_end": (200, -430, 90), "focal_mm": 35, "fstop": 2.2, "shake": 0.2,
        "note": "The chaser's side; its searchlight swings across the jungle.",
    },
    {
        "name": "SH130_CrestJump", "start": 36.0, "end": 40.0, "mode": "static", "anchor": 0.5,
        "offset": (0, -950, 10), "look_offset": (0, 0, 80), "focal_mm": 18, "fstop": 4.0, "shake": 0.15,
        "note": "Worm's-eye wide at the crest: hero goes airborne over camera. Retime to ~40% speed here in Sequencer.",
    },
    {
        "name": "SH140_ChaserRear", "start": 40.0, "end": 44.0, "mode": "follow", "subject": "chaser", "look_at": "hero",
        "offset": (-700, 150, 160), "look_offset": (0, 0, 60), "focal_mm": 50, "fstop": 2.8, "shake": 0.25,
        "note": "Chase vehicle in the foreground, hero ahead; chaser closing the gap.",
    },
    {
        "name": "SH150_RearMountLookBack", "mounted": True, "start": 44.0, "end": 48.0, "mode": "follow", "look_at": "chaser",
        "offset": (-260, 0, 70), "look_offset": (0, 0, 80), "focal_mm": 28, "fstop": 2.8, "shake": 0.35,
        "note": "Mounted on the hero's rear diffuser looking back: the chaser's lights fill the frame.",
    },
    {
        "name": "SH160_OrbitHero", "start": 48.0, "end": 53.0, "mode": "orbit",
        "radius": 800, "offset": (0, 0, 120), "orbit_start_deg": 30, "orbit_deg": 140,
        "focal_mm": 28, "fstop": 2.0, "shake": 0.1,
        "note": "Hero beauty orbit while it pulls away; chaser falls behind (plan an off-road crash for the chaser here).",
    },
    {
        "name": "SH170_CranePullaway", "start": 53.0, "end": 60.0, "mode": "static", "anchor": 0.15,
        "offset": (900, 900, 600), "look_offset": (300, 0, 0), "focal_mm": 24, "fstop": 5.6, "shake": 0.05,
        "note": "Final hold: tail lights shrink into the misty jungle. Fade to black.",
    },
]
