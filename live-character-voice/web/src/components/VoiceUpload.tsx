import { useEffect, useState } from "react";
import { api, type Voice } from "../net/api";

// "Add your own voice": instant cloning from a 10–30 s sample the user owns or may use.
export function VoiceUpload({ cloning }: { cloning: boolean }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => setVoices((await api.voices()).filter((v) => v.custom));
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submit = async () => {
    if (!file || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const v = await api.addVoice(name.trim(), file, consent, transcript);
      setMsg({ ok: true, text: `“${v.name}” is ready. Pick it for any commentator in the player.` });
      setName("");
      setFile(null);
      setTranscript("");
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api.deleteVoice(id).catch(() => undefined);
    await refresh();
  };

  return (
    <section className="rounded-panel border border-line bg-panel p-4" data-testid="voice-upload">
      <h2 className="mb-1 text-[20px] font-semibold">Add your own voice</h2>
      <p className="mb-3 text-sm text-muted">
        Upload a recording of ONE person speaking (no music, no other voices). About 15 seconds works best;
        longer uploads are trimmed to their best 15 seconds automatically. It is cloned instantly and becomes a
        character you can pick for any commentator.
      </p>
      {!cloning && (
        <p className="mb-3 rounded-md border border-excited/50 p-2 text-xs text-excited">
          Cloning needs the free Fish Audio key (FISH_API_KEY). Without it, custom voices fall back to a built-in voice.
        </p>
      )}
      <div className="grid gap-2 text-sm">
        <label className="grid gap-1">
          Voice name
          <input id="voice-name" className="rounded-md border border-line bg-bg px-2 py-1" value={name}
            maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. My commentator voice" />
        </label>
        <label className="grid gap-1">
          Voice sample
          <input id="voice-file" type="file" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="grid gap-1">
          What is said in the sample <span className="text-xs text-muted">(optional; transcribed automatically)</span>
          <textarea id="voice-transcript" rows={2} className="rounded-md border border-line bg-bg px-2 py-1" value={transcript}
            onChange={(e) => setTranscript(e.target.value)} />
        </label>
        <label className="flex items-start gap-2">
          <input id="voice-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I own this voice or have permission to clone it. Real people and known characters need their consent or a licence.</span>
        </label>
        <button type="button" data-testid="add-voice" disabled={busy || !file || !name.trim() || !consent}
          className="rounded-md bg-accent px-3 py-2 font-semibold text-bg disabled:opacity-40" onClick={() => void submit()}>
          {busy ? "Cloning…" : "Clone this voice"}
        </button>
        {msg && <p role="status" className={msg.ok ? "text-calm" : "text-peak"}>{msg.text}</p>}
      </div>
      {voices.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {voices.map((v) => (
            <li key={v.voice_id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1">
              <span>{v.name}</span>
              <span className="flex gap-2">
                <button type="button" className="text-accent" onClick={() => void new Audio(v.preview_url).play()}>▶ preview</button>
                <button type="button" className="text-peak" onClick={() => void remove(v.voice_id)}>delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
