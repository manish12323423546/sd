// Voice Lab: create (instant / professional) clones, browse every voice, try lines in any mood.
import { useCallback, useEffect, useState } from "react";
import { CloneStudio } from "../components/voicelab/CloneStudio";
import { Playground } from "../components/voicelab/Playground";
import { VoiceDetailPanel } from "../components/voicelab/VoiceDetailPanel";
import { api, type Health, type Voice } from "../net/api";
import { Avatar, PlayButton, TierBadge } from "../ui/kit";

type Filter = "all" | "mine" | "builtin";

export function VoiceLab() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [tryVoice, setTryVoice] = useState("");

  const load = useCallback(async () => {
    const [v, h] = await Promise.all([api.voices(), api.health()]);
    setVoices(v);
    setHealth(h);
    setTryVoice((cur) => cur || v.find((x) => x.custom)?.voice_id || v[0]?.voice_id || "");
  }, []);
  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener("engines-changed", on);
    return () => window.removeEventListener("engines-changed", on);
  }, [load]);

  const created = useCallback(
    async (voiceId: string) => {
      await load();
      setSelected(voiceId);
      setTryVoice(voiceId);
      document.getElementById("voice-detail-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [load],
  );

  const mine = voices.filter((v) => v.custom);
  const shown = voices.filter((v) => (filter === "all" ? true : filter === "mine" ? v.custom : !v.custom));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#101a2b] via-[#0f1220] to-[#140f24] p-6 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 gap-1.5 opacity-60 md:flex">
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} className="w-1.5 origin-center animate-bar rounded-full bg-gradient-to-t from-accent to-aqua"
              style={{ height: `${30 + Math.abs(Math.sin(i * 0.7)) * 120}px`, animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${1 + (i % 5) * 0.2}s` }} />
          ))}
        </div>
        <p className="eyebrow">Voice Lab</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
          <span className="gradient-text">Your voice, any moment.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted">
          Clone a voice in seconds — or build a professional, emotion-aware voice from a few minutes of audio. Then cast it on any
          commentator, live.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <Stat n={voices.length} label="voices" />
          <Stat n={mine.length} label="your clones" />
          <Stat n={mine.filter((v) => v.tier === "pro").length} label="professional" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <CloneStudio cloning={Boolean(health?.voice_cloning)} onCreated={(id) => void created(id)} />
        <div className="flex flex-col gap-6">
          <Playground voices={voices} voiceId={tryVoice} setVoiceId={setTryVoice} />
        </div>
      </div>

      <div id="voice-detail-anchor" className="scroll-mt-20" />
      {selected && (
        <VoiceDetailPanel
          voiceId={selected}
          onTry={() => {
            setTryVoice(selected);
            document.getElementById("playground")?.scrollIntoView({ behavior: "smooth" });
          }}
          onDelete={async () => {
            await api.deleteVoice(selected);
            setSelected(null);
            await load();
          }}
        />
      )}

      {/* library */}
      <section className="flex flex-col gap-4" data-testid="voice-library">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">All voices</h2>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-black/30 p-1 text-xs">
            {(["all", "mine", "builtin"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${filter === f ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}>
                {f === "all" ? "All" : f === "mine" ? "My clones" : "Built-in"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((v, i) => (
            <div
              key={v.voice_id}
              role="button"
              tabIndex={0}
              onClick={() => (v.custom ? setSelected(v.voice_id) : setTryVoice(v.voice_id))}
              onKeyDown={(e) => e.key === "Enter" && (v.custom ? setSelected(v.voice_id) : setTryVoice(v.voice_id))}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`group panel flex animate-rise cursor-pointer flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 ${
                selected === v.voice_id ? "!border-accent/70 shadow-glow" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={v.name} id={v.voice_id} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{v.name}</div>
                  <TierBadge tier={v.tier} />
                </div>
                <PlayButton url={v.preview_url} label={`${v.name} preview`} />
              </div>
              <p className="line-clamp-2 min-h-[2.5em] text-xs text-muted">{v.description}</p>
              <div className="flex items-center justify-between text-[11px] text-muted">
                {typeof v.score === "number" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-gradient-to-r from-accent to-ok" style={{ width: `${v.score}%` }} />
                    </span>
                    likeness {v.score}
                  </span>
                ) : (
                  <span>{v.custom ? "click for details" : "click to try in playground"}</span>
                )}
                <span className="opacity-0 transition group-hover:opacity-100">→</span>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="text-sm text-muted">No clones yet — create one above.</p>}
        </div>
      </section>
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold">{n}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
