# 08 — Final lighting pass, rendering and grade

## Per-shot lighting pass

`01_setup_lighting.py` gives you the global moonlit rig. Film-quality lighting comes from **cheating per shot**, exactly as a DP would on set:

- **Rim/kicker lights for the cars.** Add Rect Lights (very soft, 5,000–8,000 K) as spawnables inside each shot's camera cut, behind and above the car, so the bodywork silhouette always reads against the dark jungle.
  - Use **Lighting Channels**: put the cars and their rim lights on channel 1 only, so the cheat doesn't light the forest.
- **Bounce from the road.** A large, dim, warm Rect Light under the car's front end imitates headlight bounce off wet tarmac onto the bumper and undercarriage.
- **Moon "sculpting".** Rotate the moon per shot (key the directional light rotation in each shot) so it rakes across the car in the hero shots: SH030, SH110, SH160. Nobody notices continuity of moon angle at night; everybody notices a flat-lit car.
- **Practical motivation.** In SH080 and SH120, the chaser's searchlight should pass over the hero. Key the searchlight's yaw so it does.
- **Contrast.** Keep at least about 4 stops between the car highlight and the shadowed jungle. Check with **Show ▸ Visualize ▸ HDR (Eye Adaptation)** and with the Pixel Inspector.

## Movie Render Queue

`03_setup_render_queue.py` builds the job. What each setting does:

| Setting | Value | Why |
|---|---|---|
| Output | 3840×2160, 24 fps, EXR 16-bit half, PIZ, multilayer | linear HDR for grading |
| Render pass | Deferred (Lumen) | quality/time sweet spot |
| Temporal samples | 16 (32 for slow-mo SH130) | true sub-frame motion blur: rotating wheels and passing trees look like film |
| Spatial samples | 1 | temporal samples already anti-alias |
| AA method override | None | accumulation does the AA, so there's no TSR ghosting on fast cars |
| Warm-up | 32 engine + render frames, per camera cut | Lumen GI, TSR history, Niagara sims and VSM caches settle; no flash on cut frames |
| High-res | texture sharpness bias −0.5, page to system memory | crisper 4K textures; avoids VRAM crashes |
| Console variables | see `CINEMATIC_CVARS` | maximum Lumen, shadow, DOF, motion blur and fog quality only while rendering |
| Game overrides | Cinematic quality | forces max LODs, streaming fully loaded |

**Shutter:** the script sets **Camera Setting ▸ Override Camera Shutter** to 180° (`SHUTTER_ANGLE`). For the slow-motion shot, use 270° in a separate job.

### Path Tracer for hero shots

Set `USE_PATH_TRACER = True` in `chase_config.py` and render only the hero shots: SH030, SH110, SH130 and SH160.

To render a subset, disable the other shots in the MRQ job's **Shot list**, or set the playback range.

- Use 512–2048 SPP with the **denoiser** on for stills-quality frames. Give the denoiser at least 128 SPP.
- Set max bounces to 12. Turn on reference DOF, reference motion blur (or temporal samples 8 + SPP 64 each) and reference atmosphere.
- Expect roughly 10–30 minutes per 4K frame.
- The path tracer ignores some Lumen-only cheats, so check emissive intensities and fog. Volumetric fog in the path tracer needs **Reference Atmosphere** plus a **Local Fog Volume** or a heterogeneous volume.

### Extra passes for compositing (optional)

With **MRQ Additional Render Passes**:

- **Object ID** (cryptomatte-style mattes for the cars, road and foliage)
- **World Depth** (depth-of-field and fog tweaks in comp)
- **Motion Vectors** (re-time or add blur in post)
- **Separate light passes**: render the headlights and the moon on separate layers using Stencil Layers, to rebalance in Nuke or Resolve Fusion

### Aspect ratio

For a 2.39:1 scope look:

- In `chase_config.py`, set `FILMBACK_MM = (36.0, 15.06)` and `OUTPUT_RESOLUTION = (3840, 1608)`.
- Re-run the scripts.

For the **anamorphic look**, use `Bloom Method: Convolution` with a horizontally stretched kernel texture (blue-tinted streaks on the headlights), and a 1.33–2× squeeze-style oval bokeh via **Lens Settings ▸ Squeeze Factor** (UE 5.4+).

### Render farm and time

- At about 2 minutes per frame × 1,440 frames, the job takes about 48 hours on one RTX 4090. Split it across machines with **MRQ ▸ Render (Remote)** and **Deadline**, or by running shot ranges on separate PCs from the command line:
  ```
  UnrealEditor-Cmd.exe "C:/Projects/JungleChase/JungleChase.uproject" /Game/JungleChase/Maps/L_JungleChase
      -game -MoviePipelineConfig="/Game/JungleChase/Cinematics/MRQ_Final" -windowed -resx=1280 -resy=720 -log
  ```
  Save the job's config as a preset asset `MRQ_Final` from the MRQ UI first.
- Render a **1080p, 4-temporal-sample proxy** of the whole sequence overnight first. Review it, fix it, then do the final.

## Colour pipeline and grade

1. **OCIO.** In MRQ add **Color Output ▸ OCIO**.
   - Use the ACES 1.3 Studio config. The source is the *Linear sRGB / Utility – Linear – Rec.709* working space, which is UE's internal space.
   - Set the destination to **ACEScg** and write the EXRs in ACEScg.
   - Alternatively, skip OCIO, write UE's linear EXRs and tag them *Linear Rec.709* in Resolve.
2. **DaVinci Resolve.**
   - Project setting: *DaVinci YRGB Color Managed ▸ ACEScct*.
   - Input: ACEScg (or Linear Rec.709).
   - Output: Rec.709 Gamma 2.4 for SDR, or Rec.2100 PQ for HDR.
3. **Grade, node by node:**
   1. **Balance:** neutralise, and set the exposure so the moonlit road sits around 18–25 IRE.
   2. **Look:**
      - teal-blue shadows and mids (moonlight)
      - warm, slightly desaturated highlights (headlights 3,200–4,000 K)
      - protect skin-like and orange tones so the hero car's paint pops
   3. **Contrast:** gentle S-curve; keep blacks rich but not crushed. The jungle must still have texture at 3–5 IRE.
   4. **Halation:** a red-orange glow around headlights and tail lights (Resolve *Halation* OFX or a glow node).
   5. **Film grain:** 35 mm, subtle. Add it in Resolve rather than in UE so it doesn't fight temporal accumulation (keep the UE grain low, as the script sets it).
   6. **Vignette and windows:** draw the eye to the car per shot with tracked power windows.
   7. **Lens:** slight chromatic aberration, and gate weave only if you want a filmic feel.
4. **Deliver:**
   - master: ProRes 4444 XQ (or DNxHR 444)
   - web: H.265 10-bit 4K at 50–80 Mbps
   - YouTube: upload 4K HDR if graded for PQ

## Final checklist

- [ ] Every camera cut has handles and warm-up; no first-frame flicker.
- [ ] No texture or foliage pop-in (World Partition fully loaded, LOD distance scale 10).
- [ ] Wheels rotate correctly under motion blur; no wagon-wheel strobing. Rotational motion blur needs temporal samples, which MRQ provides.
- [ ] Headlight beams visible in fog in every night shot.
- [ ] Wet road reflections in all low shots.
- [ ] Niagara deterministic; re-render matches.
- [ ] Engine sound matches RPM changes on every gear change seen on screen.
- [ ] Graded in a colour-managed pipeline; checked on a calibrated monitor and on a phone.
