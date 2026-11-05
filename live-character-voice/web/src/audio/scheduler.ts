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
