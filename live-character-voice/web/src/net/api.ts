// HTTP API client (docs/06 §6.4). Vite proxies /api, /media and /ws to FastAPI on :8000;
// hosted builds point at the engine with VITE_API_BASE (see net/base.ts).
import { apiFetch, withBase, wsUrl as baseWsUrl } from "./base";

export interface Clip {
  clip_id: string;
  name: string;
  duration: number;
  url: string;
  has_truth: boolean;
  has_enroll: boolean;
}

export interface Voice {
  voice_id: string;
  name: string;
  description: string;
  lang: string;
  preview_url: string;
  custom?: boolean;
  tier?: "builtin" | "instant" | "pro";
  score?: number | null;
}

export interface CloneJob {
  job_id: string;
  name: string;
  stage: string;
  progress: number;
  steps: { key: string; label: string }[];
  log: string[];
  error: string | null;
  result: VoiceDetail | null;
  elapsed_s: number;
}

export interface RefClip {
  file: string;
  text: string;
  seconds: number;
  url?: string;
  similarity?: number;
  snr_db?: number;
  arousal?: number;
}

export interface VoiceDetail {
  voice_id: string;
  name: string;
  tier: "instant" | "pro";
  transcript: string;
  seconds: number;
  source_seconds?: number;
  speech_seconds?: number;
  main_speaker_seconds?: number;
  dropped_parts?: number;
  refs?: Record<string, RefClip[]>;
  ref_url?: string;
  quality?: {
    tested: boolean;
    score?: number;
    similarity?: number;
    reason?: string;
    moods?: Record<string, { similarity: number; seconds: number; loudness_db: number; made_in_s: number; url?: string }>;
  };
  fish_model?: { trained: boolean; reason?: string; model_id?: string };
  created: string;
}

export interface Health {
  ok: boolean;
  models_loaded: Record<string, boolean>;
  model_info: Record<string, string>;
  load_s: Record<string, number>;
  active_session: string | null;
  voice_cloning?: boolean;
  access_code_required?: boolean;
  hosted?: boolean;
  commit?: string;
  engines?: Record<string, { online: boolean; name: string; note: string }>;
  fish_fallback_lines?: number;
  /** permanent voice library: this server's role and whether voices can be changed here */
  voice_library?: { enabled: boolean; role: "all" | "app" | "studio"; can_edit: boolean; error: string | null };
}

export interface LibraryVoice {
  voice_id: string;
  name: string;
  tier: string;
  /** offered in the public app (false = kept but hidden) */
  enabled: boolean;
  /** stored permanently in the library */
  saved: boolean;
  created?: string;
  seconds?: number;
}

export interface VoiceLibraryStatus {
  enabled: boolean;
  where: string | null;
  role: "all" | "app" | "studio";
  can_edit: boolean;
  head: string | null;
  last_sync: number | null;
  error: string | null;
  rescued: string[];
  voices: LibraryVoice[];
}

export interface CreateSessionBody {
  clip_id: string;
  max_speakers: number;
  voice_map?: Record<string, string>;
  use_enroll?: boolean;
  speed?: number;
  view_delay_s?: number;
  known_voices?: string[];
}

/** Structured API error. A 409 "session_busy" carries the blocking session and what can be
 *  done about it: { code, message, session_id, state, actions }. */
export interface ApiErrorDetail {
  code?: string;
  message?: string;
  session_id?: string | null;
  state?: string | null;
  actions?: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: ApiErrorDetail = {},
  ) {
    super(message);
  }
}

export async function errorFrom(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  let detail: ApiErrorDetail = {};
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") message = body.detail;
    else if (body.detail && typeof body.detail === "object") {
      detail = body.detail as ApiErrorDetail;
      if (typeof detail.message === "string") message = detail.message;
    }
  } catch {
    /* keep status text */
  }
  return new ApiError(message, res.status, detail);
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}

export const api = {
  health: async (): Promise<Health> => json<Health>(await apiFetch("/api/health")),
  clips: async (): Promise<Clip[]> =>
    (await json<Clip[]>(await apiFetch("/api/clips"))).map((c) => ({ ...c, url: withBase(c.url) })),
  voices: async (): Promise<Voice[]> =>
    (await json<Voice[]>(await apiFetch("/api/voices"))).map((v) => ({ ...v, preview_url: withBase(v.preview_url) })),
  uploadClip: async (file: File): Promise<Clip> => {
    const form = new FormData();
    form.append("file", file);
    return json<Clip>(await apiFetch("/api/clips", { method: "POST", body: form }));
  },
  addVoice: async (name: string, file: File, consent: boolean, transcript: string): Promise<Voice> => {
    const form = new FormData();
    form.append("name", name);
    form.append("consent", consent ? "true" : "false");
    form.append("transcript", transcript);
    form.append("file", file);
    return json<Voice>(await apiFetch("/api/voices/custom", { method: "POST", body: form }));
  },
  voiceLibrary: async (): Promise<VoiceLibraryStatus> => json(await apiFetch("/api/voices/library")),
  setVoiceEnabled: async (voiceId: string, enabled: boolean): Promise<{ enabled: boolean }> =>
    json(
      await apiFetch(`/api/voices/library/${voiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }),
    ),
  syncVoiceLibrary: async (): Promise<{ changed: boolean }> =>
    json(await apiFetch("/api/voices/library/sync", { method: "POST" })),
  deleteVoice: async (voiceId: string): Promise<void> => {
    await json(await apiFetch(`/api/voices/custom/${voiceId}`, { method: "DELETE" }));
  },
  startProClone: async (name: string, file: File, consent: boolean): Promise<CloneJob> => {
    const form = new FormData();
    form.append("name", name);
    form.append("consent", consent ? "true" : "false");
    form.append("file", file);
    return json<CloneJob>(await apiFetch("/api/voices/pro", { method: "POST", body: form }));
  },
  cloneJob: async (jobId: string): Promise<CloneJob> => json<CloneJob>(await apiFetch(`/api/voices/jobs/${jobId}`)),
  voiceDetail: async (voiceId: string): Promise<VoiceDetail> => {
    const v = await json<VoiceDetail>(await apiFetch(`/api/voices/custom/${voiceId}`));
    for (const list of Object.values(v.refs ?? {})) for (const r of list) r.url = withBase(r.url);
    for (const m of Object.values(v.quality?.moods ?? {})) m.url = withBase(m.url);
    v.ref_url = withBase(v.ref_url);
    return v;
  },
  /** Speak a line; resolves to an object URL of the WAV and how long generation took. */
  say: async (voiceId: string, text: string, emotion: string): Promise<{ url: string; seconds: number }> => {
    const t = performance.now();
    const res = await apiFetch(`/api/voices/${voiceId}/say`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, emotion }),
    });
    if (!res.ok) await json(res);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), seconds: (performance.now() - t) / 1000 };
  },
  setKeys: async (body: { fish?: string; groq?: string; deepgram?: string; hf?: string; asr?: string; admin_code?: string }): Promise<{ results: Record<string, { ok: boolean; message: string }>; voice_cloning: boolean }> =>
    json(
      await apiFetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  keysStatus: async (): Promise<KeysStatus> => json(await apiFetch("/api/keys")),
  createSession: async (body: CreateSessionBody): Promise<{ session_id: string; ws_url: string }> =>
    json(
      await apiFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  stopSession: async (id: string): Promise<void> => {
    await apiFetch(`/api/sessions/${id}/stop`, { method: "POST" });
  },
};

export function wsUrl(path: string): string {
  return baseWsUrl(path);
}

export interface KeysStatus {
  connected: { fish: boolean; groq: boolean; deepgram: boolean; hf?: boolean };
  asr: string;
  asr_choices: string[];
  engines: Record<string, { online?: boolean; name?: string; note?: string }>;
  needs_admin_code: boolean;
  admin_enabled: boolean;
}
