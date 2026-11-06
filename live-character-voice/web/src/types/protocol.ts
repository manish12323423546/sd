// WebSocket protocol types — mirrors docs/05 §5.4 exactly (plus a few documented extras:
// `speaker.updated`, `pong.server_wall`, `session.ready.speakers/speed`, `error`).

export type Emotion = "calm" | "neutral" | "excited" | "peak";
export const EMOTIONS: readonly Emotion[] = ["calm", "neutral", "excited", "peak"];

export interface VoiceRef {
  voice_id: string;
  name: string;
  preview_url: string;
}

export interface SpeakerMsg {
  speaker_id: string;
  display_name: string;
  color: string;
  voice_id: string | null;
}

export interface LineMsg {
  line_id: string;
  t_start: number;
  t_end: number;
  text: string | null;
  speaker_id: string | null;
  emotion: Emotion | null;
  arousal: number | null;
}

export interface SessionReady {
  type: "session.ready";
  session_id: string;
  media_url: string;
  speakers_max: number;
  voices: VoiceRef[];
  speed?: number;
  speakers?: SpeakerMsg[];
  /** synced mode: the picture runs this many seconds behind live (0 = live) */
  view_delay_s?: number;
}
export interface SessionStarted {
  type: "session.started";
  server_wall: number;
}
export interface SessionPaused {
  type: "session.paused" | "session.resumed";
  server_wall: number;
}
export interface SpeakerNew {
  type: "speaker.new" | "speaker.updated";
  speaker: SpeakerMsg;
}
export interface LineComplete {
  type: "line.complete";
  line: LineMsg;
}
export interface AudioReady {
  type: "audio.ready";
  line_id: string;
  voice_id: string | null;
  url: string;
  duration: number;
  play_at_media: number;
  schedule_action: string;
  delay_ready: number | null;
  t_start?: number;
  text?: string | null;
}
export interface MetricsMsg {
  type: "metrics";
  p50_delay: number;
  p95_delay: number;
  last_delay: number;
  drift_slope: number;
  lines: number;
  dropped: number;
}
export interface WarningMsg {
  type: "warning";
  message: string;
}
export interface SessionEnded {
  type: "session.ended";
  report_url: string;
}
export interface ServerPong {
  type: "pong";
  t: number;
  server_wall?: number;
}
export interface ErrorMsg {
  type: "error";
  message: string;
}

export type ServerMessage =
  | SessionReady
  | SessionStarted
  | SessionPaused
  | SpeakerNew
  | LineComplete
  | AudioReady
  | MetricsMsg
  | WarningMsg
  | SessionEnded
  | ServerPong
  | ErrorMsg;

export type ClientMessage =
  | { type: "start" }
  | { type: "set_voice"; speaker_id: string; voice_id: string }
  | { type: "played"; line_id: string; client_media_time: number }
  | { type: "stop" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "ping"; t: number };

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string";

function isSpeaker(x: unknown): x is SpeakerMsg {
  return isObj(x) && isStr(x.speaker_id) && isStr(x.display_name) && isStr(x.color);
}

function isLine(x: unknown): x is LineMsg {
  return isObj(x) && isStr(x.line_id) && isNum(x.t_start) && isNum(x.t_end);
}

/** Validate an incoming message; returns null for anything malformed or unknown. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (!isObj(raw) || !isStr(raw.type)) return null;
  const m = raw;
  switch (m.type) {
    case "session.ready":
      return isStr(m.session_id) && isStr(m.media_url) && Array.isArray(m.voices)
        ? (m as unknown as SessionReady)
        : null;
    case "session.started":
      return isNum(m.server_wall) ? (m as unknown as SessionStarted) : null;
    case "session.paused":
    case "session.resumed":
      return isNum(m.server_wall) ? (m as unknown as SessionPaused) : null;
    case "speaker.new":
    case "speaker.updated":
      return isSpeaker(m.speaker) ? (m as unknown as SpeakerNew) : null;
    case "line.complete":
      return isLine(m.line) ? (m as unknown as LineComplete) : null;
    case "audio.ready":
      return isStr(m.line_id) && isStr(m.url) && isNum(m.play_at_media) && isNum(m.duration)
        ? (m as unknown as AudioReady)
        : null;
    case "metrics":
      return isNum(m.p50_delay) && isNum(m.p95_delay) ? (m as unknown as MetricsMsg) : null;
    case "warning":
    case "error":
      return isStr(m.message) ? (m as unknown as WarningMsg | ErrorMsg) : null;
    case "session.ended":
      return isStr(m.report_url) ? (m as unknown as SessionEnded) : null;
    case "pong":
      return isNum(m.t) ? (m as unknown as ServerPong) : null;
    default:
      return null;
  }
}

export function isPong(msg: unknown): msg is ServerPong {
  return parseServerMessage(msg)?.type === "pong";
}
