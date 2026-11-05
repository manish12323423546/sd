import { describe, expect, it } from "vitest";
import { ClockSync, syncAction } from "./clock";

describe("clock sync", () => {
  it("estimates server time from the lowest round trip", () => {
    const c = new ClockSync();
    c.addPong(10.0, 100.0, 10.4); // rtt 0.4 → server at recv ≈ 100.2
    c.addPong(20.0, 110.0, 20.1); // rtt 0.1 → server at recv ≈ 110.05 (best)
    expect(c.best?.rtt).toBeCloseTo(0.1);
    expect(c.serverNow(21.1)).toBeCloseTo(111.05);
  });

  it("scales with the session speed", () => {
    const c = new ClockSync(4);
    c.anchor(10, 1);
    expect(c.serverNow(2)).toBeCloseTo(14);
  });

  it("nudges playbackRate inside ±3 % and seeks past 2 s", () => {
    expect(syncAction(10.1, 10.0)).toEqual({ kind: "none", rate: 1 });
    const behind = syncAction(9.5, 10.0);
    expect(behind.kind).toBe("rate");
    if (behind.kind === "rate") expect(behind.rate).toBeCloseTo(1.025);
    const ahead = syncAction(11.5, 10.0);
    if (ahead.kind === "rate") expect(ahead.rate).toBeCloseTo(0.97);
    expect(syncAction(13, 10)).toEqual({ kind: "seek", to: 10 });
  });
});
