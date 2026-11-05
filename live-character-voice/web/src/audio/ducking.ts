// Ducking envelope builder (docs/07 §7.4): when a voice line starts, ramp the original level to
// level × 0.25 over 80 ms; ramp back 150 ms after the line ends (unless another line starts).
// Returns gain automation points [time, value] for linearRampToValueAtTime.

export interface Interval {
  start: number; // AudioContext seconds
  end: number;
}

export interface RampPoint {
  time: number;
  value: number;
}

export const DUCK_FACTOR = 0.25;
export const ATTACK_S = 0.08;
export const RELEASE_DELAY_S = 0.15;
export const RELEASE_S = 0.08;

/** Merge intervals that overlap once the release hold is included. */
export function mergeIntervals(intervals: Interval[], hold = RELEASE_DELAY_S): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end + hold + RELEASE_S) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

export function buildDuckPlan(intervals: Interval[], level: number, enabled = true): RampPoint[] {
  if (!enabled) return [];
  const ducked = level * DUCK_FACTOR;
  const points: RampPoint[] = [];
  for (const iv of mergeIntervals(intervals)) {
    points.push({ time: iv.start, value: level });
    points.push({ time: iv.start + ATTACK_S, value: ducked });
    points.push({ time: iv.end + RELEASE_DELAY_S, value: ducked });
    points.push({ time: iv.end + RELEASE_DELAY_S + RELEASE_S, value: level });
  }
  return points;
}

/** Gain value at time t for a plan (linear interpolation; `level` outside all ramps). */
export function gainAt(plan: RampPoint[], t: number, level: number): number {
  if (plan.length === 0) return level;
  let prev: RampPoint = { time: -Infinity, value: level };
  for (const p of plan) {
    if (t < p.time) {
      if (prev.time === -Infinity) return level;
      const f = (t - prev.time) / (p.time - prev.time);
      return prev.value + (p.value - prev.value) * f;
    }
    prev = p;
  }
  return prev.value;
}
