# 02 — Environment: the jungle road at night

Goal: a ~5 km winding two-lane road. It is cracked, wet asphalt with muddy verges and runs through dense tropical rainforest: a tall canopy, buttress roots, ferns, hanging vines and low ground mist. It needs one **crest** for the jump and one **bridge or water splash**.

## 1. Landscape (terrain)

1. **Landscape ▸ New**. Use section size 127×127 quads, 2×2 sections per component and 16×16 components. This gives roughly 4 km × 4 km at 100 cm scale. Use **World Partition** with a 25,600 cm cell size.
2. Sculpt the valley first with the **Landmass** brushes (Custom Brush ▸ Blueprint Brush). Rough out ridges with *Noise* and *Erosion*, then hand-sculpt.
   - Keep the road gradient under 12%.
   - Make the crest a sharp **2–3 m** rise followed by a drop. That gives a 0.5–1.0 s airborne jump at about 250 km/h.
3. **Landscape material:** use a layered master material with height-blended layers: Mud, Leaf litter, Moss, Rock, Wet gravel (verge). Use **Runtime Virtual Texturing (RVT)** so roads and decals blend into the ground.

## 2. The road

Two options:

- **Landscape Spline + spline meshes (simplest).** In Landscape ▸ Manage ▸ Splines, Ctrl+Click to place control points. Assign a road-section static mesh (12 m wide, 2 lanes plus verges) to the segments. Tick *Raise Terrain / Lower Terrain* so the landscape conforms to the road.
- **PCG spline road (more control).** Use a Blueprint holding a Spline Component and a PCG graph that sweeps road meshes and scatters roadside detail.

Then:

1. Select the spline actor and run `scripts/00_export_road_points.py`. Paste the printed `ROAD_POINTS` into `chase_config.py`.
2. Re-run `run_all.py`. The cars and cameras now follow the real road.

### Road dressing (what makes it look real)

- **Decals:** tyre skid marks (multiple passes), oil stains, cracks, potholes, worn lane paint and leaf debris. Use 20–40 **DBuffer decals** per 100 m on the hero stretches.
- **Puddles:** use the wetness/puddle mask in `M_WetAsphalt` (see [04](04-materials.md#wet-asphalt)), painted via RVT or vertex colour. Puddles reflect the headlights, which is the single biggest realism win at night.
- **Edges:** muddy verge, broken kerb stones, roots breaking through the tarmac, fallen palm fronds.
- **Props:** rusted crash barrier on the cliff side, a leaning wooden telegraph pole line with sagging wires (great for parallax), a faded road sign, an abandoned truck, and a small concrete bridge over a stream.

## 3. Jungle vegetation with PCG

Build one PCG graph, `PCG_JungleRoadside`, driven by the road spline.

```
Spline Sampler (road spline, interior, 50 cm spacing)
  -> Distance from spline  -> attribute "RoadDist"
  -> Density Filter bands:
       0-6 m     : NOTHING (keep the road clear) + small grass/leaf litter only past 6.5 m
       6-12 m    : ferns, elephant ears (Alocasia), heliconia, low palms   density 0.6
       12-30 m   : banana plants, young palms, shrubs, rocks             density 0.4
       30 m+     : canopy trees (kapok/ficus with buttress roots), lianas  density 0.15
  -> Self Pruning (prevent overlaps, by bounds)
  -> Transform Points (random yaw, scale 0.8-1.3, align-to-normal on slopes only for small plants)
  -> Static Mesh Spawner (weighted mesh lists per band)
```

- **Mesh assets:** Fab / Quixel Megascans *Tropical* and *Rainforest* collections. Look for **Nanite-enabled** variants, ideally with Nanite Foliage or WPO-enabled Nanite.
- Enable **Nanite** with *Preserve Area* on foliage meshes. Enable **World Position Offset** only for meshes near camera, and limit WPO by distance using **WPO Disable Distance** around 5,000 cm.
- **Canopy density:** aim for 70–90% sky coverage overhead. Moonlight should only break through in patches, which makes the light shafts in volumetric fog.
- **Hero dressing:** in the first 20 m of each shot's view, place plants by hand where the camera is (foreground occlusion). PCG gets you 90% of the way; framing needs hand placement.
- **Vines across the road** (a canopy "tunnel") in two or three places. They give great top-of-frame parallax.

## 4. Atmosphere

`scripts/01_setup_lighting.py` creates the moonlight, sky, fog, volumetric fog and post-process. Then add:

- **Local fog volumes** (Place Actors ▸ Visual Effects ▸ Local Fog Volume) in dips and valleys for thicker mist pockets.
- **Niagara ground mist** cards hugging the road (see [05](05-niagara-fx.md#ground-mist)).
- **Light rain** (optional): it makes everything wet and the headlights show streaks.
- **Fireflies and moths** in headlight beams.

## 5. Performance tips for a huge jungle

- Use **Nanite everywhere** possible, including foliage, rocks and road meshes.
- Use **HLODs** for World Partition (Build ▸ Build HLODs).
- Keep the cull distance on small plants and leaf litter around 8,000 cm. Cameras are rarely static long enough to notice.
- Use **Lumen** with the *Surface Cache* view mode. Check that big assets have cards (pink = missing).
- Profile with `stat gpu` and `ProfileGPU`. Foliage overdraw and volumetric fog are the usual costs.
