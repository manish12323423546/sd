"""
Small helpers shared by the Jungle Chase scripts.

Unreal's Python API shifts a little between engine versions (property names,
deprecated functions). These helpers try the modern call first and fall back,
and never crash the whole script because one property was renamed.
"""

import unreal

SCRIPT_TAG = "JungleChase"


def log(msg):
    unreal.log("[JungleChase] " + str(msg))


def warn(msg):
    unreal.log_warning("[JungleChase] " + str(msg))


def safe_set(obj, prop, value):
    """set_editor_property that warns instead of raising on version differences."""
    try:
        obj.set_editor_property(prop, value)
        return True
    except Exception as exc:  # noqa: BLE001 - we want to keep going
        warn("Could not set {}.{} ({})".format(obj.get_name(), prop, exc))
        return False


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def remove_tagged_actors(tag):
    """Delete actors a previous run of these scripts spawned, so re-runs are clean."""
    subsystem = actor_subsystem()
    removed = 0
    for actor in subsystem.get_all_level_actors():
        if tag in [str(t) for t in actor.tags]:
            subsystem.destroy_actor(actor)
            removed += 1
    if removed:
        log("Removed {} actors tagged '{}'".format(removed, tag))


def spawn(actor_class, location=(0, 0, 0), rotation=(0, 0, 0), label=None, folder=None, tag=None):
    loc = unreal.Vector(*location)
    rot = unreal.Rotator(roll=rotation[2], pitch=rotation[0], yaw=rotation[1])
    actor = actor_subsystem().spawn_actor_from_class(actor_class, loc, rot)
    if actor is None:
        warn("Failed to spawn {}".format(actor_class))
        return None
    if label:
        actor.set_actor_label(label)
    if folder:
        actor.set_folder_path(folder)
    tags = list(actor.tags)
    tags.append(SCRIPT_TAG)
    if tag:
        tags.append(tag)
    actor.tags = tags
    return actor


def load_class(path):
    """Load a Blueprint class by path, or return None if it doesn't exist yet."""
    if not path:
        return None
    try:
        cls = unreal.load_class(None, path)
    except Exception:  # noqa: BLE001 - missing asset
        cls = None
    if cls is None:
        warn("Class not found: {} (a placeholder will be used)".format(path))
    return cls


def ensure_directory(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def project_dir():
    return unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()).rstrip("/")
