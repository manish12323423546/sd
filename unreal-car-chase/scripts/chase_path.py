"""
Pure-Python path and camera math for the chase. No `unreal` import, so it can be
unit-tested outside the editor (see tests/test_chase_math.py).

Coordinate system matches Unreal: X forward, Y right, Z up, centimetres.
"""

import bisect
import math


# ---------------------------------------------------------------------------
# Vector helpers (tuples keep this dependency-free)
# ---------------------------------------------------------------------------
def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def length(a):
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def normalize(a):
    n = length(a)
    return (0.0, 0.0, 0.0) if n < 1e-9 else (a[0] / n, a[1] / n, a[2] / n)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def lerp(a, b, t):
    return add(a, mul(sub(b, a), t))


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


# ---------------------------------------------------------------------------
# Road curve
# ---------------------------------------------------------------------------
def _catmull_rom(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return tuple(
        0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)
        for i in range(3)
    )


class RoadPath:
    """Arc-length parameterised Catmull-Rom spline through the road control points."""

    def __init__(self, points, samples_per_segment=200):
        if len(points) < 2:
            raise ValueError("Need at least two road points")
        pts = [tuple(float(c) for c in p) for p in points]
        padded = [pts[0]] + pts + [pts[-1]]
        self.samples = []
        for seg in range(len(pts) - 1):
            p0, p1, p2, p3 = padded[seg : seg + 4]
            for k in range(samples_per_segment):
                self.samples.append(_catmull_rom(p0, p1, p2, p3, k / samples_per_segment))
        self.samples.append(pts[-1])

        self.cumulative = [0.0]
        for a, b in zip(self.samples, self.samples[1:]):
            self.cumulative.append(self.cumulative[-1] + length(sub(b, a)))
        self.total_length = self.cumulative[-1]

    def position(self, distance):
        d = max(0.0, min(self.total_length, distance))
        i = bisect.bisect_right(self.cumulative, d) - 1
        i = max(0, min(i, len(self.samples) - 2))
        seg = self.cumulative[i + 1] - self.cumulative[i]
        t = 0.0 if seg <= 0 else (d - self.cumulative[i]) / seg
        return lerp(self.samples[i], self.samples[i + 1], t)

    def frame(self, distance, step=150.0):
        """Return (position, forward, right, up) at a distance along the road."""
        p = self.position(distance)
        ahead = self.position(distance + step)
        behind = self.position(distance - step)
        fwd = normalize(sub(ahead, behind))
        if fwd == (0.0, 0.0, 0.0):
            fwd = (1.0, 0.0, 0.0)
        right = normalize(cross((0.0, 0.0, 1.0), fwd))
        up = cross(fwd, right)
        return p, fwd, right, up


def rotation_from_direction(direction):
    """(pitch, yaw) in degrees for a direction vector, Unreal conventions."""
    yaw = math.degrees(math.atan2(direction[1], direction[0]))
    pitch = math.degrees(math.atan2(direction[2], math.hypot(direction[0], direction[1])))
    return pitch, yaw


def look_at(src, dst):
    return rotation_from_direction(sub(dst, src))


def unwrap_angle(prev, current):
    """Keep a yaw/roll curve continuous so Sequencer never spins 360 degrees between keys."""
    if prev is None:
        return current
    while current - prev > 180.0:
        current -= 360.0
    while current - prev < -180.0:
        current += 360.0
    return current


def handheld_noise(t, amplitude_deg, seed=0.0):
    """Cheap layered-sine 'operator' shake: returns (pitch, yaw, roll) offsets in degrees."""
    if amplitude_deg <= 0:
        return 0.0, 0.0, 0.0
    s = seed * 13.37
    pitch = math.sin(t * 1.7 + s) * 0.6 + math.sin(t * 4.3 + s * 2) * 0.3 + math.sin(t * 11.0 + s * 3) * 0.1
    yaw = math.sin(t * 1.3 + s * 5) * 0.6 + math.sin(t * 3.7 + s * 7) * 0.3 + math.sin(t * 9.1 + s) * 0.1
    roll = math.sin(t * 0.9 + s * 11) * 0.5 + math.sin(t * 2.9 + s * 1.5) * 0.2
    return pitch * amplitude_deg, yaw * amplitude_deg, roll * amplitude_deg * 0.5


# ---------------------------------------------------------------------------
# Car motion
# ---------------------------------------------------------------------------
class ChaseTimeline:
    """Distance-along-road over time for the hero and the chaser."""

    DT = 1.0 / 240.0  # integration step for the speed profile

    def __init__(self, path, duration_s, hero_speed_kmh, chaser_gap_s):
        self.path = path
        self.duration = float(duration_s)
        self.v = hero_speed_kmh * 100000.0 / 3600.0  # km/h -> cm/s
        self.gap = float(chaser_gap_s)

        # Integrate the speed profile once into a distance table.
        self._table = [0.0]
        steps = int(math.ceil(self.duration / self.DT)) + 1
        for i in range(steps):
            self._table.append(self._table[-1] + self._speed(i * self.DT) * self.DT)

        # Start far enough along that the chaser (gap seconds behind) is on the road too,
        # and scale everything down if the road is too short for the requested duration.
        self.start = self.v * self.gap * 1.5
        needed = self.start + self._table[-1]
        self.scale = min(1.0, (path.total_length - 500.0) / needed) if needed > 0 else 1.0
        self.start *= self.scale

    def _speed(self, t):
        """Hero speed (cm/s): launch ramp + slow surges as the driver lifts and floors it."""
        launch = 0.82 + 0.18 * smoothstep(t / 4.0)
        surge = 1.0 + 0.07 * math.sin(t * 0.45 - 1.2)
        return self.v * launch * surge

    def _raw_distance(self, t):
        if t <= 0:
            return self._speed(0.0) * t  # extrapolate backwards at launch speed
        f = t / self.DT
        i = min(int(f), len(self._table) - 2)
        return self._table[i] + (self._table[i + 1] - self._table[i]) * (f - i)

    def hero_distance(self, t):
        return self.start + self._raw_distance(t) * self.scale

    def chaser_distance(self, t):
        # The chaser is `gap` seconds behind but closes in during the second half.
        closing = 0.35 * smoothstep((t - self.duration * 0.4) / (self.duration * 0.5))
        return self.hero_distance(t - self.gap * (1.0 - closing))

    def distance(self, who, t):
        return self.hero_distance(t) if who == "hero" else self.chaser_distance(t)

    def car_transform(self, who, t, height=0.0):
        """Returns (location, (pitch, yaw, roll)) for a car at time t."""
        d = self.distance(who, t)
        p, fwd, right, _up = self.path.frame(d)
        pitch, yaw = rotation_from_direction(fwd)
        # Body roll: lean out of corners based on how fast the heading changes.
        _p2, fwd2, _r2, _u2 = self.path.frame(d + 800.0)
        turn = cross(fwd, fwd2)[2]  # +ve = turning right
        roll = max(-4.0, min(4.0, -turn * 60.0))
        return add(p, (0.0, 0.0, height)), (pitch, yaw, roll)

    def local_point(self, who, t, offset):
        """World point at a (forward, right, up) offset from a car at time t."""
        d = self.distance(who, t)
        p, fwd, right, up = self.path.frame(d)
        return add(add(add(p, mul(fwd, offset[0])), mul(right, offset[1])), mul(up, offset[2]))


# ---------------------------------------------------------------------------
# Camera evaluation
# ---------------------------------------------------------------------------
def camera_transform(shot, timeline, t):
    """Evaluate a shot description (see chase_shots.SHOTS) at absolute time t.

    Returns (location, (pitch, yaw, roll)).
    """
    local_t = (t - shot["start"]) / max(1e-6, shot["end"] - shot["start"])
    eased = smoothstep(local_t) if shot.get("ease", True) else max(0.0, min(1.0, local_t))
    subject = shot.get("subject", "hero")
    target = shot.get("look_at", subject)
    look_offset = shot.get("look_offset", (0.0, 0.0, 60.0))
    offset = shot.get("offset", (0.0, 0.0, 0.0))
    offset_end = shot.get("offset_end", offset)
    cur_offset = lerp(offset, offset_end, eased)
    mode = shot["mode"]

    if mode == "follow":
        cam = timeline.local_point(subject, t, cur_offset)
    elif mode == "static":
        anchor_t = shot["start"] + (shot["end"] - shot["start"]) * shot.get("anchor", 0.5)
        cam = timeline.local_point(subject, anchor_t, offset)
    elif mode == "orbit":
        radius = shot.get("radius", 900.0)
        angle = math.radians(shot.get("orbit_start_deg", 0.0) + shot.get("orbit_deg", 180.0) * eased)
        cam = timeline.local_point(subject, t, (math.cos(angle) * radius, math.sin(angle) * radius, cur_offset[2]))
    else:
        raise ValueError("Unknown camera mode: " + mode)

    if shot.get("lock_rotation_to_car"):
        # Hard-mounted rig: camera inherits the car's rotation plus a fixed aim offset.
        _loc, (c_pitch, c_yaw, c_roll) = timeline.car_transform(subject, t)
        aim = shot.get("aim", (0.0, 0.0))
        pitch, yaw, roll = c_pitch + aim[0], c_yaw + aim[1], c_roll
    else:
        pitch, yaw = look_at(cam, timeline.local_point(target, t, look_offset))
        roll = shot.get("dutch_deg", 0.0)

    n_pitch, n_yaw, n_roll = handheld_noise(t, shot.get("shake", 0.0), seed=sum(map(ord, shot["name"])) % 97)
    return cam, (pitch + n_pitch, yaw + n_yaw, roll + n_roll)


def focus_distance(shot, timeline, t):
    cam, _rot = camera_transform(shot, timeline, t)
    target = timeline.local_point(shot.get("look_at", shot.get("subject", "hero")), t, shot.get("look_offset", (0.0, 0.0, 60.0)))
    return max(10.0, length(sub(target, cam)))
