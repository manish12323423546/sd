"""
Sanity tests for the chase path / camera math. No Unreal needed:

    python3 -m unittest discover -s unreal-car-chase/tests
"""

import math
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))

import chase_config as cfg  # noqa: E402
import chase_path as cp  # noqa: E402
from chase_shots import SHOTS  # noqa: E402

class ChaseMathTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = cp.RoadPath(cfg.ROAD_POINTS)
        cls.tl = cp.ChaseTimeline(cls.path, cfg.DURATION_SECONDS, cfg.HERO_SPEED_KMH, cfg.CHASER_GAP_SECONDS)

    def test_road_fits_full_speed_chase(self):
        self.assertAlmostEqual(self.tl.scale, 1.0, msg="road too short; cars would be slowed down")
        self.assertLess(self.tl.hero_distance(cfg.DURATION_SECONDS), self.path.total_length)

    def test_hero_speed_is_realistic(self):
        speeds = []
        for i in range(1, cfg.DURATION_SECONDS * 4):
            t = i / 4.0
            v = (self.tl.hero_distance(t + 0.25) - self.tl.hero_distance(t)) / 0.25
            speeds.append(v * 3600 / 100000)  # km/h
        self.assertGreater(min(speeds), 180)
        self.assertLess(max(speeds), 320)
        self.assertAlmostEqual(sum(speeds) / len(speeds), cfg.HERO_SPEED_KMH, delta=25)

    def test_chaser_always_behind_and_on_road(self):
        for i in range(cfg.DURATION_SECONDS * cfg.FPS + 1):
            t = i / float(cfg.FPS)
            hero, chaser = self.tl.hero_distance(t), self.tl.chaser_distance(t)
            self.assertGreater(hero - chaser, 1000, "chaser within 10 m of hero at t={}".format(t))
            self.assertGreaterEqual(chaser, 0.0)

    def test_car_yaw_is_continuous_after_unwrap(self):
        prev = None
        for i in range(cfg.DURATION_SECONDS * cfg.FPS):
            _loc, (_p, yaw, roll) = self.tl.car_transform("hero", i / float(cfg.FPS))
            unwrapped = cp.unwrap_angle(prev, yaw)
            if prev is not None:
                self.assertLess(abs(unwrapped - prev), 5.0)
            self.assertLessEqual(abs(roll), 4.0)
            prev = unwrapped

    def test_shots_cover_timeline_without_gaps(self):
        names = [s["name"] for s in SHOTS]
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(SHOTS[0]["start"], 0.0)
        self.assertEqual(SHOTS[-1]["end"], cfg.DURATION_SECONDS)
        for a, b in zip(SHOTS, SHOTS[1:]):
            self.assertEqual(a["end"], b["start"], "gap/overlap between {} and {}".format(a["name"], b["name"]))
            self.assertGreater(a["end"], a["start"])

    def test_cameras_evaluate_and_keep_clear_of_cars(self):
        for shot in SHOTS:
            steps = 24
            for k in range(steps + 1):
                t = shot["start"] + (shot["end"] - shot["start"]) * k / steps
                loc, rot = cp.camera_transform(shot, self.tl, t)
                self.assertTrue(all(math.isfinite(v) for v in loc + rot), shot["name"])
                self.assertGreater(cp.focus_distance(shot, self.tl, t), 10.0)
                for who in ("hero", "chaser"):
                    if shot.get("mounted") and who == shot.get("subject", "hero"):
                        continue  # rig cameras are meant to sit on their own car
                    car = self.tl.local_point(who, t, (0, 0, 60))
                    dist = cp.length(cp.sub(loc, car))
                    self.assertGreater(dist, 250, "{} camera inside {} at t={:.2f} ({:.0f} cm)".format(shot["name"], who, t, dist))

    def test_camera_rotation_has_no_flips_within_shot(self):
        for shot in SHOTS:
            prev = None
            frames = int((shot["end"] - shot["start"]) * cfg.FPS)
            for f in range(frames + 1):
                _loc, (_p, yaw, _r) = cp.camera_transform(shot, self.tl, shot["start"] + f / float(cfg.FPS))
                unwrapped = cp.unwrap_angle(prev, yaw)
                if prev is not None:
                    self.assertLess(abs(unwrapped - prev), 25.0, "{} whips >25 deg in one frame".format(shot["name"]))
                prev = unwrapped


if __name__ == "__main__":
    unittest.main()
