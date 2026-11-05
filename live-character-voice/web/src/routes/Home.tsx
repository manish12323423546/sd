import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VoiceUpload } from "../components/VoiceUpload";
import { api, type Clip, type Health } from "../net/api";

function dur(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function Home() {
  const nav = useNavigate();
  const [health, setHealth] = useState<Health | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [clipId, setClipId] = useState<string>("");
  const [speakers, setSpeakers] = useState(2);
  const [enroll, setEnroll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speed = Number(new URLSearchParams(window.location.search).get("speed") ?? "1") || 1;

  const refresh = async () => {
    try {
      const [h, c] = await Promise.all([api.health(), api.clips()]);
      setHealth(h);
      setClips(c);
      setClipId((cur) => cur || c[0]?.clip_id || "");
    } catch (e) {
      setError(`Backend not reachable: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const selected = clips.find((c) => c.clip_id === clipId);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const c = await api.uploadClip(file);
      await refresh();
      setClipId(c.clip_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!clipId) return;
    setBusy(true);
    setError(null);
    try {
      const s = await api.createSession({ clip_id: clipId, max_speakers: speakers, use_enroll: enroll, speed });
      nav(`/session/${s.session_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const ready = health?.models_loaded && Object.values(health.models_loaded).every(Boolean);

  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
      <section className="rounded-panel border border-line bg-panel p-4">
        <h2 className="mb-3 text-[20px] font-semibold">1. Pick a clip</h2>
        <ul className="flex flex-col gap-2" data-testid="clips">
          {clips.map((c) => (
            <li key={c.clip_id}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 ${c.clip_id === clipId ? "border-accent" : "border-line"}`}>
                <input type="radio" name="clip" value={c.clip_id} checked={c.clip_id === clipId} onChange={() => setClipId(c.clip_id)} />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs text-muted">{dur(c.duration)}</span>
                {c.has_truth && <span className="text-xs text-calm">truth</span>}
              </label>
            </li>
          ))}
          {clips.length === 0 && <li className="text-muted">No clips yet — run <code>make synth</code> or upload one.</li>}
        </ul>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent">
          Upload clip (.mp4 / .mkv / .mov)
          <input type="file" accept=".mp4,.mkv,.mov" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        <p className="mt-2 text-xs text-muted">
          Any video works: speakers, words, emotion and delay are analysed live while it plays, and a full report is written at the end.
          Only use footage you are allowed to use.
        </p>
      </section>
      <div className="lg:col-start-1">
        <VoiceUpload cloning={Boolean(health?.voice_cloning)} />
      </div>

      <aside className="flex flex-col gap-4">
        <section className="rounded-panel border border-line bg-panel p-4">
          <h2 className="mb-3 text-[20px] font-semibold">2. Session</h2>
          <label className="mb-2 flex items-center justify-between gap-2 text-sm">
            Max commentators
            <select aria-label="Max commentators" className="rounded-md border border-line bg-bg px-2 py-1" value={speakers} onChange={(e) => setSpeakers(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <label className={`mb-3 flex items-center gap-2 text-sm ${selected?.has_enroll ? "" : "opacity-50"}`}>
            <input type="checkbox" disabled={!selected?.has_enroll} checked={enroll && !!selected?.has_enroll} onChange={(e) => setEnroll(e.target.checked)} />
            Use enrollment file (known commentators)
          </label>
          {speed !== 1 && <p className="mb-2 text-xs text-excited">Dev speed {speed}× — not a live measurement.</p>}
          <button type="button" data-testid="start-session" disabled={!clipId || busy || !ready}
            className="w-full rounded-md bg-accent px-3 py-2 font-semibold text-bg disabled:opacity-40" onClick={() => void start()}>
            {busy ? "Starting…" : "Start session"}
          </button>
          {error && <p className="mt-2 text-sm text-peak" role="alert">{error}</p>}
        </section>
        <section className="rounded-panel border border-line bg-panel p-4 text-sm" data-testid="health">
          <h2 className="mb-2 font-semibold">Backend</h2>
          {!health && <p className="text-muted">checking…</p>}
          {health && (
            <ul className="flex flex-col gap-1">
              {Object.entries(health.models_loaded).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className={v ? "text-calm" : "text-peak"}>{v ? "loaded" : "not loaded"}</span>
                </li>
              ))}
              {Object.entries(health.model_info).map(([k, v]) => (
                <li key={`i-${k}`} className="text-xs text-muted">{k}: {v}</li>
              ))}
              {health.active_session && <li className="text-xs text-excited">active session: {health.active_session}</li>}
            </ul>
          )}
        </section>
      </aside>
    </main>
  );
}
