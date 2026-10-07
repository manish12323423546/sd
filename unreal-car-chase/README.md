# Jungle Night Chase: Unreal Engine 5 production kit

A 60-second, final-quality car chase: a hypersport car tears down a mist-covered jungle road at night, with a searchlight SUV on its tail.

This folder holds everything you need to build it in **Unreal Engine 5.5 or newer**:

- editor scripts that set up the lighting, the cameras and edit, and the render
- a shot list and storyboard
- material, VFX and vehicle-physics recipes
- the render and grading pipeline

```
unreal-car-chase/
├── README.md                     <- you are here: overview + order of work
├── config/
│   └── DefaultEngine.ini.snippet  Lumen HWRT, VSM, Nanite, TSR, DX12 project settings
├── scripts/                      run inside the Unreal Editor (Python)
│   ├── chase_config.py           ALL paths, speeds, lighting values - edit this first
│   ├── chase_shots.py            the 17-shot list as data (lens, aperture, move, shake)
│   ├── chase_path.py             road spline + car/camera math (pure Python, unit-tested)
│   ├── ue_helpers.py             shared editor helpers
│   ├── 00_export_road_points.py  sample your real road spline into chase_config.py
│   ├── 01_setup_lighting.py      moonlight, sky, volumetric fog, cinematic post-process
│   ├── 02_build_sequence.py      Level Sequence: cars, headlights, 17 cine cameras, camera cuts
│   ├── 03_setup_render_queue.py  Movie Render Queue job: 4K EXR, 16 temporal samples, cvars
│   └── run_all.py                runs 01 -> 02 -> 03
├── tests/
│   └── test_chase_math.py        verifies the camera/car math outside Unreal
└── docs/
    ├── 01-project-setup.md        hardware, engine install, plugins, project settings
    ├── 02-environment.md          jungle road: landscape, PCG foliage, road spline, set dressing
    ├── 03-vehicles-chaos.md       Chaos Vehicle tuning, driving rig, Take Recorder workflow
    ├── 04-materials.md            car paint, glass, wet asphalt, foliage, decals - node recipes
    ├── 05-niagara-fx.md           tyre smoke, spray, rain, sparks, fireflies, dust
    ├── 06-shot-list-storyboard.md shot-by-shot storyboard + image-gen prompts for boards
    ├── 07-audio-metasounds.md     RPM-driven engine sound, doppler, mix
    └── 08-render-and-grade.md     Movie Render Queue, path tracer, ACES, Resolve grade
```

## Quick start (about 30 minutes to a playable previz)

1. **Create the project.** Start a UE 5.5+ *Film / Video & Live Events* blank project. Merge `config/DefaultEngine.ini.snippet` into `Config/DefaultEngine.ini`, then restart the editor.
2. **Enable the plugins** listed in [docs/01](docs/01-project-setup.md#plugins), including **Python Editor Script Plugin**.
3. **Build or open the level.** Create `/Game/JungleChase/Maps/L_JungleChase`, or use the real jungle level from [docs/02](docs/02-environment.md).
4. **Edit `scripts/chase_config.py`.** Point `HERO_CAR_CLASS`/`CHASER_CAR_CLASS` at your car Blueprints. If you leave them as they are, car-sized placeholder blocks are spawned instead.
5. **Run the scripts.** In the editor: **Tools ▸ Execute Python Script ▸ `scripts/run_all.py`**, or in the Cmd console:
   ```
   py "C:/path/to/unreal-car-chase/scripts/run_all.py"
   ```
6. **Play it back.** Open `SEQ_JungleChase_Master` and press Play. You now have a cut, lit, 60-second previz with headlight beams in the fog.
7. **Render.** Open **Window ▸ Cinematics ▸ Movie Render Queue** and press **Render (Local)**.

Re-running any script is safe: it deletes what it created last time and rebuilds.

## The pipeline: how a "final finish" chase is really made

| # | Stage | What you do | Doc |
|---|-------|-------------|-----|
| 1 | **Previz** | Run the scripts on a blockout road. Lock the timing and the edit before any polish. | this README |
| 2 | **Environment** | Landscape + spline road, PCG-scattered Nanite jungle, Megascans set dressing, wet road. | [02](docs/02-environment.md) |
| 3 | **Hero assets** | High-poly cars with clear-coat paint, real glass, IES headlights, brake glow. | [03](docs/03-vehicles-chaos.md), [04](docs/04-materials.md) |
| 4 | **Performance** | Drive both cars yourself with a wheel or pad and record with **Take Recorder**. Real driving looks real. | [03](docs/03-vehicles-chaos.md#4-record-real-driving-with-take-recorder) |
| 5 | **Cameras** | The scripts give you 17 cameras tied to the cars. Re-run them on the recorded takes, then hand-polish. | [06](docs/06-shot-list-storyboard.md) |
| 6 | **FX** | Tyre smoke, water spray, rain, sparks, dust, fireflies, mist (Niagara). | [05](docs/05-niagara-fx.md) |
| 7 | **Lighting** | Moonlight rig from the script, then a per-shot rim/kicker light pass. | [08](docs/08-render-and-grade.md#per-shot-lighting-pass) |
| 8 | **Sound** | MetaSound engine driven by RPM, doppler pass-bys, score. | [07](docs/07-audio-metasounds.md) |
| 9 | **Render + grade** | MRQ 4K 16-bit EXR, 16-32 temporal samples, ACES grade in DaVinci Resolve. | [08](docs/08-render-and-grade.md) |

## What "highest quality" honestly takes

- **Hardware:** RTX 4080 or 4090 (or 50-series), 64 GB+ RAM, 1 TB NVMe free. See [docs/01](docs/01-project-setup.md).
- **Assets:** Photoreal comes mostly from **scanned assets** (Fab / Quixel Megascans) and a **licensed, high-poly car**. The scripts and recipes here make them look right; they can't replace them.
- **Render time:** Expect roughly 1–3 minutes per 4K frame with Lumen at the settings in `03_setup_render_queue.py`. That is about 24–72 hours for 1,440 frames on one GPU. The path tracer is 5–20× slower, so use it only on 2–3 hero shots.
- **Time:** A solo artist needs about 4–8 weeks: 1 week previz and blockout, 2–3 weeks environment, 1 week cars and FX, 1 week polish, render and grade.

## Verifying the math without Unreal

```bash
python3 -m unittest discover -s unreal-car-chase/tests -v
```

The tests check that:

- the road is long enough for 260 km/h over 60 seconds
- the chaser never overlaps the hero
- the shots tile the timeline with no gaps
- no camera ends up inside a car
- no camera pans faster than 25° per frame (beyond that, motion blur strobes at 24 fps)
