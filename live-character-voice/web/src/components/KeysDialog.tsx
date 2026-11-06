// "Keys & engines" dialog: paste a key in the app, it is tested and switched on at once, and pick
// which speech-to-text engine is used. Works on this computer, or on a hosted engine with the
// admin code.
import { useEffect, useState } from "react";
import { api, type KeysStatus } from "../net/api";

export function openKeys() {
  window.dispatchEvent(new Event("open-keys"));
}

type KeyId = "fish" | "groq" | "deepgram";

const KEYS: { id: KeyId; title: string; what: string; url: string; steps: string[] }[] = [
  {
    id: "fish",
    title: "Fish Audio",
    what: "Emotional voices + voice cloning",
    url: "https://fish.audio/app/api-keys",
    steps: ["sign in (free)", "Click “Create” / “New API key”", "Copy the key (starts with sk-) and paste it here"],
  },
  {
    id: "deepgram",
    title: "Deepgram",
    what: "Speech-to-text, Nova-3 (≈ $0.26/hour, free credit on sign-up)",
    url: "https://console.deepgram.com/signup",
    steps: ["sign up (free credit)", "API Keys → “Create a New API Key”", "Copy the key and paste it here"],
  },
  {
    id: "groq",
    title: "Groq",
    what: "Speech-to-text, Whisper (free tier, ~20 lines/min)",
    url: "https://console.groq.com/keys",
    steps: ["sign in (free)", "Click “Create API Key”", "Copy the key (starts with gsk_) and paste it here"],
  },
];

const ASR_LABEL: Record<string, string> = {
  auto: "Auto — best connected (Deepgram → Groq → offline)",
  deepgram: "Deepgram Nova-3",
  groq: "Groq Whisper (free)",
  local: "Offline Whisper (no key, slower)",
};

const EMPTY = { fish: "", groq: "", deepgram: "" };

export function KeysDialog() {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(EMPTY);
  const [status, setStatus] = useState<KeysStatus | null>(null);
  const [asr, setAsr] = useState("auto");
  const [admin, setAdmin] = useState(() => {
    try {
      return sessionStorage.getItem("lcv-admin") ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Record<string, { ok: boolean; message: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    api
      .keysStatus()
      .then((s) => {
        setStatus(s);
        setAsr(s.asr);
      })
      .catch(() => setStatus(null));

  useEffect(() => {
    const on = () => {
      setOpen(true);
      setRes(null);
      setError(null);
      void refresh();
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

  const asrChanged = status !== null && asr !== status.asr;
  const anyKey = Object.values(vals).some((v) => v.trim());

  const save = async () => {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await api.setKeys({
        fish: vals.fish.trim() || undefined,
        groq: vals.groq.trim() || undefined,
        deepgram: vals.deepgram.trim() || undefined,
        asr: asrChanged ? asr : undefined,
        admin_code: admin.trim() || undefined,
      });
      try {
        if (admin.trim()) sessionStorage.setItem("lcv-admin", admin.trim());
      } catch {
        /* private window: fine */
      }
      setRes(r.results);
      setVals(EMPTY);
      window.dispatchEvent(new Event("engines-changed"));
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const textEngine = status?.engines?.text;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Keys and engines" onClick={(e) => e.stopPropagation()}
        className="panel max-h-[92vh] w-full max-w-xl animate-rise overflow-y-auto !bg-panel p-6" data-testid="keys-dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Settings</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Keys &amp; engines</h2>
            <p className="mt-1 text-sm text-muted">Each key is tested first and only saved if it works. Keys are never shown again. No restart needed.</p>
          </div>
          <button type="button" aria-label="Close" className="text-2xl leading-none text-muted hover:text-ink" onClick={() => setOpen(false)}>×</button>
        </div>

        {status?.needs_admin_code && (
          <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
            <b>Hosted engine:</b> enter the admin code to change keys here.
            {!status.admin_enabled && (
              <span className="block pt-1 text-xs text-muted">No admin code is set yet: add a secret named LCV_ADMIN_CODE in the Space (Settings → Variables and secrets) once.</span>
            )}
            <input type="password" autoComplete="off" className="field mt-2 font-mono" placeholder="Admin code" aria-label="Admin code"
              value={admin} onChange={(e) => setAdmin(e.target.value)} />
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-white/[0.08] bg-black/25 p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">Speech-to-text engine</span>
            <select className="field" value={asr} onChange={(e) => setAsr(e.target.value)} aria-label="Speech-to-text engine">
              {(status?.asr_choices ?? Object.keys(ASR_LABEL)).map((c) => (
                <option key={c} value={c}>{ASR_LABEL[c] ?? c}</option>
              ))}
            </select>
          </label>
          {textEngine?.name && (
            <p className="mt-2 text-xs text-muted">In use now: <b className="text-ink">{textEngine.name}</b>{textEngine.note ? ` — ${textEngine.note}` : ""}. If it fails on a line, the next one takes over for that line.</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {KEYS.map((k) => (
            <div key={k.id} className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {k.title} {status?.connected[k.id] && <span className="ml-1 text-xs font-normal text-ok">● connected</span>}
                </span>
                <span className="text-right text-xs text-muted">{k.what}</span>
              </div>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[13px] text-ink/85">
                {k.steps.map((s, i) => (
                  <li key={s}>
                    {i === 0 ? (
                      <>
                        Open <a className="text-accent underline" href={k.url} target="_blank" rel="noreferrer">{k.url.replace("https://", "")}</a> and {s}
                      </>
                    ) : (
                      s
                    )}
                  </li>
                ))}
              </ol>
              <input type="password" autoComplete="off" spellCheck={false} className="field mt-3 font-mono"
                placeholder={status?.connected[k.id] ? `Connected — paste a new ${k.title} key to replace it` : `Paste your ${k.title} key`}
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
        {res?.asr && <p className="mt-4 text-sm text-ok">✓ {res.asr.message}</p>}
        {error && <p className="mt-4 rounded-xl border border-peak/40 bg-peak/10 p-3 text-sm text-peak" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{res ? "Done" : "Cancel"}</button>
          <button type="button" className="btn-primary" disabled={busy || (!anyKey && !asrChanged)} onClick={() => void save()}>
            {busy ? "Testing & connecting… (≈20 s)" : "Save & connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
