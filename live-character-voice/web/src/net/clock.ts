// Clock sync with the server (docs/05 §5.4 "Clock sync rule").
// The server clock is "session seconds" = media time of the live broadcast. We estimate it from
// ping/pong round trips, keep the video within 300 ms of it by nudging playbackRate (0.97–1.03),
// and seek if it is more than 2 s off.

export interface ClockSample {
  rtt: number; // seconds
  serverAtRecv: number; // estimated server time when the pong arrived
  localAtRecv: number; // local seconds when the pong arrived
}

export class ClockSync {
  private samples: ClockSample[] = [];
  constructor(private readonly speed = 1) {}

  /** Record a pong. `tSent` = local time the ping was sent, `serverWall` = server time in pong. */
  addPong(tSent: number, serverWall: number, localNow: number): ClockSample {
    const rtt = Math.max(0, localNow - tSent);
    const sample = { rtt, serverAtRecv: serverWall + (rtt / 2) * this.speed, localAtRecv: localNow };
    this.samples.push(sample);
    if (this.samples.length > 8) this.samples.shift();
    return sample;
  }

  /** Anchor at session start (server says server_wall at the moment we received it). */
  anchor(serverWall: number, localNow: number): void {
    this.samples = [{ rtt: 0.05, serverAtRecv: serverWall, localAtRecv: localNow }];
  }

  get best(): ClockSample | null {
    if (this.samples.length === 0) return null;
    return this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
  }

  /** Estimated server (media) time now. */
  serverNow(localNow: number): number | null {
    const b = this.best;
    if (!b) return null;
    return b.serverAtRecv + (localNow - b.localAtRecv) * this.speed;
  }
}

export type SyncAction =
  | { kind: "none"; rate: number }
  | { kind: "rate"; rate: number }
  | { kind: "seek"; to: number };

/** Decide how to keep the video at live media time. drift = video − server (s). */
export function syncAction(videoTime: number, serverTime: number, baseRate = 1): SyncAction {
  const drift = videoTime - serverTime;
  if (Math.abs(drift) > 2) return { kind: "seek", to: serverTime };
  if (Math.abs(drift) > 0.3) {
    // video ahead → slow down; behind → speed up; capped at ±3 %
    const nudge = Math.max(-0.03, Math.min(0.03, -drift * 0.05));
    return { kind: "rate", rate: baseRate * (1 + nudge) };
  }
  // inside the 300 ms band: drift back to the base rate
  return { kind: "none", rate: baseRate };
}
