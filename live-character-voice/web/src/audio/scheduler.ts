// When to start a voice line in AudioContext time (docs/07 §7.4).
// ctxStart = ctx.currentTime + (play_at_media − video.currentTime) / playbackRate
// If that is in the past by < 0.5 s → play now; by more → play now and mark late.

export interface StartPlan {
  when: number; // AudioContext time
  late: boolean;
  lateBy: number; // seconds of media time (0 if on time)
}

export const LATE_TOLERANCE_S = 0.5;

export function planStart(
  playAtMedia: number,
  videoTime: number,
  ctxTime: number,
  playbackRate = 1,
): StartPlan {
  const ahead = (playAtMedia - videoTime) / Math.max(0.01, playbackRate);
  if (ahead >= 0) return { when: ctxTime + ahead, late: false, lateBy: 0 };
  const lateBy = -ahead * playbackRate;
  return { when: ctxTime, late: lateBy > LATE_TOLERANCE_S, lateBy };
}

/** One voice at a time: a line never starts while the previous one is still sounding.
 *  Streamed lines have no known length until they end, so they hold the lane "open".
 *  (Measured before this: 1–3 of 60 lines overlapped the previous voice by up to 0.95 s.) */
export const LANE_GAP_S = 0.05;

export class VoiceLane {
  private busyUntil = 0;
  private openUntil: number | null = null; // a streamed line is playing (safety limit, ctx time)

  /** When a line wanted at `when` may start (ctx time), or null while a streamed line plays. */
  startTime(when: number, now: number): number | null {
    if (this.openUntil !== null) {
      if (now < this.openUntil) return null;
      this.closeOpen(now); // the stream never reported its end: don't block for ever
    }
    return Math.max(when, now, this.busyUntil > 0 ? this.busyUntil + LANE_GAP_S : 0);
  }

  occupy(at: number, duration: number): void {
    this.busyUntil = Math.max(this.busyUntil, at + duration);
  }

  open(now: number, maxDuration: number): void {
    this.openUntil = now + maxDuration;
  }

  closeOpen(now: number): void {
    this.openUntil = null;
    this.busyUntil = Math.max(this.busyUntil, now);
  }
}
