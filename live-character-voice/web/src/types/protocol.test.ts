import { describe, expect, it } from "vitest";
import { isPong } from "./protocol";

describe("protocol", () => {
  it("parses the pong example from docs/05", () => {
    expect(isPong(JSON.parse('{ "type": "pong", "t": 123.4 }'))).toBe(true);
    expect(isPong({ type: "ping", t: 1 })).toBe(false);
  });
});
