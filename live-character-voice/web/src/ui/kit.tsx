// Small shared UI building blocks for the whole app.
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- one global audio player: starting one sound stops the previous ---------- */
type Listener = (url: string | null) => void;
const player = { audio: null as HTMLAudioElement | null, url: null as string | null, listeners: new Set<Listener>() };
function emit() {
  player.listeners.forEach((l) => l(player.url));
}
export function playUrl(url: string) {
  if (player.audio) player.audio.pause();
  if (player.url === url) {
    player.url = null;
    emit();
    return;
  }
  const a = new Audio(url);
  player.audio = a;
  player.url = url;
  a.onended = () => {
    if (player.url === url) {
      player.url = null;
      emit();
    }
  };
  void a.play().catch(() => {
    player.url = null;
    emit();
  });
  emit();
}
export function usePlaying(): string | null {
  const [u, setU] = useState<string | null>(player.url);
  useEffect(() => {
    player.listeners.add(setU);
    return () => {
      player.listeners.delete(setU);
    };
  }, []);
  return u;
}

export function PlayButton({ url, label, size = "md" }: { url: string | undefined; label: string; size?: "sm" | "md" | "lg" }) {
  const playing = usePlaying() === url && !!url;
  const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <button
      type="button"
      disabled={!url}
      aria-label={playing ? `Stop ${label}` : `Play ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        if (url) playUrl(url);
      }}
      className={`${dims} relative grid shrink-0 place-items-center rounded-full border transition disabled:opacity-30 ${
        playing ? "border-accent bg-accent/20 text-accent" : "border-white/10 bg-white/[0.04] text-ink hover:border-accent/60 hover:text-accent"
      }`}
    >
      {playing ? <Bars /> : <svg viewBox="0 0 24 24" className="ml-0.5 h-[45%] w-[45%] fill-current"><path d="M7 4.5v15l13-7.5z" /></svg>}
    </button>
  );
}

/** Animated equaliser bars (playing / live). */
export function Bars({ n = 4, className = "" }: { n?: number; className?: string }) {
  return (
    <span aria-hidden className={`flex h-3.5 items-end gap-[2px] ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="w-[3px] origin-bottom animate-bar rounded-full bg-current" style={{ height: "100%", animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/* ---------- avatars: a stable gradient per voice ---------- */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function Avatar({ name, id, size = 44 }: { name: string; id: string; size?: number }) {
  const h = hash(id);
  const a = h % 360;
  const b = (a + 50 + (h % 70)) % 360;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-2xl font-display font-semibold text-white shadow-lg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${a} 85% 58%), hsl(${b} 80% 45%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/* ---------- badges / pills ---------- */
export function TierBadge({ tier }: { tier?: string }) {
  if (tier === "pro")
    return <span className="rounded-full bg-gradient-to-r from-violet to-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Pro clone</span>;
  if (tier === "instant")
    return <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">Instant clone</span>;
  return <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Built-in</span>;
}

export function Dot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-50" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${ok ? "bg-ok" : "bg-excited"}`} />
    </span>
  );
}

/* ---------- score ring (0–100) ---------- */
export function ScoreRing({ score, size = 88, label = "match" }: { score: number; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#3DDC97" : score >= 55 ? "#4FA3FF" : score >= 35 ? "#F5A524" : "#F31260";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={8} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-display text-xl font-semibold" style={{ fontSize: size * 0.26 }}>{score}</div>
        <div className="mt-1 text-[9px] uppercase tracking-widest text-muted">{label}</div>
      </div>
    </div>
  );
}

/* ---------- drag & drop file zone ---------- */
export function DropZone({
  accept, onFile, children, disabled,
}: { accept: string; onFile: (f: File) => void; children: ReactNode; disabled?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onClick={() => !disabled && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onFile(f);
      }}
      className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
        over ? "border-accent bg-accent/10" : "border-white/10 bg-black/20 hover:border-accent/50 hover:bg-white/[0.03]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {children}
    </div>
  );
}

/* ---------- mood segmented control ---------- */
export const MOODS = [
  { key: "calm", label: "Calm", cls: "text-calm border-calm/60 bg-calm/15" },
  { key: "neutral", label: "Neutral", cls: "text-ink border-white/40 bg-white/10" },
  { key: "excited", label: "Excited", cls: "text-excited border-excited/60 bg-excited/15" },
  { key: "peak", label: "Peak", cls: "text-peak border-peak/60 bg-peak/15" },
] as const;

export function MoodPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Mood" className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
      {MOODS.map((m) => (
        <button key={m.key} type="button" role="radio" aria-checked={value === m.key} onClick={() => onChange(m.key)}
          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${value === m.key ? m.cls : "border-transparent text-muted hover:text-ink"}`}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
