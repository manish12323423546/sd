// WebSocket protocol types (docs/05 §5.4). M0 holds the core shapes; M8/M9 complete them.
export type Emotion = "calm" | "neutral" | "excited" | "peak";

export interface ClientPing {
  type: "ping";
  t: number;
}

export interface ServerPong {
  type: "pong";
  t: number;
}

export function isPong(msg: unknown): msg is ServerPong {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return m.type === "pong" && typeof m.t === "number";
}
