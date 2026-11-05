import { describe, expect, it } from "vitest";
import { buildDuckPlan, gainAt, mergeIntervals } from "./ducking";
import { planStart } from "./scheduler";

describe("start time maths", () => {
  it("schedules ahead relative to the video clock", () => {
    expect(planStart(66.1, 65.0, 100, 1)).toEqual({ when: 101.1, late: false, lateBy: 0 });
    expect(planStart(66.0, 64.0, 100, 4).when).toBeCloseTo(100.5);
  });
  it("plays now when slightly late, and marks late beyond 0.5 s", () => {
    const a = planStart(65.0, 65.3, 100);
    expect(a.when).toBe(100);
    expect(a.late).toBe(false);
    const b = planStart(65.0, 66.0, 100);
    expect(b.late).toBe(true);
    expect(b.lateBy).toBeCloseTo(1.0);
  });
});

describe("ducking envelope", () => {
  it("ramps to 25 % over 80 ms and back 150 ms after the line", () => {
    const plan = buildDuckPlan([{ start: 10, end: 12 }], 0.8);
    expect(gainAt(plan, 9.9, 0.8)).toBeCloseTo(0.8);
    expect(gainAt(plan, 10.04, 0.8)).toBeCloseTo(0.8 - 0.6 * 0.5);
    expect(gainAt(plan, 11, 0.8)).toBeCloseTo(0.2);
    expect(gainAt(plan, 12.14, 0.8)).toBeCloseTo(0.2);
    expect(gainAt(plan, 12.5, 0.8)).toBeCloseTo(0.8);
  });
  it("merges lines that follow each other so the original never pumps up in between", () => {
    expect(mergeIntervals([{ start: 5, end: 6 }, { start: 1, end: 2 }, { start: 2.1, end: 3 }])).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
    ]);
    expect(buildDuckPlan([{ start: 1, end: 2 }], 1, false)).toEqual([]);
  });
});
