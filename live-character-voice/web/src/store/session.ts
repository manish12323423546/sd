// Session state (docs/07 §7.6). `reduce` is a pure function of (state, server message) so it can
// be unit-tested; the Zustand store wraps it.
import { create } from "zustand";
import type { Emotion, ServerMessage, VoiceRef } from "../types/protocol";

export type Status = "idle" | "ready" | "live" | "ended" | "error";

export interface SpeakerView {
  id: string;
  name: string;
  color: string;
  voiceId: string;
  emotion?: Emotion;
  arousal?: number;
}

export interface LineView {
  lineId: string;
  tStart: number;
  tEnd: number;
  text: string;
  speakerId: string | null;
  emotion: Emotion | null;
  arousal: number | null;
  delay?: number;
  playAt?: number;
  voiceId?: string | null;
  action?: string;
  late?: boolean;
  played?: boolean;
}

export interface Metrics {
  p50: number;
  p95: number;
  last: number;
  drift: number;
  dropped: number;
  lines: number;
}

export interface Levels {
  original: number;
  voice: number;
  ducking: boolean;
}

export interface SessionState {
  sessionId: string | null;
  status: Status;
  mediaUrl: string | null;
  speakersMax: number;
  speed: number;
  speakers: Record<string, SpeakerView>;
  speakerOrder: string[];
  lines: LineView[]; // newest first
  metrics: Metrics;
  delays: { t: number; d: number }[]; // for the sparkline
  voices: VoiceRef[];
  levels: Levels;
  warnings: string[];
  reportUrl: string | null;
  serverStartWall: number | null;
}

export const MAX_LINES = 500;

export const initialState: SessionState = {
  sessionId: null,
  status: "idle",
  mediaUrl: null,
  speakersMax: 2,
  speed: 1,
  speakers: {},
  speakerOrder: [],
  lines: [],
  metrics: { p50: 0, p95: 0, last: 0, drift: 0, dropped: 0, lines: 0 },
  delays: [],
  voices: [],
  levels: { original: 0.25, voice: 1, ducking: true },
  warnings: [],
  reportUrl: null,
  serverStartWall: null,
};

function upsertSpeaker(state: SessionState, sp: { speaker_id: string; display_name: string; color: string; voice_id: string | null }): SessionState {
  const prev = state.speakers[sp.speaker_id];
  const view: SpeakerView = {
    ...prev,
    id: sp.speaker_id,
    name: sp.display_name,
    color: sp.color,
    voiceId: sp.voice_id ?? prev?.voiceId ?? state.voices[0]?.voice_id ?? "",
  };
  const order = state.speakerOrder.includes(sp.speaker_id)
    ? state.speakerOrder
    : [...state.speakerOrder, sp.speaker_id];
  return { ...state, speakers: { ...state.speakers, [sp.speaker_id]: view }, speakerOrder: order };
}

function patchLine(state: SessionState, lineId: string, patch: Partial<LineView>): SessionState {
  let found = false;
  const lines = state.lines.map((l) => {
    if (l.lineId !== lineId) return l;
    found = true;
    return { ...l, ...patch };
  });
  return found ? { ...state, lines } : state;
}

export function reduce(state: SessionState, msg: ServerMessage): SessionState {
  switch (msg.type) {
    case "session.ready": {
      let s: SessionState = {
        ...state,
        sessionId: msg.session_id,
        status: state.status === "idle" ? "ready" : state.status,
        mediaUrl: msg.media_url,
        speakersMax: msg.speakers_max,
        speed: msg.speed ?? 1,
        voices: msg.voices,
      };
      for (const sp of msg.speakers ?? []) s = upsertSpeaker(s, sp);
      return s;
    }
    case "session.started":
      return { ...state, status: "live", serverStartWall: msg.server_wall };
    case "speaker.new":
    case "speaker.updated":
      return upsertSpeaker(state, msg.speaker);
    case "line.complete": {
      const l = msg.line;
      const view: LineView = {
        lineId: l.line_id,
        tStart: l.t_start,
        tEnd: l.t_end,
        text: l.text ?? "",
        speakerId: l.speaker_id,
        emotion: l.emotion,
        arousal: l.arousal,
      };
      let s: SessionState = { ...state, lines: [view, ...state.lines].slice(0, MAX_LINES) };
      const sp = l.speaker_id ? s.speakers[l.speaker_id] : undefined;
      if (l.speaker_id && sp && l.emotion) {
        s = {
          ...s,
          speakers: {
            ...s.speakers,
            [l.speaker_id]: { ...sp, emotion: l.emotion, arousal: l.arousal ?? undefined },
          },
        };
      }
      return s;
    }
    case "audio.ready": {
      const s = patchLine(state, msg.line_id, {
        delay: msg.delay_ready ?? undefined,
        playAt: msg.play_at_media,
        voiceId: msg.voice_id,
        action: msg.schedule_action,
      });
      const delays =
        msg.delay_ready === null
          ? s.delays
          : [...s.delays, { t: msg.play_at_media, d: msg.delay_ready }].slice(-400);
      return { ...s, delays };
    }
    case "metrics":
      return {
        ...state,
        metrics: {
          p50: msg.p50_delay,
          p95: msg.p95_delay,
          last: msg.last_delay,
          drift: msg.drift_slope,
          dropped: msg.dropped,
          lines: msg.lines,
        },
      };
    case "warning":
    case "error":
      return { ...state, warnings: [msg.message, ...state.warnings].slice(0, 20) };
    case "session.ended":
      return { ...state, status: "ended", reportUrl: msg.report_url };
    case "pong":
      return state;
  }
}

/** Lines whose delay is from the last `windowS` seconds of media time (sparkline). */
export function recentDelays(state: SessionState, windowS = 120): { t: number; d: number }[] {
  const last = state.delays[state.delays.length - 1];
  if (!last) return [];
  return state.delays.filter((p) => p.t >= last.t - windowS);
}

/** Delay log CSV (what the player saw), for the "Export delay log" button. */
export function toCsv(lines: LineView[]): string {
  const head = "line_id,t_start,t_end,speaker_id,emotion,voice_id,delay_ready,play_at_media,action,late,text";
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [...lines]
    .reverse()
    .map((l) =>
      [
        l.lineId,
        l.tStart,
        l.tEnd,
        l.speakerId ?? "",
        l.emotion ?? "",
        l.voiceId ?? "",
        l.delay ?? "",
        l.playAt ?? "",
        l.action ?? "",
        l.late ? 1 : 0,
        esc(l.text),
      ].join(","),
    );
  return [head, ...rows].join("\n") + "\n";
}

interface Store extends SessionState {
  apply: (msg: ServerMessage) => void;
  reset: () => void;
  setLevels: (patch: Partial<Levels>) => void;
  setSpeakerVoice: (speakerId: string, voiceId: string) => void;
  markPlayed: (lineId: string, late: boolean) => void;
  setStatus: (status: Status) => void;
}

export const useSession = create<Store>((set) => ({
  ...initialState,
  apply: (msg) => set((s) => reduce(s, msg)),
  reset: () => set(() => ({ ...initialState })),
  setLevels: (patch) => set((s) => ({ levels: { ...s.levels, ...patch } })),
  setSpeakerVoice: (speakerId, voiceId) =>
    set((s) => {
      const sp = s.speakers[speakerId];
      if (!sp) return {};
      return { speakers: { ...s.speakers, [speakerId]: { ...sp, voiceId } } };
    }),
  markPlayed: (lineId, late) => set((s) => patchLine(s, lineId, { played: true, late })),
  setStatus: (status) => set(() => ({ status })),
}));
