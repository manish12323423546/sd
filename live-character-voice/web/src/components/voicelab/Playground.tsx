// Speak any line with any voice in any mood — hear the result in a couple of seconds.
import { useState } from "react";
import { api, type Voice } from "../../net/api";
import { MoodPicker, PlayButton, playUrl } from "../../ui/kit";

const PROMPTS = [
  "And he scores! What a goal, the whole stadium is on its feet!",
  "Welcome back, it's a quiet start here as both sides settle in.",
  "Corner kick, swung in, headed clear — and they break away quickly!",
  "That is a big, big moment in this final.",
];

interface Take { id: number; voice: string; mood: string; text: string; url: string; secs: number }

export function Playground({ voices, voiceId, setVoiceId }: { voices: Voice[]; voiceId: string; setVoiceId: (v: string) => void }) {
  const [text, setText] = useState(PROMPTS[0] ?? "");
  const [mood, setMood] = useState("excited");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.say(voiceId, text.trim(), mood);
      const name = voices.find((v) => v.voice_id === voiceId)?.name ?? voiceId;
      setTakes((t) => [{ id: Date.now(), voice: name, mood, text: text.trim(), url: r.url, secs: r.seconds }, ...t].slice(0, 6));
      playUrl(r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel flex flex-col gap-4 p-5 sm:p-6" id="playground" data-testid="playground">
      <div>
        <p className="eyebrow">Playground</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Hear it say anything</h2>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Voice</span>
        <select className="field" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} aria-label="Playground voice">
          {voices.map((v) => (
            <option key={v.voice_id} value={v.voice_id}>
              {v.name} {v.tier === "pro" ? "· Pro clone" : v.tier === "instant" ? "· Instant clone" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex justify-between text-sm font-medium">Line <span className="font-mono text-xs text-muted">{text.length}/300</span></span>
        <textarea className="field min-h-[92px] resize-y" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PROMPTS.map((p) => (
          <button key={p} type="button" onClick={() => setText(p)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-muted transition hover:border-accent/60 hover:text-ink">
            {p.slice(0, 28)}…
          </button>
        ))}
      </div>
      <MoodPicker value={mood} onChange={setMood} />
      <button type="button" className="btn-primary !py-3" disabled={busy || !text.trim() || !voiceId} onClick={() => void generate()}>
        {busy ? "Generating…" : "Generate & play"}
      </button>
      {error && <p className="text-sm text-peak" role="alert">{error}</p>}
      {takes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {takes.map((t) => (
            <li key={t.id} className="flex animate-rise items-center gap-3 rounded-xl border border-white/[0.06] bg-black/25 p-2.5">
              <PlayButton url={t.url} label="take" size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">“{t.text}”</div>
                <div className="text-[11px] text-muted">{t.voice} · <span className="capitalize">{t.mood}</span> · made in {t.secs.toFixed(1)} s</div>
              </div>
              <a href={t.url} download={`${t.voice}-${t.mood}.wav`} className="text-xs text-muted hover:text-accent">save</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
