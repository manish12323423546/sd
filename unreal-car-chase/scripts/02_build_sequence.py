"""
02 - Build the master Level Sequence for the chase.

Creates SEQ_JungleChase_Master with:
  * Hero supercar + chaser keyframed along the road (previz / blocking pass)
  * Headlights (IES spot lights with volumetric scattering) and tail lights on both cars
  * One Cine Camera per shot in chase_shots.SHOTS - lens, aperture, focus tracking,
    procedural handheld/rig shake baked into keys
  * A Camera Cuts track that edits the shots together

The keyframed car motion is the blocking pass. For the final, record real driving
with Take Recorder (docs/03-vehicles-chaos.md) and swap it in - the cameras follow
the same timing.

Run with the chase level open:  py 02_build_sequence.py
"""

import unreal

import chase_config as cfg
import chase_path as cp
from chase_shots import SHOTS
from ue_helpers import ensure_directory, load_class, log, remove_tagged_actors, safe_set, spawn, warn

TAG = "JungleChase_Sequence"
CAR_FOLDER = "JungleChase/Cars"
CAM_FOLDER = "JungleChase/Cameras"
KEY_STEP = 1  # key every frame; raise to 2-3 for lighter sequences


# ---------------------------------------------------------------------------
# Sequencer API compatibility helpers
# ---------------------------------------------------------------------------
def add_root_track(sequence, track_class):
    # UE 5.2 renamed add_master_track -> add_track
    if hasattr(sequence, "add_track"):
        return sequence.add_track(track_class)
    return sequence.add_master_track(track_class)


def get_channels(section):
    return section.get_all_channels() if hasattr(section, "get_all_channels") else section.get_channels()


def binding_id(sequence, binding):
    try:
        return unreal.MovieSceneSequenceExtensions.get_portable_binding_id(sequence, sequence, binding)
    except Exception:  # noqa: BLE001
        return sequence.get_binding_id(binding)


def create_sequence(num_frames):
    ensure_directory(cfg.SEQUENCE_DIR)
    asset_path = "{}/{}".format(cfg.SEQUENCE_DIR, cfg.SEQUENCE_NAME)
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        unreal.LevelSequenceEditorBlueprintLibrary.close_level_sequence()
        unreal.EditorAssetLibrary.delete_asset(asset_path)
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    seq = tools.create_asset(cfg.SEQUENCE_NAME, cfg.SEQUENCE_DIR, unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    seq.set_display_rate(unreal.FrameRate(cfg.FPS, 1))
    seq.set_playback_start(0)
    seq.set_playback_end(num_frames)
    return seq


# ---------------------------------------------------------------------------
# Actors
# ---------------------------------------------------------------------------
def spawn_car(class_path, label, color):
    """Returns (actor, ride_height_cm) - ride height lifts pivots that aren't at the tyre contact patch."""
    cls = load_class(class_path)
    if cls is not None:
        car = spawn(cls, label=label, folder=CAR_FOLDER, tag=TAG)
        # Keyframed transforms and physics simulation fight each other: turn sim off for previz.
        root = car.root_component
        if isinstance(root, unreal.PrimitiveComponent):
            root.set_simulate_physics(False)
        return car, 0.0

    # Placeholder: a car-sized block so the shots can be blocked before assets arrive.
    car = spawn(unreal.StaticMeshActor, label=label + "_PLACEHOLDER", folder=CAR_FOLDER, tag=TAG)
    smc = car.static_mesh_component
    smc.set_mobility(unreal.ComponentMobility.MOVABLE)
    smc.set_static_mesh(unreal.load_asset("/Engine/BasicShapes/Cube.Cube"))
    smc.set_relative_scale3d(unreal.Vector(4.6, 2.0, 1.15))
    mat = unreal.load_asset("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")
    if mat:
        mid = smc.create_dynamic_material_instance(0, mat)
        if mid:
            mid.set_vector_parameter_value("Color", unreal.LinearColor(*color))
    return car, 57.5  # the engine cube's pivot is at its centre


def attach_light(car, light_class, local_offset, local_rot, label):
    light = spawn(light_class, label=label, folder=CAR_FOLDER, tag=TAG)
    light.attach_to_actor(car, "", unreal.AttachmentRule.KEEP_RELATIVE, unreal.AttachmentRule.KEEP_RELATIVE,
                          unreal.AttachmentRule.KEEP_RELATIVE, False)
    light.root_component.set_relative_location(unreal.Vector(*local_offset))
    light.root_component.set_relative_rotation(unreal.Rotator(roll=0, pitch=local_rot[0], yaw=local_rot[1]))
    comp = light.light_component
    safe_set(comp, "mobility", unreal.ComponentMobility.MOVABLE)
    return comp


def add_car_lights(car, is_chaser):
    ies = unreal.load_asset(cfg.HEADLIGHT_IES) if cfg.HEADLIGHT_IES else None
    name = car.get_actor_label()
    for side, y in (("L", -70.0), ("R", 70.0)):
        head = attach_light(car, unreal.SpotLight, (225.0, y, 70.0), (-3.0, 0.0), "{}_Headlight_{}".format(name, side))
        safe_set(head, "intensity_units", unreal.LightUnits.LUMENS)
        safe_set(head, "intensity", 2500.0 if not is_chaser else 2200.0)
        head.set_light_color(unreal.LinearColor(1.0, 0.95, 0.88, 1.0) if not is_chaser else unreal.LinearColor(0.85, 0.9, 1.0, 1.0))
        safe_set(head, "inner_cone_angle", 10.0)
        safe_set(head, "outer_cone_angle", 30.0)
        safe_set(head, "attenuation_radius", 9000.0)
        safe_set(head, "source_radius", 6.0)
        safe_set(head, "volumetric_scattering_intensity", 4.0)  # visible beams in the fog
        safe_set(head, "cast_volumetric_shadow", True)
        if ies:
            safe_set(head, "ies_texture", ies)

        tail = attach_light(car, unreal.PointLight, (-230.0, y, 75.0), (0.0, 0.0), "{}_TailLight_{}".format(name, side))
        safe_set(tail, "intensity_units", unreal.LightUnits.LUMENS)
        safe_set(tail, "intensity", 60.0)
        tail.set_light_color(unreal.LinearColor(1.0, 0.03, 0.02, 1.0))
        safe_set(tail, "attenuation_radius", 600.0)
        safe_set(tail, "cast_shadows", False)

    if is_chaser:
        # Roof-mounted searchlight sweeping the jungle.
        search = attach_light(car, unreal.SpotLight, (40.0, 0.0, 190.0), (-6.0, 0.0), name + "_Searchlight")
        safe_set(search, "intensity_units", unreal.LightUnits.LUMENS)
        safe_set(search, "intensity", 12000.0)
        safe_set(search, "inner_cone_angle", 3.0)
        safe_set(search, "outer_cone_angle", 9.0)
        safe_set(search, "attenuation_radius", 20000.0)
        safe_set(search, "volumetric_scattering_intensity", 8.0)


def spawn_camera(shot):
    cam = spawn(unreal.CineCameraActor, label=shot["name"], folder=CAM_FOLDER, tag=TAG)
    comp = cam.get_cine_camera_component()

    filmback = comp.filmback
    filmback.sensor_width, filmback.sensor_height = cfg.FILMBACK_MM
    comp.filmback = filmback

    lens = comp.lens_settings
    lens.min_f_stop = 1.2
    lens.max_f_stop = 22.0
    lens.min_focal_length = 12.0
    lens.max_focal_length = 300.0
    lens.diaphragm_blade_count = 9  # rounder bokeh on the headlights
    comp.lens_settings = lens

    safe_set(comp, "current_focal_length", float(shot["focal_mm"]))
    safe_set(comp, "current_aperture", float(shot["fstop"]))

    focus = comp.focus_settings
    focus.focus_method = unreal.CameraFocusMethod.MANUAL  # we key focus distance per frame
    focus.smooth_focus_changes = False
    comp.focus_settings = focus
    return cam


# ---------------------------------------------------------------------------
# Keyframing
# ---------------------------------------------------------------------------
def key_frames(start_frame, end_frame):
    frames = list(range(start_frame, end_frame + 1, KEY_STEP))
    if frames[-1] != end_frame:
        frames.append(end_frame)
    return frames


def key_transform(sequence, actor, start_frame, end_frame, sampler):
    """Adds a transform track to `actor` keyed by sampler(frame) -> (loc, (pitch, yaw, roll))."""
    binding = sequence.add_possessable(actor)
    track = binding.add_track(unreal.MovieScene3DTransformTrack)
    section = track.add_section()
    section.set_range(start_frame, end_frame + 1)
    ch = get_channels(section)  # loc x,y,z, rot roll,pitch,yaw, scale x,y,z
    scale = actor.get_actor_scale3d()
    for channel, value in zip(ch[6:9], (scale.x, scale.y, scale.z)):
        channel.set_default(value)  # keep the actor's scale instead of an unset channel
    prev_yaw = prev_roll = None
    for frame in key_frames(start_frame, end_frame):
        loc, (pitch, yaw, roll) = sampler(frame)
        yaw = cp.unwrap_angle(prev_yaw, yaw)
        roll = cp.unwrap_angle(prev_roll, roll)
        prev_yaw, prev_roll = yaw, roll
        fn = unreal.FrameNumber(frame)
        ch[0].add_key(fn, loc[0])
        ch[1].add_key(fn, loc[1])
        ch[2].add_key(fn, loc[2])
        ch[3].add_key(fn, roll)
        ch[4].add_key(fn, pitch)
        ch[5].add_key(fn, yaw)
    return binding


def key_focus(sequence, camera, shot, timeline, start_frame, end_frame):
    comp = camera.get_cine_camera_component()
    comp_binding = sequence.add_possessable(comp)
    track = comp_binding.add_track(unreal.MovieSceneFloatTrack)
    track.set_property_name_and_path("ManualFocusDistance", "FocusSettings.ManualFocusDistance")
    section = track.add_section()
    section.set_range(start_frame, end_frame + 1)
    channel = get_channels(section)[0]
    for frame in key_frames(start_frame, end_frame):
        t = frame / float(cfg.FPS)
        channel.add_key(unreal.FrameNumber(frame), cp.focus_distance(shot, timeline, t))


def main():
    remove_tagged_actors(TAG)
    num_frames = int(cfg.DURATION_SECONDS * cfg.FPS)
    sequence = create_sequence(num_frames)

    path = cp.RoadPath(cfg.ROAD_POINTS)
    timeline = cp.ChaseTimeline(path, cfg.DURATION_SECONDS, cfg.HERO_SPEED_KMH, cfg.CHASER_GAP_SECONDS)
    log("Road length {:.2f} km, speed scale {:.2f}".format(path.total_length / 100000.0, timeline.scale))
    if timeline.scale < 0.95:
        warn("Road is too short for {} km/h over {} s - cars slowed to {:.0f} km/h. Extend ROAD_POINTS.".format(
            cfg.HERO_SPEED_KMH, cfg.DURATION_SECONDS, cfg.HERO_SPEED_KMH * timeline.scale))

    # Cars
    hero, hero_height = spawn_car(cfg.HERO_CAR_CLASS, "Hero_Supercar", (0.9, 0.35, 0.02, 1.0))
    chaser, chaser_height = spawn_car(cfg.CHASER_CAR_CLASS, "Chaser_SUV", (0.05, 0.05, 0.06, 1.0))
    if cfg.ADD_CAR_LIGHTS:
        add_car_lights(hero, is_chaser=False)
        add_car_lights(chaser, is_chaser=True)

    for actor, who, height in ((hero, "hero", hero_height), (chaser, "chaser", chaser_height)):
        key_transform(sequence, actor, 0, num_frames,
                      lambda f, who=who, height=height: timeline.car_transform(who, f / float(cfg.FPS), height))
    log("Keyed hero and chaser over {} frames".format(num_frames))

    # Cameras + camera cuts
    cut_track = add_root_track(sequence, unreal.MovieSceneCameraCutTrack)
    for shot in SHOTS:
        start_f = int(round(shot["start"] * cfg.FPS))
        end_f = min(num_frames, int(round(shot["end"] * cfg.FPS)))
        cam = spawn_camera(shot)
        # Key one frame of handles either side so motion blur has data on cut frames.
        cam_binding = key_transform(
            sequence, cam, max(0, start_f - 1), min(num_frames, end_f + 1),
            lambda f, shot=shot: cp.camera_transform(shot, timeline, f / float(cfg.FPS)))
        key_focus(sequence, cam, shot, timeline, max(0, start_f - 1), min(num_frames, end_f + 1))

        cut = cut_track.add_section()
        cut.set_range(start_f, end_f)
        cut.set_camera_binding_id(binding_id(sequence, cam_binding))
        log("Shot {} {:.1f}s-{:.1f}s  {}mm f/{}".format(shot["name"], shot["start"], shot["end"], shot["focal_mm"], shot["fstop"]))

    unreal.EditorAssetLibrary.save_loaded_asset(sequence)
    unreal.LevelSequenceEditorBlueprintLibrary.open_level_sequence(sequence)
    log("Sequence ready: {}/{} ({} shots). Next: 03_setup_render_queue.py".format(cfg.SEQUENCE_DIR, cfg.SEQUENCE_NAME, len(SHOTS)))


if __name__ == "__main__":
    main()
