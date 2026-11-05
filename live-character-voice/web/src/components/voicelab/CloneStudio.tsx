// Create a cloned voice: Instant (10–30 s) or Professional (1–10 min), from a file or the mic.
import { useEffect, useRef, useState } from "react";
import { api, type CloneJob, type VoiceDetail } from "../../net/api";
import { DropZone, fmtTime, PlayButton } from "../../ui/kit";
import { Recorder } from "./Recorder";
import { useDecodedDuration, Waveform } from "./Waveform";

type Mode = "instant" | "pro";
const ACCEPT = ".wav,.mp3,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov";

const MODES: Record<Mode, { title: string; tag: string; needs: string; time: string; points: string[] }> = {
  instant: {
    title: "Instant clone",
    tag: "Fastest",
    needs: "10–30 s of one voice",
    time: "ready in ~5 s",
    points: ["Best 15 s picked automatically", "Auto-transcribed", "Great for quick tests"],
  },
  pro: {
    title: "Professional clone",
    tag: "Best quality",
    needs: "1–10 min recording",
    time: "ready in ~1 min",
    points: [
      "Keeps only the main speaker — drops other voices, crowd and music",
      "Picks the cleanest, most typical speech from the whole file",
      "Sorts calm / normal / excited delivery and tests the clone in every mood",
      "Quality score so you know how close it is",
    ],
  },
};

export function CloneStudio({ cloning, onCreated }: { cloning: boolean; onCreated: (voiceId: string) => void }) {
  const [mode, setMode] = useState<Mode>("pro");
  const [source, setSource] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<CloneJob | null>(null);
  const { peaks, duration, error: decodeErr } = useDecodedDuration(file);
  const fileUrl = useRef<string | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  useEffect(() => {
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    fileUrl.current = file ? URL.createObjectURL(file) : undefined;
    setPreviewUrl(fileUrl.current);
  }, [file]);

  // poll a professional job
  useEffect(() => {
    if (!job || job.stage === "done" || job.stage === "error") return;
    const t = window.setTimeout(async () => {
      try {
        const j = await api.cloneJob(job.job_id);
        setJob(j);
        if (j.stage === "done" && j.result) onCreated(j.result.voice_id);
        if (j.stage === "error") setError(j.error);
      } catch (e) {
        setError((e as Error).message);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [job, onCreated]);

  const minS = mode === "pro" ? 45 : 6;
  const tooShort = duration > 0 && duration < minS;
  const canSubmit = !!file && name.trim().length > 0 && consent && !busy && !tooShort && (!job || job.stage === "done" || job.stage === "error");

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      if (mode === "instant") {
        const v = await api.addVoice(name.trim(), file, consent, "");
        onCreated(v.voice_id);
        reset();
      } else {
        setJob(await api.startProClone(name.trim(), file, consent));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setName("");
    setConsent(false);
  };

  const running = job && job.stage !== "done" && job.stage !== "error";

  return (
    <section className="panel flex flex-col gap-5 p-5 sm:p-6" data-testid="clone-studio">
      <div>
        <p className="eyebrow">Create a voice</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Clone a voice</h2>
      </div>

      {!cloning && (
        <div className="rounded-xl border border-excited/40 bg-excited/10 p-3 text-sm text-excited">
          Voice cloning needs a free Fish Audio key. Get one at{" "}
          <a className="underline" href="https://fish.audio/app/api-keys" target="_blank" rel="noreferrer">fish.audio/app/api-keys</a>, run{" "}
          <code className="rounded bg-black/40 px-1">make keys</code> and restart the app.
        </div>
      )}

      {/* mode cards */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Cloning mode">
        {(Object.keys(MODES) as Mode[]).map((m) => {
          const info = MODES[m];
          const on = mode === m;
          return (
            <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)}
              className={`relative flex flex-col justify-start overflow-hidden rounded-2xl border p-4 text-left transition ${
                on ? "border-accent/70 bg-gradient-to-br from-accent/15 via-violet/10 to-transparent shadow-glow" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}>
              <div className="flex w-full items-center justify-between">
                <span className="font-display text-base font-semibold">{info.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m === "pro" ? "bg-gradient-to-r from-violet to-accent text-white" : "bg-white/10 text-ink"}`}>{info.tag}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{info.needs} · {info.time}</p>
              <ul className="mt-3 space-y-1 text-[12.5px] text-ink/85">
                {info.points.map((p) => (
                  <li key={p} className="flex gap-2"><span className="text-ok">✓</span>{p}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* name */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Voice name</span>
        <input className="field" value={name} maxLength={40} placeholder="e.g. My commentary voice" onChange={(e) => setName(e.target.value)} />
      </label>

      {/* source */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Voice sample</span>
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
            {(["upload", "record"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setSource(s)}
                className={`rounded-md px-3 py-1 font-semibold transition ${source === s ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}>
                {s === "upload" ? "Upload file" : "Record now"}
              </button>
            ))}
          </div>
        </div>
        {source === "upload" ? (
          <DropZone accept={ACCEPT} onFile={setFile} disabled={!!running}>
            <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-accent/15 text-accent transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            </div>
            <p className="font-medium">Drop audio or video here, or click to browse</p>
            <p className="mt-1 text-xs text-muted">wav · mp3 · m4a · ogg · flac · webm · mp4 · mov</p>
          </DropZone>
        ) : (
          <Recorder mode={mode} onDone={setFile} />
        )}
        {file && (
          <div className="animate-rise rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-3">
              <PlayButton url={previewUrl} label="your sample" size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              {duration > 0 && (
                <span className={`font-mono text-xs ${tooShort ? "text-peak" : "text-ok"}`}>{fmtTime(duration)}</span>
              )}
              <button type="button" className="text-xs text-muted hover:text-peak" onClick={() => setFile(null)}>remove</button>
            </div>
            {peaks.length > 0 && <Waveform peaks={peaks} highlight={mode === "instant" && duration > 15 ? [0, 15 / duration] : undefined} />}
            {decodeErr && <p className="text-xs text-muted">{decodeErr}</p>}
            {tooShort && <p className="mt-1 text-xs text-peak">{mode === "pro" ? "Professional cloning needs at least 45 s — record more or use Instant." : "Use at least 6 s."}</p>}
            {mode === "instant" && duration > 30 && <p className="mt-1 text-xs text-muted">Long file: the best 15 s are picked for you. Tip: Professional mode uses the whole file.</p>}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-relaxed text-muted">
        <b className="text-ink">For the best clone:</b> one person only · no music or background voices · a quiet room ·
        close to the mic · natural variety (calm and excited). {mode === "pro" ? "2–5 minutes is the sweet spot." : "About 15 s is ideal."}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I own this voice or have permission to clone it. Real people and known characters need their consent or a licence.</span>
      </label>

      <button type="button" className="btn-primary !py-3 text-base" disabled={!canSubmit || !cloning} onClick={() => void submit()} data-testid="clone-submit">
        {busy ? "Uploading…" : mode === "pro" ? "Build professional voice" : "Clone instantly"}
      </button>
      {error && <p className="rounded-xl border border-peak/40 bg-peak/10 p-3 text-sm text-peak" role="alert">{error}</p>}

      {job && <JobProgress job={job} />}
    </section>
  );
}

export function JobProgress({ job }: { job: CloneJob }) {
  const idx = job.steps.findIndex((s) => s.key === job.stage);
  const done = job.stage === "done";
  return (
    <div className="animate-rise rounded-2xl border border-white/10 bg-black/30 p-4" data-testid="clone-progress">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold">{done ? "Voice ready" : job.stage === "error" ? "Stopped" : "Building your voice…"}</span>
        <span className="font-mono text-xs text-muted">{fmtTime(job.elapsed_s)}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${done ? "bg-ok" : "bg-[linear-gradient(90deg,#4FA3FF,#8B6CFF,#4FA3FF)] bg-[length:200%_100%] animate-shimmer"}`}
          style={{ width: `${Math.max(4, job.progress * 100)}%`, transition: "width .6s ease" }}
        />
      </div>
      <ol className="space-y-2">
        {job.steps.map((s, i) => {
          const state = done || i < idx ? "done" : i === idx && job.stage !== "error" ? "active" : job.stage === "error" && i === idx ? "error" : "todo";
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                state === "done" ? "bg-ok text-bg" : state === "active" ? "border-2 border-accent" : state === "error" ? "bg-peak text-white" : "border border-white/15"
              }`}>
                {state === "done" ? "✓" : state === "error" ? "!" : state === "active" ? <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" /> : ""}
              </span>
              <span className={state === "todo" ? "text-muted" : "text-ink"}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      {job.log.length > 0 && (
        <div className="mt-4 max-h-36 overflow-y-auto rounded-lg bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-muted">
          {job.log.slice(-8).map((l, i) => (
            <div key={`${i}-${l}`} className={i === job.log.slice(-8).length - 1 ? "text-ink" : ""}>› {l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { VoiceDetail };
