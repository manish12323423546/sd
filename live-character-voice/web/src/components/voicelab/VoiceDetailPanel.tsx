// Everything about one cloned voice: quality score, tests per mood, the chosen reference clips.
import { useEffect, useState } from "react";
import { api, type VoiceDetail } from "../../net/api";
import { Avatar, PlayButton, ScoreRing, TierBadge } from "../../ui/kit";

const MOOD_STYLE: Record<string, string> = { calm: "text-calm", neutral: "text-ink", excited: "text-excited" };

export function VoiceDetailPanel({ voiceId, onDelete, onTry }: { voiceId: string; onDelete?: () => void; onTry: () => void }) {
  const [v, setV] = useState<VoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setV(null);
    api.voiceDetail(voiceId).then(setV).catch((e: Error) => setError(e.message));
  }, [voiceId]);
  if (error) return <section className="panel p-5 text-sm text-peak">{error}</section>;
  if (!v) return <section className="panel h-48 animate-pulse p-5" />;
  const q = v.quality;
  const refs = v.refs ?? {};
  return (
    <section className="panel animate-rise overflow-hidden" data-testid="voice-detail">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/[0.06] bg-gradient-to-r from-accent/10 via-aqua/10 to-transparent p-5">
        <Avatar name={v.name} id={v.voice_id} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold">{v.name}</h3>
            <TierBadge tier={v.tier} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {v.tier === "pro"
              ? `${v.source_seconds ?? 0} s recording → ${v.main_speaker_seconds ?? 0} s of this voice kept · ${v.dropped_parts ?? 0} parts dropped (other voices / noise)`
              : `${v.seconds} s reference clip`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary" onClick={onTry}>Try it</button>
          {onDelete && <button type="button" className="btn-ghost hover:!border-peak/60 hover:!text-peak" onClick={() => window.confirm(`Delete “${v.name}”?`) && onDelete()}>Delete</button>}
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          {q?.tested && q.score !== undefined ? (
            <>
              <ScoreRing score={q.score} size={112} label="likeness" />
              <p className="max-w-[160px] text-center text-[11px] text-muted">How close the clone sounds to the real voice (voice-print match, tested in every mood)</p>
            </>
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-full border border-dashed border-white/15 text-center text-[11px] text-muted">
              {v.tier === "pro" ? "not tested" : "instant\nclone"}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {q?.moods && (
            <div>
              <p className="eyebrow mb-2">Clone test in each mood</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(q.moods).map(([mood, m]) => (
                  <div key={mood} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
                    <PlayButton url={m.url} label={`${mood} test`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold capitalize ${MOOD_STYLE[mood] ?? ""}`}>{mood}</div>
                      <div className="font-mono text-[11px] text-muted">match {(m.similarity * 100).toFixed(0)}% · {m.made_in_s}s</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {v.tier === "pro" ? (
            <div>
              <p className="eyebrow mb-2">Clips picked from your recording</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(refs).flatMap(([mood, list]) =>
                  list.map((r) => (
                    <div key={r.file} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                      <PlayButton url={r.url} label={r.file} size="sm" />
                      <span className={`w-16 shrink-0 text-[11px] font-semibold uppercase ${MOOD_STYLE[mood] ?? ""}`}>{mood}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink/85">“{r.text}”</span>
                      <span className="hidden font-mono text-[11px] text-muted sm:block">{r.seconds}s</span>
                    </div>
                  )),
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Live lines use the steadiest clips for the voice itself (measured most faithful) and Fish Audio's emotion
                control for calm → peak delivery.{" "}
                {v.fish_model?.trained ? "A trained Fish voice model is also active." : `Trained Fish model: ${v.fish_model?.reason ?? "not used"}.`}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3">
              <PlayButton url={v.ref_url} label="reference clip" />
              <p className="min-w-0 flex-1 text-sm text-ink/85">“{v.transcript || "…"}”</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
