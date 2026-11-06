// "Connect your free keys" dialog: paste a key in the app, it is tested and switched on at once.
import { useEffect, useState } from "react";
import { api } from "../net/api";

export function openKeys() {
  window.dispatchEvent(new Event("open-keys"));
}

const KEYS = [
  {
    id: "fish" as const,
    title: "Fish Audio",
    what: "Emotional voices + voice cloning",
    url: "https://fish.audio/app/api-keys",
    steps: ["Open the link and sign in (free)", "Click “Create” / “New API key”", "Copy the key (starts with sk-) and paste it here"],
  },
  {
    id: "groq" as const,
    title: "Groq",
    what: "Fast, accurate speech-to-text",
    url: "https://console.groq.com/keys",
    steps: ["Open the link and sign in (free)", "Click “Create API Key”", "Copy the key (starts with gsk_) and paste it here"],
  },
];

export function KeysDialog() {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({ fish: "", groq: "" });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Record<string, { ok: boolean; message: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      setRes(null);
      setError(null);
    };
    window.addEventListener("open-keys", on);
    return () => window.removeEventListener("open-keys", on);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  if (!open) return null;

  const save = async () => {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await api.setKeys(vals.fish.trim() || undefined, vals.groq.trim() || undefined);
      setRes(r.results);
      setVals({ fish: "", groq: "" });
      window.dispatchEvent(new Event("engines-changed"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Connect your free keys" onClick={(e) => e.stopPropagation()}
        className="panel max-h-[92vh] w-full max-w-xl animate-rise overflow-y-auto !bg-panel p-6" data-testid="keys-dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Settings</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Connect your free keys</h2>
            <p className="mt-1 text-sm text-muted">Each key is tested first, then saved only on this computer (never uploaded). No restart needed.</p>
          </div>
          <button type="button" aria-label="Close" className="text-2xl leading-none text-muted hover:text-ink" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="flex flex-col gap-4">
          {KEYS.map((k) => (
            <div key={k.id} className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{k.title}</span>
                <span className="text-xs text-muted">{k.what}</span>
              </div>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[13px] text-ink/85">
                {k.steps.map((s, i) => (
                  <li key={s}>
                    {i === 0 ? (
                      <>
                        Open <a className="text-accent underline" href={k.url} target="_blank" rel="noreferrer">{k.url.replace("https://", "")}</a> and sign in (free)
                      </>
                    ) : (
                      s
                    )}
                  </li>
                ))}
              </ol>
              <input type="password" autoComplete="off" spellCheck={false} className="field mt-3 font-mono" placeholder={`Paste your ${k.title} key`}
                aria-label={`${k.title} key`} value={vals[k.id]} onChange={(e) => setVals((v) => ({ ...v, [k.id]: e.target.value }))} />
              {res?.[k.id] && (
                <p className={`mt-2 text-sm ${res[k.id]?.ok ? "text-ok" : "text-peak"}`}>
                  {res[k.id]?.ok ? "✓ Connected — " : "✗ "}
                  {res[k.id]?.message}
                </p>
              )}
            </div>
          ))}
        </div>
        {error && <p className="mt-4 rounded-xl border border-peak/40 bg-peak/10 p-3 text-sm text-peak" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{res ? "Done" : "Cancel"}</button>
          <button type="button" className="btn-primary" disabled={busy || (!vals.fish.trim() && !vals.groq.trim())} onClick={() => void save()}>
            {busy ? "Testing & connecting… (≈20 s)" : "Test & connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
