"""
03 - Movie Render Queue job for final-quality output.

Adds a job for SEQ_JungleChase_Master to the Movie Render Queue with:
  * 4K, 16-bit EXR (ACEScg-friendly linear output for grading in Resolve)
  * Temporal sub-sampling for clean, film-like motion blur
  * Warm-up frames so Lumen / TSR / Niagara settle before frame 1
  * Cinematic console variables (higher Lumen, shadow, volumetric fog quality)
  * Optional Path Tracer pass for hero shots (cfg.USE_PATH_TRACER)

Requires the "Movie Render Queue" plugin (and "Movie Render Queue Additional
Render Passes" for extra AOVs). Run:  py 03_setup_render_queue.py
Pass --render to start rendering immediately in a PIE session.
"""

import sys

import unreal

import chase_config as cfg
from ue_helpers import log, project_dir, warn

JOB_NAME = "JungleChase_Final"

# Cinematic-only quality settings, applied only while rendering.
CINEMATIC_CVARS = {
    "r.MotionBlurQuality": 4,
    "r.MotionBlur.HalfResGather": 0,
    "r.DepthOfFieldQuality": 4,
    "r.DOF.Kernel.MaxForegroundRadius": 0.025,
    "r.DOF.Kernel.MaxBackgroundRadius": 0.025,
    "r.BloomQuality": 5,
    "r.Tonemapper.Quality": 5,
    "r.ScreenPercentage": 100,
    "r.Lumen.ScreenProbeGather.ScreenTraces.HZBTraversal.FullResDepth": 1,
    "r.Lumen.ScreenProbeGather.DownsampleFactor": 8,
    "r.Lumen.TraceMeshSDFs.Allow": 1,
    "r.Lumen.Reflections.DownsampleFactor": 1,
    "r.Lumen.Reflections.MaxRoughnessToTrace": 0.6,
    "r.Lumen.HardwareRayTracing": 1,
    "r.Shadow.Virtual.SMRT.RayCountDirectional": 16,
    "r.Shadow.Virtual.SMRT.SamplesPerRayDirectional": 16,
    "r.Shadow.Virtual.SMRT.RayCountLocal": 16,
    "r.Shadow.Virtual.SMRT.SamplesPerRayLocal": 16,
    "r.VolumetricFog.GridPixelSize": 4,
    "r.VolumetricFog.GridSizeZ": 256,
    "r.VolumetricFog.HistoryMissSupersampleCount": 16,
    "r.ViewDistanceScale": 10,
    "foliage.LODDistanceScale": 10,
    "r.Nanite.MaxPixelsPerEdge": 0.5,
    "r.SkeletalMeshLODBias": -10,
    "r.Streaming.FullyLoadUsedTextures": 1,
    "r.Streaming.PoolSize": 0,  # 0 = unlimited for offline renders
    "r.HairStrands.Enable": 1,
    "r.PathTracing.MaxBounces": 12,
    "r.PathTracing.SamplesPerPixel": 512,
}


def find_or_add(config, setting_class):
    return config.find_or_add_setting_by_class(setting_class)


def build_job():
    subsystem = unreal.get_editor_subsystem(unreal.MoviePipelineQueueSubsystem)
    queue = subsystem.get_queue()

    seq_path = "{}/{}.{}".format(cfg.SEQUENCE_DIR, cfg.SEQUENCE_NAME, cfg.SEQUENCE_NAME)
    map_path = "{}.{}".format(cfg.MAP_PATH, cfg.MAP_PATH.rsplit("/", 1)[-1])

    # Remove an older job for the same sequence so re-running doesn't stack duplicates.
    for existing in list(queue.get_jobs()):
        if existing.job_name == JOB_NAME:
            queue.delete_job(existing)

    job = queue.allocate_new_job(unreal.MoviePipelineExecutorJob)
    job.job_name = JOB_NAME
    job.sequence = unreal.SoftObjectPath(seq_path)
    job.map = unreal.SoftObjectPath(map_path)
    config = job.get_configuration()

    # Output
    out = find_or_add(config, unreal.MoviePipelineOutputSetting)
    out.output_directory = unreal.DirectoryPath(cfg.OUTPUT_DIR.format(project_dir=project_dir()))
    out.output_resolution = unreal.IntPoint(*cfg.OUTPUT_RESOLUTION)
    out.file_name_format = "{sequence_name}/{shot_name}/{sequence_name}.{frame_number}"
    out.zero_pad_frame_numbers = 5
    out.use_custom_frame_rate = True
    out.output_frame_rate = unreal.FrameRate(cfg.FPS, 1)
    out.override_existing_output = True

    # Render pass
    if cfg.USE_PATH_TRACER:
        find_or_add(config, unreal.MoviePipelineDeferredPass_PathTracer)
    else:
        find_or_add(config, unreal.MoviePipelineDeferredPassBase)

    # 16-bit half-float EXR (linear), plus a quick H.264/ProRes preview can be added in the UI
    exr = find_or_add(config, unreal.MoviePipelineImageSequenceOutput_EXR)
    try:
        exr.compression = unreal.EXRCompressionFormat.PIZ
        exr.multilayer = True
    except Exception:  # noqa: BLE001
        pass

    # Anti-aliasing / motion blur sampling
    aa = find_or_add(config, unreal.MoviePipelineAntiAliasingSetting)
    aa.spatial_sample_count = cfg.SPATIAL_SAMPLES
    aa.temporal_sample_count = cfg.TEMPORAL_SAMPLES
    aa.override_anti_aliasing = True
    aa.anti_aliasing_method = unreal.AntiAliasingMethod.AAM_NONE  # accumulation handles AA
    aa.use_camera_cut_for_warm_up = True
    aa.engine_warm_up_count = cfg.WARMUP_FRAMES
    aa.render_warm_up_count = cfg.WARMUP_FRAMES
    aa.render_warm_up_frames = True

    # High-res settings: overlap tiles only if you go beyond 4K
    hr = find_or_add(config, unreal.MoviePipelineHighResSetting)
    hr.tile_count = 1
    hr.texture_sharpness_bias = -0.5  # crisper textures at 4K
    hr.page_to_system_memory = True

    # Console variables
    cvars = find_or_add(config, unreal.MoviePipelineConsoleVariableSetting)
    for name, value in CINEMATIC_CVARS.items():
        if cfg.USE_PATH_TRACER or not name.startswith("r.PathTracing"):
            cvars.add_or_update_console_variable(name, float(value))

    # Use the camera cuts track's shots
    cam = find_or_add(config, unreal.MoviePipelineCameraSetting)
    try:
        cam.override_camera_shutter = True
        cam.camera_shutter_angle = cfg.SHUTTER_ANGLE
    except Exception:  # noqa: BLE001 - older MRQ versions
        warn("Set the shutter angle manually in the MRQ Camera setting.")
    find_or_add(config, unreal.MoviePipelineGameOverrideSetting).cinematic_quality_settings = True

    log("Movie Render Queue job '{}' ready -> {}".format(job.job_name, out.output_directory.path))
    return subsystem


def main():
    subsystem = build_job()
    if "--render" in sys.argv:
        executor = subsystem.render_queue_with_executor(unreal.MoviePipelinePIEExecutor)
        if executor is None:
            warn("Render did not start - check the Output Log.")
        else:
            log("Rendering... (Window > Cinematics > Movie Render Queue to watch progress)")
    else:
        log("Open Window > Cinematics > Movie Render Queue and press Render (Local), or re-run with --render.")


if __name__ == "__main__":
    main()
