// Studio: pick footage → cast a voice for each commentator → go live.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EngineBanner } from "../components/EngineBanner";
import { api, type Clip, type Health, type Voice } from "../net/api";
import { Avatar, DropZone, PlayButton, TierBadge } from "../ui/kit";

const SPEAKER_COLORS = ["#4FA3FF", "#F5A524", "#17C964", "#F31260", "#9B7BFF", "#2BD4D4", "#FF8A3D", "#E8E36B"];
const SYNC_DEFAULT_S = 6;

function dur(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function Home() {
  const nav = useNavigate();
  const [health, setHealth] = useState<Health | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [clipId, setClipId] = useState<string>("");
  const [speakers, setSpeakers] = useState(2);
  const [cast, setCast] = useState<Record<string, string>>({});
  const [enroll, setEnroll] = useState(false);
  const [mode, setMode] = useState<"synced" | "live">(() => {
    try {
      return localStorage.getItem("lcv.mode") === "live" ? "live" : "synced";
    } catch {
      return "synced";
    }
  });
  const [syncDelay, setSyncDelay] = useState(SYNC_DEFAULT_S);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speed = Number(new URLSearchParams(window.location.search).get("speed") ?? "1") || 1;

  const refresh = async () => {
    try {
      const [h, c, v] = await Promise.all([api.health(), api.clips(), api.voices()]);
      setHealth(h);
      setClips(c);
      setVoices(v);
      setClipId((cur) => cur || c[0]?.clip_id || "");
    } catch (e) {
      setError(`Backend not reachable: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    void refresh();
    const on = () => void refresh();
    window.addEventListener("engines-changed", on);
    return () => window.removeEventListener("engines-changed", on);
  }, []);

  const selected = clips.find((c) => c.clip_id === clipId);
  const ready = health?.models_loaded && Object.values(health.models_loaded).every(Boolean);
  // "Auto" lets the engine find up to 8; the cast list shows the first 4 (switch the rest live)
  const ids = Array.from({ length: Math.min(speakers, 4) }, (_, i) => `S${i + 1}`);
  const [known, setKnown] = useState<string[]>([]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const c = await api.uploadClip(file);
      await refresh();
      setClipId(c.clip_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const start = async () => {
    if (!clipId) return;
    setBusy(true);
    setError(null);
    try {
      const voice_map = Object.fromEntries(ids.filter((k) => cast[k]).map((k) => [k, cast[k] as string]));
      try {
        localStorage.setItem("lcv.mode", mode);
      } catch {
        /* private mode: fine */
      }
      const s = await api.createSession({
        clip_id: clipId, max_speakers: speakers, use_enroll: enroll, speed, voice_map,
        known_voices: known.length ? known : undefined,
        view_delay_s: mode === "synced" ? syncDelay : 0,
      });
      nav(`/session/${s.session_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#0f1a2c] via-[#0c111b] to-[#170f26] px-6 py-8 sm:px-10 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 items-center justify-end gap-1 pr-10 opacity-70 md:flex">
          {Array.from({ length: 48 }, (_, i) => (
            <span key={i} className="w-1 animate-bar rounded-full bg-gradient-to-t from-accent via-violet to-peak"
              style={{ height: `${18 + Math.abs(Math.sin(i * 0.45) * Math.cos(i * 0.13)) * 150}px`, animationDelay: `${(i % 12) * 0.09}s`, animationDuration: `${0.9 + (i % 6) * 0.18}s` }} />
          ))}
        </div>
        <p className="eyebrow">Studio</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
          <span className="gradient-text">Re-voice live commentary in any character.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted">
          Words, speakers and emotion are detected as the match plays and every line is re-spoken in the voice you cast. In
          Synced mode each voice lands right on its moment — no lag, nothing skipped.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#step-footage" className="btn-primary">Start a session</a>
          <Link to="/voices" className="btn-ghost">Clone a voice →</Link>
        </div>
      </section>

      <EngineBanner health={health} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {/* 1. footage */}
          <section id="step-footage" className="panel scroll-mt-20 p-5 sm:p-6">
            <StepTitle n={1} title="Choose footage" hint="Any match video — analysed live while it plays." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="clips">
              {clips.map((c) => {
                const on = c.clip_id === clipId;
                return (
                  <label key={c.clip_id}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition ${on ? "border-accent shadow-glow" : "border-white/10 hover:border-white/30"}`}>
                    <input type="radio" name="clip" value={c.clip_id} checked={on} onChange={() => setClipId(c.clip_id)} className="sr-only" />
                    <div className="relative aspect-video bg-black">
                      <video src={`${c.url}#t=4`} preload="metadata" muted playsInline className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px]">{dur(c.duration)}</span>
                      {on && <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">✓</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {c.has_truth && <span className="shrink-0 rounded-full bg-calm/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-calm">scored</span>}
                    </div>
                  </label>
                );
              })}
              <DropZone accept=".mp4,.mkv,.mov" onFile={(f) => void upload(f)} disabled={uploading}>
                <div className="flex aspect-video flex-col items-center justify-center">
                  <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-xl text-accent transition group-hover:scale-110">+</div>
                  <p className="text-sm font-medium">{uploading ? "Uploading…" : "Upload a video"}</p>
                  <p className="text-[11px] text-muted">.mp4 · .mkv · .mov · drop or click</p>
                </div>
              </DropZone>
            </div>
            <p className="mt-3 text-xs text-muted">Only use footage you are allowed to use. “Scored” clips have a ground truth, so the report includes accuracy.</p>
          </section>

          {/* 2. cast */}
          <section className="panel p-5 sm:p-6" data-testid="cast">
            <StepTitle n={2} title="Cast the voices" hint="Who re-speaks each commentator. You can still switch live." />
            <div className="mb-4 flex items-center gap-3 text-sm">
              <label htmlFor="max-commentators" className="text-muted">Commentators</label>
              <select id="max-commentators" aria-label="Max commentators" className="field !w-auto !py-1.5" value={speakers}
                onChange={(e) => setSpeakers(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                <option value={8}>Auto (up to 8)</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {ids.map((sid, i) => {
                const vid = cast[sid] ?? "";
                const v = voices.find((x) => x.voice_id === vid);
                return (
                  <div key={sid} className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPEAKER_COLORS[i] }} />
                      <span className="font-semibold">Commentator {i + 1}</span>
                      <span className="ml-auto text-[11px] text-muted">{sid}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {v ? <Avatar name={v.name} id={v.voice_id} size={40} /> : <span className="grid h-10 w-10 place-items-center rounded-2xl border border-dashed border-white/15 text-[10px] text-muted">auto</span>}
                      <select aria-label={`Cast voice for commentator ${i + 1}`} className="field min-w-0 flex-1 !py-2" value={vid}
                        onChange={(e) => setCast((c) => ({ ...c, [sid]: e.target.value }))}>
                        <option value="">Automatic</option>
                        <optgroup label="Your clones">
                          {voices.filter((x) => x.custom).map((x) => <option key={x.voice_id} value={x.voice_id}>{x.name}</option>)}
                        </optgroup>
                        <optgroup label="Built-in">
                          {voices.filter((x) => !x.custom).map((x) => <option key={x.voice_id} value={x.voice_id}>{x.name}</option>)}
                        </optgroup>
                      </select>
                      <PlayButton url={v?.preview_url} label={`${v?.name ?? "voice"} preview`} size="sm" />
                    </div>
                    {v && <div className="flex items-center gap-2"><TierBadge tier={v.tier} />{typeof v.score === "number" && <span className="text-[11px] text-muted">likeness {v.score}</span>}</div>}
                  </div>
                );
              })}
            </div>
            {voices.some((v) => v.custom) && (
              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4" data-testid="known-voices">
                <p className="text-sm font-semibold">Known commentators <span className="font-normal text-muted">(optional, most accurate)</span></p>
                <p className="mt-0.5 text-xs text-muted">Pick the people you have a voice sample of in the Voice Lab. They are recognised from their first word and keep their name all match long.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {voices.filter((v) => v.custom).map((v) => {
                    const on = known.includes(v.voice_id);
                    return (
                      <button key={v.voice_id} type="button" aria-pressed={on}
                        onClick={() => setKnown((k) => (on ? k.filter((x) => x !== v.voice_id) : [...k, v.voice_id].slice(0, 8)))}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-accent/70 bg-accent/15 text-ink" : "border-white/10 text-muted hover:text-ink"}`}>
                        {on ? "✓ " : ""}{v.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {voices.every((v) => !v.custom) && (
              <p className="mt-3 text-xs text-muted">Tip: <Link to="/voices" className="text-accent">clone your own voice</Link> in the Voice Lab and cast it here.</p>
            )}
          </section>
        </div>

        {/* 3. go live */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section className="panel overflow-hidden">
            <div className="p-5 sm:p-6">
              <StepTitle n={3} title="Go live" />
              <dl className="mb-4 space-y-2 text-sm">
                <Row k="Footage" v={selected ? selected.name : "—"} />
                <Row k="Length" v={selected ? dur(selected.duration) : "—"} />
                <Row k="Commentators" v={String(speakers)} />
                <Row k="Voices" v={ids.map((k) => voices.find((x) => x.voice_id === cast[k])?.name ?? "auto").join(" · ")} />
                <Row k="Mode" v={mode === "synced" ? `Synced (${syncDelay} s picture delay)` : "Live"} />
              </dl>
              <div className="mb-4" role="radiogroup" aria-label="Playback mode">
                <p className="mb-2 text-sm text-muted">Playback</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["synced", "Synced", "Voices land exactly on the action. Picture starts a few seconds later.", "Recommended"],
                    ["live", "Live", "Lowest latency. Voices follow the commentary by a moment.", ""],
                  ] as const).map(([k, title, desc, tag]) => (
                    <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                      className={`rounded-xl border p-3 text-left transition ${mode === k ? "border-accent/70 bg-accent/10 shadow-glow" : "border-white/10 hover:border-white/25"}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold">{title}</span>
                        {tag && <span className="rounded-full bg-gradient-to-r from-violet to-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">{tag}</span>}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-muted">{desc}</p>
                    </button>
                  ))}
                </div>
                {mode === "synced" && (
                  <label className="mt-3 block text-xs text-muted">
                    <span className="flex justify-between"><span>Picture delay</span><b className="font-mono text-ink">{syncDelay} s</b></span>
                    <input type="range" min={3} max={10} step={1} value={syncDelay} onChange={(e) => setSyncDelay(Number(e.target.value))} className="mt-1 w-full" aria-label="Picture delay" />
                    <span className="text-[11px]">More delay = more lines exactly on time. {SYNC_DEFAULT_S} s is the measured sweet spot.</span>
                  </label>
                )}
              </div>
              <label className={`mb-4 flex items-center gap-2 text-sm ${selected?.has_enroll ? "" : "opacity-40"}`}>
                <input type="checkbox" className="h-4 w-4 accent-accent" disabled={!selected?.has_enroll} checked={enroll && !!selected?.has_enroll} onChange={(e) => setEnroll(e.target.checked)} />
                Known commentators (enrollment file)
              </label>
              {speed !== 1 && <p className="mb-2 text-xs text-excited">Dev speed {speed}× — not a live measurement.</p>}
              <button type="button" data-testid="start-session" disabled={!clipId || busy || !ready} className="btn-primary w-full !py-3.5 text-base" onClick={() => void start()}>
                {busy ? "Starting…" : ready ? "● Start live session" : "Loading models…"}
              </button>
              {error && <p className="mt-3 text-sm text-peak" role="alert">{error}</p>}
            </div>
            <div className="border-t border-white/[0.06] bg-black/20 p-5 text-sm" data-testid="health">
              <p className="eyebrow mb-2">Engine</p>
              {!health && <p className="text-muted">checking…</p>}
              {health && (
                <ul className="space-y-1.5 text-[13px]">
                  <EngineRow label="Speech-to-text" value={health.engines?.text?.name ?? health.model_info.asr ?? "—"} ok={health.models_loaded.asr ?? false} />
                  <EngineRow label="Speaker ID" value={health.model_info.speaker ?? "—"} ok={health.models_loaded.speaker ?? false} />
                  <EngineRow label="Voices" value={health.engines?.voices?.name ?? health.model_info.tts ?? "—"} ok={health.models_loaded.tts ?? false} />
                  {health.active_session && <li className="text-xs text-excited">active session: {health.active_session}</li>}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-violet text-xs font-bold text-white">{n}</span>
      <div>
        <h2 className="font-display text-lg font-semibold leading-7">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="truncate text-right font-medium">{v}</dd>
    </div>
  );
}

function EngineRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-ok" : "bg-peak"}`} />
      <span className="text-muted">{label}</span>
      <span className="ml-auto truncate text-right text-xs">{value}</span>
    </li>
  );
}
