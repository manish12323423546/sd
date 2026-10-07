# 01 — Project setup

## Hardware

| | Minimum (previz) | Recommended (final 4K) |
|---|---|---|
| GPU | RTX 3070 8 GB | RTX 4090 24 GB / RTX 5090 (VRAM matters most: Nanite foliage + 4K textures) |
| CPU | 8 cores | 16+ cores (shader compiles, PCG, Niagara) |
| RAM | 32 GB | 64–128 GB |
| Disk | 300 GB NVMe | 1 TB+ NVMe (engine 60 GB, Megascans 100 GB+, EXR renders ~50 MB/frame) |
| Input | Gamepad | Force-feedback wheel (Logitech G923 / Fanatec), for believable driving takes |

## Engine and project

1. Install **Unreal Engine 5.5 or newer** from the Epic Games Launcher. Include *Editor symbols for debugging* only if you'll write C++.
2. Create a new project: **Film / Video & Live Events ▸ Blank**, with Starter Content off and *Raytracing* ticked.
3. Merge [`../config/DefaultEngine.ini.snippet`](../config/DefaultEngine.ini.snippet) into `Config/DefaultEngine.ini`.
4. Restart the editor and let shaders compile. The first compile takes 20–60 minutes.
5. Set up source control: **Git LFS** (track `*.uasset *.umap *.exr *.wav`) or Perforce. Projects of this size reach 50–150 GB.

## Plugins

Enable these in **Edit ▸ Plugins**, then restart:

| Plugin | Why |
|---|---|
| **Python Editor Script Plugin** | runs the setup scripts in `../scripts` |
| **Editor Scripting Utilities** | asset/actor scripting helpers (built in on 5.4+) |
| **Chaos Vehicles** | wheeled-vehicle physics |
| **Movie Render Queue** + **MRQ Additional Render Passes** | final rendering, EXR AOVs |
| **Take Recorder** | record real driving into Sequencer |
| **Procedural Content Generation Framework (PCG)** + **PCG Geometry Script Interop** | jungle scattering along the road |
| **Landmass** + **Water** | terrain sculpting, river crossing / puddles |
| **Niagara** (on by default) | all FX |
| **MetaSounds** (on by default) | engine audio |
| **Raw Input** | steering wheel support |
| **Fab** | asset import from Fab / Quixel Megascans |
| **Camera Shake Previewer** (optional) | preview shakes in the viewport |

## Content folder layout

The scripts expect this layout. Paths are configurable in `scripts/chase_config.py`.

```
/Game/JungleChase/
  Maps/          L_JungleChase (persistent), L_JungleChase_Lighting, L_JungleChase_FX (sub-levels)
  Vehicles/      BP_HeroSupercar, BP_ChaserSUV, physics assets, tire configs
  Environment/   Megascans, PCG graphs, road meshes, decals
  Materials/     M_CarPaint, M_Glass, M_WetAsphalt, M_Foliage_Master, MF_Wetness
  FX/            NS_TyreSmoke, NS_WaterSpray, NS_Rain, NS_Sparks, NS_Fireflies, NS_Dust
  Audio/         MS_Engine_Hero, MS_Engine_Chaser, SFX, Music
  Cinematics/    SEQ_JungleChase_Master (+ shot sub-sequences if you split it)
```

**Use World Partition** for the jungle level so that only nearby cells stream in. Disable **Enable Streaming** during MRQ renders by loading all cells, or by adding a `World Partition Builder` step. Otherwise distant hills can pop in.

## Scalability while you work

Run the editor viewport at **Settings ▸ Engine Scalability ▸ High** with Screen Percentage 50–75% while building. Switch to **Cinematic** only for look-dev reviews. The render queue applies full cinematic quality automatically.
