"""
00 - Sample the real road spline into ROAD_POINTS.

Once your landscape road exists (Landscape Spline, PCG spline, or any actor with
a Spline Component), select that actor in the viewport and run:

    py 00_export_road_points.py

It prints a ROAD_POINTS list sampled every SAMPLE_SPACING_CM. Paste it into
chase_config.py so the keyframed cars and cameras follow your actual road.
"""

import unreal

from ue_helpers import log, warn

SAMPLE_SPACING_CM = 4000.0  # one control point every 40 m
CAR_RIDE_HEIGHT_CM = 0.0  # raise if your car pivot isn't at the tyre contact patch


def main():
    selected = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_selected_level_actors()
    splines = []
    for actor in selected:
        splines.extend(actor.get_components_by_class(unreal.SplineComponent))
    if not splines:
        warn("Select an actor with a Spline Component (your road) first.")
        return

    spline = splines[0]
    total = spline.get_spline_length()
    points = []
    d = 0.0
    while d <= total:
        p = spline.get_location_at_distance_along_spline(d, unreal.SplineCoordinateSpace.WORLD)
        points.append((round(p.x), round(p.y), round(p.z + CAR_RIDE_HEIGHT_CM)))
        d += SAMPLE_SPACING_CM
    end = spline.get_location_at_distance_along_spline(total, unreal.SplineCoordinateSpace.WORLD)
    points.append((round(end.x), round(end.y), round(end.z + CAR_RIDE_HEIGHT_CM)))

    lines = ["ROAD_POINTS = ["] + ["    {},".format(p) for p in points] + ["]"]
    log("Road spline length: {:.2f} km, {} points. Paste into chase_config.py:\n{}".format(
        total / 100000.0, len(points), "\n".join(lines)))


if __name__ == "__main__":
    main()
