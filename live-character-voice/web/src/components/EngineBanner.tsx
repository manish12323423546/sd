// Shown only when an engine is offline: says why and how to fix it (free key links).
import type { Health } from "../net/api";
import { openKeys } from "./KeysDialog";

const LINKS: Record<string, { key: string; url: string; what: string }> = {
  voices: { key: "FISH_API_KEY", url: "https://fish.audio/app/api-keys", what: "emotional voices + cloning" },
  text: { key: "GROQ_API_KEY", url: "https://console.groq.com/keys", what: "fast, accurate transcription" },
};

export function EngineBanner({ health }: { health: Health | null }) {
  const engines = health?.engines ?? {};
  const off = Object.entries(engines).filter(([, e]) => !e.online);
  const fallback = health?.fish_fallback_lines ?? 0;
  if (!health || (off.length === 0 && fallback === 0)) return null;
  return (
    <section data-testid="engine-banner" className="animate-rise rounded-2xl border border-excited/40 bg-excited/[0.08] p-4 text-sm">
      {off.map(([k, e]) => {
        const l = LINKS[k];
        return (
          <p key={k} className="mb-1 last:mb-0">
            <b className="text-excited">{k === "voices" ? "Voices" : "Speech-to-text"} are offline ({e.name})</b>
            <span className="text-muted"> — {e.note}. </span>
            {l && (
              <span className="text-muted">
                For {l.what}, get a free key at{" "}
                <a className="text-accent underline" href={l.url} target="_blank" rel="noreferrer">{l.url}</a> and paste it with the button below.
              </span>
            )}
          </p>
        );
      })}
      {off.length > 0 && (
        <button type="button" className="btn-primary mt-3 !py-2" onClick={openKeys}>Connect keys now</button>
      )}
      {fallback > 0 && <p className="text-xs text-excited">{fallback} line(s) fell back to offline voices because Fish Audio did not answer in time.</p>}
    </section>
  );
}
