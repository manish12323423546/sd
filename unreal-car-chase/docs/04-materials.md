# 04 — Materials: node recipes for a photoreal finish

All values assume Lumen with hardware ray tracing. These are the classic shading-model recipes.

If you've turned on **Substrate** (UE 5.5+ production-ready path), the same ideas map onto Slab BSDFs:

- car paint = a metallic base slab + a coat slab with `Coat Thickness`
- glass = a thin slab with `Transmittance`

## Master materials to make

| Material | Shading model | Used on |
|---|---|---|
| `M_CarPaint` | Clear Coat | body panels |
| `M_CarbonFibre` | Clear Coat | aero, mirrors, diffuser |
| `M_Glass` | Thin Translucent (Translucent, *Surface Forward Shading*) | windows, light lenses |
| `M_Tyre` | Default Lit | tyres |
| `M_Rim` / `M_BrakeDisc` | Default Lit (metal) | wheels |
| `M_Emissive_Light` | Unlit / Default Lit + emissive | LEDs, head/tail light elements |
| `M_WetAsphalt` | Default Lit | road (layered with RVT) |
| `M_Foliage_Master` | Two Sided Foliage | leaves, ferns, palms |
| `M_Bark` | Default Lit / Subsurface | tree trunks, roots |
| `MF_Wetness` | material function | added to everything outdoors |
| `MF_Dirt_Mud` | material function | car lower body, tyres, SUV |

## Car paint

```
Shading Model: Clear Coat
BaseColor        = Param "PaintColor" (deep orange 0.9,0.25,0.02 linear)  -- keep < 0.9
Metallic         = Param 0.7 (metallic paint) / 0.0 (solid paint)
Roughness        = 0.35   (the BASE layer under the coat)
Clear Coat       = 1.0
Clear Coat Roughness = 0.03  (Param; 0.02 showroom, 0.08 slightly dusty)

Metal flake:
  FlakeNormal = Texture "T_Flakes_N" (tiling noise normal), UV = TexCoord * 400
  Normal      = BlendAngleCorrectedNormals(VertexNormal(0,0,1), lerp((0,0,1), FlakeNormal, 0.15))
  -> plug into "Clear Coat Bottom Normal" custom output (enable "Clear Coat Enable Second Normal"
     in Project Settings > Rendering > Materials) so flakes sparkle UNDER a smooth coat.

Fresnel colour shift (pearlescent option):
  BaseColor = lerp(PaintColor, PaintColor2, Fresnel(Exponent 3))

Dirt & wetness layer:
  Mask = MF_Dirt_Mud(world-Z gradient from the car's bottom, noise breakup) * Param "DirtAmount"
  Lerp BaseColor -> mud colour, Roughness -> 0.8, ClearCoat -> 0 where masked
```

**Tips:**

- What the paint reflects matters more than the paint. Lumen HWRT reflections of the jungle, the moon sky and the headlights of the other car do the work.
- Keep **Clear Coat Roughness** at 0.02–0.05. Glossier than that aliases at 4K; rougher looks plastic.
- Add a **water droplets / rain beading** normal on the hood and roof (flipbook) if it rains.

## Glass

```
Blend Mode: Translucent, Lighting Mode: Surface Forward Shading
Shading Model: Thin Translucent
BaseColor      = 0.02 (dark tint) / Transmittance colour (0.6,0.65,0.62) for a slight green tint
Opacity        = 0.25
Metallic 0, Specular 0.5, Roughness 0.02
Normal         = subtle large-scale wave (glass isn't perfectly flat - sells realism)
Refraction     = none (thin glass)  -- or IOR 1.1 for headlight lenses
Details > Translucency > "Screen Space Reflections" ON, "Output Velocity" ON
```

Project setting `r.Lumen.TranslucencyReflections.FrontLayer.EnableForProject=True` (already in the ini snippet) gives glass mirror-quality Lumen reflections.

For the **windscreen interior shot (SH090)**, add a faint dust/smudge texture to roughness. Headlight streaks crossing it look superb.

## Lights (head/tail/brake)

- Model the **reflector bowl and LED elements** as separate meshes with emissive materials. Put the lens glass in front.
  - LED emissive: about 50–200 nits-equivalent (emissive value 20–60 at our exposure).
  - Tail lights: about 10, rising to 40 when braking.
- Use a **Light Function** or **IES profile** on the spotlight for a realistic beam pattern with a sharp cut-off line.
- The beam in the fog comes from the spotlight's **Volumetric Scattering Intensity**. The scripts set this to 4.

## Tyres, rims, brakes

```
M_Tyre:   BaseColor 0.03, Roughness 0.8 (tread) / 0.65 (sidewall), sidewall lettering via normal + roughness mask
          + MF_Dirt_Mud on the tread/shoulder, + MF_Wetness
M_Rim:    Metallic 1, BaseColor 0.6 (forged alu) or 0.05 (gloss black), Roughness 0.25, brake dust mask (darken + rough) near hub
M_BrakeDisc: Metallic 1, BaseColor 0.45, Roughness 0.4, radial scratch normal
          Emissive = Heat * BlackBody(Temp = lerp(600, 1100, Heat)) * 30   -- glows orange under hard braking (SH070)
```

## Wet asphalt

This is the single most important material in a night chase: the headlights reflect off the road.

```
Inputs: T_Asphalt (BaseColor/Normal/Roughness/AO), T_PuddleMask (or RVT painted mask), T_RainRipples_N (flipbook)

Wetness = Param "Wetness" (0.6 for damp, 1 after rain)
Puddle  = saturate((PuddleMask - (1 - Param "PuddleAmount")) * 8)   -- sharp-edged puddles

BaseColor = lerp(Asphalt.BaseColor, Asphalt.BaseColor * 0.45, Wetness)     -- wet things get darker
Roughness = lerp(Asphalt.Roughness, 0.15, Wetness * 0.7)
Roughness = lerp(Roughness, 0.02, Puddle)                                   -- puddles become mirrors
Normal    = lerp(Asphalt.Normal, (0,0,1), Puddle)                           -- puddles are flat
Normal    = BlendAngleCorrectedNormals(Normal, RainRipples * Puddle * Param "RainIntensity")
Specular  = 0.5

Lane markings: separate decal layer, worn via noise mask, roughness 0.5 (paint is less glossy when wet)
Tyre tracks: decals with roughness 0.4 (dry line where cars drove) - extremely realistic on wet roads
```

## Foliage

```
Shading Model: Two Sided Foliage
BaseColor        = Leaf albedo * Param "HueVariation" (per-instance random via PerInstanceRandom -> slight hue/value shift)
Subsurface Color = Leaf albedo * 0.6 * (1.2, 1.3, 0.8)   -- warm-green translucency when backlit by headlights
Roughness        = lerp(0.6, 0.25, Wetness)              -- wet leaves glint in moonlight
Opacity Mask     = alpha (Masked) - or geometry leaves for Nanite foliage (preferred: no overdraw)
WPO (wind):      Pivot Painter 2 hierarchy or SimpleGrassWind for small plants; scale with Param "Wind" (0.3 at night)
                 + add a "CarPassGust" Material Parameter Collection param keyed in Sequencer so roadside
                 plants whip when a car passes in close-ups (SH020, SH060)
```

- Enable **Output Velocity** for WPO so that the motion blur on swaying leaves is correct (`r.Velocity.EnableVertexDeformation=1` is in the ini).
- On Nanite foliage, enable **Evaluate World Position Offset** and set *WPO Disable Distance*.

## MF_Wetness (shared function)

Inputs: BaseColor, Roughness, Normal, Wetness, Porosity (0–1).

```
DarkenedColor = BaseColor ^ (1 + Porosity * Wetness)      -- porous surfaces darken more
Roughness     = lerp(Roughness, 0.1, Wetness * (1 - Porosity * 0.5))
Normal        = lerp(Normal, (0,0,1), Wetness * 0.3)
+ optional rain drops / drips mask on vertical surfaces (world-normal Z < 0.3) using a panning drip texture
```

Use one **Material Parameter Collection** `MPC_Weather` (Wetness, RainIntensity, Wind, CarPassGust) for the whole world. Key it in Sequencer for a cut-to-cut consistent look.
