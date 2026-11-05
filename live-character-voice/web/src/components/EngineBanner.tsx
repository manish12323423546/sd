// Shows, in plain words, which engines are running: online (Fish / Groq) or offline fallbacks.
import type { Health } from "../net/api";

const LINKS: Record<string, { key: string; url: string }> = {
  voices: { key: "FISH_API_KEY", url: "https://fish.audio/app/api-keys" },
  text: { key: "GROQ_API_KEY", url: "https://console.groq.com/keys" },
};
const LABEL: Record<string, string> = { voices: "Voices", text: "Speech-to-text" };

export function EngineBanner({ health }: { health: Health | null }) {
  const engines = health?.engines ?? {};
  const keys = Object.keys(engines);
  if (!health || keys.length === 0) return null;
  const allOnline = keys.every((k) => engines[k]?.online);
  return (
    <section
      data-testid="engine-banner"
      className={`rounded-panel border p-4 text-sm lg:col-span-2 ${allOnline ? "border-calm" : "border-excited"} bg-panel`}
    >
      <ul className="flex flex-col gap-1">
        {keys.map((k) => {
          const e = engines[k];
          if (!e) return null;
          return (
            <li key={k}>
              <span className={e.online ? "text-calm" : "text-excited"}>{e.online ? "● online" : "● offline"}</span>{" "}
              <b>{LABEL[k] ?? k}:</b> {e.name}
              {!e.online && LINKS[k] && (
                <span className="text-muted">
                  {" "}— {e.note}. Get a free key at{" "}
                  <a className="text-accent underline" href={LINKS[k].url} target="_blank" rel="noreferrer">{LINKS[k].url}</a>, put it in{" "}
                  <code>.env</code> as <code>{LINKS[k].key}=…</code> (or run <code>make keys</code>) and restart.
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {(health.fish_fallback_lines ?? 0) > 0 && (
        <p className="mt-1 text-xs text-excited">
          {health.fish_fallback_lines} line(s) fell back to offline voices because Fish Audio did not answer in time.
        </p>
      )}
    </section>
  );
}
