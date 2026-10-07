"""
01 - Moonlit jungle night lighting rig.

Spawns and configures:
  * Directional "moon" light (atmosphere-linked, cool, low raking angle)
  * Sky Atmosphere + Volumetric Clouds + real-time captured Sky Light
  * Exponential Height Fog with Volumetric Fog (light shafts through the canopy)
  * Unbound Post Process Volume: Lumen GI/reflections, manual exposure,
    filmic bloom, subtle grain / chromatic aberration / vignette, motion blur

Run inside the Unreal Editor with your chase level open:
    Tools > Execute Python Script...  (or `py 01_setup_lighting.py` in the Cmd console)

Safe to re-run: it deletes the actors it spawned last time first.
"""

import unreal

import chase_config as cfg
from ue_helpers import log, remove_tagged_actors, safe_set, spawn

TAG = "JungleChase_Lighting"
FOLDER = "JungleChase/Lighting"


def setup_moon():
    moon = spawn(unreal.DirectionalLight, (0, 0, 50000), cfg.MOON_ROTATION, "Moon_Directional", FOLDER, TAG)
    comp = moon.light_component
    safe_set(comp, "intensity", cfg.MOON_INTENSITY_LUX)
    comp.set_light_color(unreal.LinearColor(*cfg.MOON_COLOR, 1.0))
    safe_set(comp, "use_temperature", True)
    safe_set(comp, "temperature", cfg.MOON_TEMPERATURE)
    safe_set(comp, "atmosphere_sun_light", True)
    safe_set(comp, "cast_shadows", True)
    safe_set(comp, "cast_cloud_shadows", True)
    safe_set(comp, "light_source_angle", 0.53)  # the moon's real angular diameter -> soft shadows
    safe_set(comp, "volumetric_scattering_intensity", 2.0)  # stronger god-rays in volumetric fog
    safe_set(comp, "mobility", unreal.ComponentMobility.MOVABLE)
    return moon


def setup_sky():
    spawn(unreal.SkyAtmosphere, label="Sky_Atmosphere", folder=FOLDER, tag=TAG)

    clouds = spawn(unreal.VolumetricCloud, label="Sky_VolumetricClouds", folder=FOLDER, tag=TAG)
    cloud_comp = clouds.get_component_by_class(unreal.VolumetricCloudComponent)
    if cloud_comp:
        safe_set(cloud_comp, "layer_bottom_altitude", 3.0)  # km
        safe_set(cloud_comp, "layer_height", 6.0)

    sky = spawn(unreal.SkyLight, (0, 0, 2000), label="Sky_Light", folder=FOLDER, tag=TAG)
    comp = sky.light_component
    safe_set(comp, "real_time_capture", True)
    safe_set(comp, "intensity", 0.35)  # keep the shadows under the canopy dark
    safe_set(comp, "mobility", unreal.ComponentMobility.MOVABLE)
    comp.set_light_color(unreal.LinearColor(0.55, 0.65, 0.9, 1.0))


def setup_fog():
    fog = spawn(unreal.ExponentialHeightFog, (0, 0, -200), label="Fog_Height", folder=FOLDER, tag=TAG)
    comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    safe_set(comp, "fog_density", cfg.FOG_DENSITY)
    safe_set(comp, "fog_height_falloff", cfg.FOG_HEIGHT_FALLOFF)
    inscatter = unreal.LinearColor(*cfg.FOG_INSCATTER, 1.0)
    # Renamed in UE 5.1 (fog_inscattering_color -> fog_inscattering_luminance)
    if not safe_set(comp, "fog_inscattering_luminance", inscatter):
        safe_set(comp, "fog_inscattering_color", inscatter)
    safe_set(comp, "enable_volumetric_fog", True)
    safe_set(comp, "volumetric_fog_scattering_distribution", 0.6)  # forward scatter = headlight beams
    safe_set(comp, "volumetric_fog_extinction_scale", 1.5)
    safe_set(comp, "volumetric_fog_distance", 12000.0)
    # A second, very dense low layer gives the ground mist hugging the road.
    try:
        mist = comp.get_editor_property("second_fog_data")
        mist.fog_density = 0.08
        mist.fog_height_falloff = 1.2
        mist.fog_height_offset = -150.0
        comp.set_editor_property("second_fog_data", mist)
    except Exception as exc:  # noqa: BLE001
        unreal.log_warning("[JungleChase] Ground-mist fog layer skipped ({})".format(exc))


def setup_post_process():
    ppv = spawn(unreal.PostProcessVolume, label="PP_Global_Cinematic", folder=FOLDER, tag=TAG)
    safe_set(ppv, "unbound", True)
    safe_set(ppv, "priority", 0.0)

    s = ppv.settings  # PostProcessSettings is a struct copy: edit, then assign back

    def o(name, value):
        """Set a post-process value and its matching override_ flag."""
        try:
            s.set_editor_property("override_" + name, True)
            s.set_editor_property(name, value)
        except Exception as exc:  # noqa: BLE001
            unreal.log_warning("[JungleChase] PP setting {} skipped ({})".format(name, exc))

    # Global illumination & reflections
    o("dynamic_global_illumination_method", unreal.DynamicGlobalIlluminationMethod.LUMEN)
    o("reflection_method", unreal.ReflectionMethod.LUMEN)
    o("lumen_scene_lighting_quality", 2.0)
    o("lumen_scene_detail", 2.0)
    o("lumen_final_gather_quality", 2.0)
    o("lumen_reflection_quality", 2.0)
    o("lumen_max_trace_distance", 20000.0)

    # Exposure: manual so the shot doesn't "breathe" when headlights pass the lens
    o("auto_exposure_method", unreal.AutoExposureMethod.AEM_MANUAL)
    o("auto_exposure_bias", cfg.EXPOSURE_BIAS)
    o("auto_exposure_apply_physical_camera_exposure", False)

    # Lens & film
    o("bloom_method", unreal.BloomMethod.BM_SOG)
    o("bloom_intensity", 0.9)
    o("bloom_threshold", 1.5)
    o("lens_flare_intensity", 0.35)
    o("lens_flare_bokeh_size", 3.0)
    o("vignette_intensity", 0.35)
    o("scene_fringe_intensity", 0.6)  # chromatic aberration
    o("film_grain_intensity", 0.18)
    o("film_grain_intensity_shadows", 0.3)

    # Motion blur tuned for high-speed driving shots
    o("motion_blur_amount", 0.6)
    o("motion_blur_max", 8.0)
    o("motion_blur_per_object_size", 0.0)

    # Grade: cool shadows, slightly warm highlights (headlights), lifted contrast
    o("white_temp", 6200.0)
    o("color_saturation", unreal.Vector4(0.95, 0.97, 1.0, 1.0))
    o("color_contrast", unreal.Vector4(1.08, 1.08, 1.08, 1.0))
    o("color_gain_shadows", unreal.Vector4(0.92, 0.98, 1.1, 1.0))
    o("color_gain_highlights", unreal.Vector4(1.06, 1.0, 0.94, 1.0))

    ppv.settings = s


def main():
    remove_tagged_actors(TAG)
    setup_moon()
    setup_sky()
    setup_fog()
    setup_post_process()
    log("Night lighting rig ready. Next: run 02_build_sequence.py")


if __name__ == "__main__":
    main()
