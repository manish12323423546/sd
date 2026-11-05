// HTTP API client (docs/06 §6.4). Vite proxies /api, /media and /ws to FastAPI on :8000.

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
  engines?: Record<string, { online: boolean; name: string; note: string }>;
  fish_fallback_lines?: number;
}

export interface CreateSessionBody {
  clip_id: string;
  max_speakers: number;
  voice_map?: Record<string, string>;
  use_enroll?: boolean;
  speed?: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  health: async (): Promise<Health> => json<Health>(await fetch("/api/health")),
  clips: async (): Promise<Clip[]> => json<Clip[]>(await fetch("/api/clips")),
  voices: async (): Promise<Voice[]> => json<Voice[]>(await fetch("/api/voices")),
  uploadClip: async (file: File): Promise<Clip> => {
    const form = new FormData();
    form.append("file", file);
    return json<Clip>(await fetch("/api/clips", { method: "POST", body: form }));
  },
  addVoice: async (name: string, file: File, consent: boolean, transcript: string): Promise<Voice> => {
    const form = new FormData();
    form.append("name", name);
    form.append("consent", consent ? "true" : "false");
    form.append("transcript", transcript);
    form.append("file", file);
    return json<Voice>(await fetch("/api/voices/custom", { method: "POST", body: form }));
  },
  deleteVoice: async (voiceId: string): Promise<void> => {
    await json(await fetch(`/api/voices/custom/${voiceId}`, { method: "DELETE" }));
  },
  startProClone: async (name: string, file: File, consent: boolean): Promise<CloneJob> => {
    const form = new FormData();
    form.append("name", name);
    form.append("consent", consent ? "true" : "false");
    form.append("file", file);
    return json<CloneJob>(await fetch("/api/voices/pro", { method: "POST", body: form }));
  },
  cloneJob: async (jobId: string): Promise<CloneJob> => json<CloneJob>(await fetch(`/api/voices/jobs/${jobId}`)),
  voiceDetail: async (voiceId: string): Promise<VoiceDetail> =>
    json<VoiceDetail>(await fetch(`/api/voices/custom/${voiceId}`)),
  /** Speak a line; resolves to an object URL of the WAV and how long generation took. */
  say: async (voiceId: string, text: string, emotion: string): Promise<{ url: string; seconds: number }> => {
    const t = performance.now();
    const res = await fetch(`/api/voices/${voiceId}/say`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, emotion }),
    });
    if (!res.ok) await json(res);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), seconds: (performance.now() - t) / 1000 };
  },
  createSession: async (body: CreateSessionBody): Promise<{ session_id: string; ws_url: string }> =>
    json(
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  stopSession: async (id: string): Promise<void> => {
    await fetch(`/api/sessions/${id}/stop`, { method: "POST" });
  },
};

export function wsUrl(path: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
