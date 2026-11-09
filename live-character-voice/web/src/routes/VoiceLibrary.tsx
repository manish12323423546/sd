// Voice Library (owner only — the private Voice Studio): every cloned voice, kept permanently.
// Choose which ones the public app offers, delete the ones you don't want. Changes are saved to
// the library at once and reach the app within a minute.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type LibraryVoice, type Voice, type VoiceLibraryStatus } from "../net/api";
import { Avatar, PlayButton, TierBadge } from "../ui/kit";

export function VoiceLibrary() {
  const [lib, setLib] = useState<VoiceLibraryStatus | null>(null);
  const [previews, setPreviews] = useState<Record<string, Voice>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, v] = await Promise.all([api.voiceLibrary(), api.voices()]);
      setLib(l);
      setPreviews(Object.fromEntries(v.map((x) => [x.voice_id, x])));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const voices = lib?.voices ?? [];
  const kept = voices.filter((v) => v.enabled).length;
  const readOnly = lib !== null && !lib.can_edit;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <section className="rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#17133a] via-[#0b0d18] to-[#08202a] p-6 sm:p-8">
        <p className="eyebrow">Voice Studio · owner only</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          <span className="gradient-text">Your voice library</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Every voice you clone is kept here permanently — restarts and updates never remove it. Choose which voices the app offers
          (<b className="text-ink">In app</b>) and which stay private (<b className="text-ink">Hidden</b>). Changes reach the app within a minute.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
          <Stat n={voices.length} label="voices kept" />
          <Stat n={kept} label="offered in the app" />
          <Stat n={voices.length - kept} label="hidden" />
          <div className="ml-auto flex items-center gap-2">
            <Link to="/voices" className="btn-primary !py-2">+ Clone a new voice</Link>
            <button type="button" className="btn-ghost !py-2" onClick={() => void act("sync", () => api.syncVoiceLibrary())} disabled={busy !== null}>
              ⟳ Sync now
            </button>
          </div>
        </div>
      </section>

      <StorageNote lib={lib} />
      {readOnly && (
        <p className="rounded-xl border border-excited/40 bg-excited/10 p-3 text-sm text-excited" role="status">
          This is the public app: voices are read-only here. Manage them in your private Voice Studio.
        </p>
      )}
      {error && <p className="rounded-xl border border-peak/40 bg-peak/10 p-3 text-sm text-peak" role="alert">{error}</p>}

      <section className="panel overflow-hidden" data-testid="library-table">
        {voices.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No cloned voices yet. <Link to="/voices" className="text-accent underline">Clone your first voice →</Link>
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {voices.map((v) => (
              <Row key={v.voice_id} v={v} preview={previews[v.voice_id]?.preview_url} busy={busy === v.voice_id} readOnly={readOnly}
                onToggle={() => void act(v.voice_id, () => api.setVoiceEnabled(v.voice_id, !v.enabled))}
                onDelete={() => {
                  if (window.confirm(`Delete “${v.name}” everywhere? This cannot be undone.`)) void act(v.voice_id, () => api.deleteVoice(v.voice_id));
                }} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Row({ v, preview, busy, readOnly, onToggle, onDelete }: {
  v: LibraryVoice; preview?: string; busy: boolean; readOnly: boolean; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <li className={`flex flex-wrap items-center gap-4 p-4 ${busy ? "opacity-60" : ""}`} data-testid="library-row">
      <Avatar name={v.name} id={v.voice_id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{v.name}</span>
          <TierBadge tier={v.tier === "pro" ? "pro" : "instant"} />
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {v.saved ? "● saved permanently" : "○ only on this server"}
          {v.seconds ? ` · ${Math.round(v.seconds)} s sample` : ""}
          {v.created ? ` · ${v.created.slice(0, 10)}` : ""}
        </div>
      </div>
      {preview && <PlayButton url={preview} label={`${v.name} preview`} />}
      <button type="button" role="switch" aria-checked={v.enabled} aria-label={`Offer ${v.name} in the app`} disabled={busy || readOnly} onClick={onToggle}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          v.enabled ? "border-ok/50 bg-ok/10 text-ok" : "border-white/10 text-muted"}`}>
        <span className={`h-2 w-2 rounded-full ${v.enabled ? "bg-ok" : "bg-muted"}`} />
        {v.enabled ? "In app" : "Hidden"}
      </button>
      <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy || readOnly} onClick={onDelete} aria-label={`Delete ${v.name}`}>
        Delete
      </button>
    </li>
  );
}

function StorageNote({ lib }: { lib: VoiceLibraryStatus | null }) {
  if (!lib) return null;
  if (!lib.enabled)
    return (
      <p className="rounded-xl border border-excited/40 bg-excited/10 p-3 text-sm text-excited" role="status">
        Voices are stored only on this server and are lost when it restarts. Add an <code>HF_TOKEN</code> secret (a Hugging Face write
        token) to keep them permanently — see docs/VOICE_LIBRARY.md.
        {lib.error && <span className="block pt-1 text-xs">{lib.error}</span>}
      </p>
    );
  const when = lib.last_sync ? new Date(lib.last_sync * 1000).toLocaleTimeString() : "not yet";
  return (
    <p className="rounded-xl border border-white/[0.07] bg-black/25 p-3 text-xs text-muted">
      Stored permanently in <b className="text-ink">{lib.where?.replace(/^hf:/, "Hugging Face dataset ")}</b> (private) · last synced {when}
      {lib.rescued.length > 0 && <> · recovered from this server: {lib.rescued.join(", ")}</>}
      {lib.error && <span className="block pt-1 text-peak">{lib.error}</span>}
    </p>
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
