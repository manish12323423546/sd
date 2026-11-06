// Live capture: re-voice ANY browser tab or live stream in real time (no extension needed).
// Chrome's share picker captures a tab with its audio; the relay streams it to the engine and
// plays the original (delayed in synced mode) plus the character voices exactly in time.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmotionChip } from "../components/EmotionChip";
import { SpeakerCard } from "../components/SpeakerCard";
import { Transcript } from "../components/Transcript";
import { DelayedVideo, LiveRelay, type RelayStatus } from "../live/relay";
import { api, type Voice } from "../net/api";
import { API_BASE, getCode } from "../net/base";
import { useSession } from "../store/session";
import { Avatar, PlayButton } from "../ui/kit";

const SPEAKER_COLORS = ["#4FA3FF", "#F5A524", "#17C964", "#F31260", "#9B7BFF", "#2BD4D4", "#FF8A3D", "#E8E36B"];

export function LiveCapture() {
  const s = useSession();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [mode, setMode] = useState<"synced" | "live">("synced");
  const [delay, setDelay] = useState(6);
  const [speakers, setSpeakers] = useState(2);
  const [cast, setCast] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<RelayStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerT, setViewerT] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [levels, setLevels] = useState({ original: 0.3, voice: 1 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const relayRef = useRef<LiveRelay | null>(null);
  const delayedRef = useRef<DelayedVideo | null>(null);

  useEffect(() => {
    void api.voices().then(setVoices);
    useSession.getState().reset();
    return () => {
      relayRef.current?.stop();
      delayedRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      const r = relayRef.current;
      if (!r) return;
      const v = r.viewerTime();
      if (v !== null) setViewerT(v);
      setWaiting(delayedRef.current?.waiting ?? (v !== null && v < 0 ? -v : 0));
    }, 100);
    return () => window.clearInterval(t);
  }, []);

  // "Auto" lets the engine find up to 8; the cast list shows the first 4 (switch the rest live)
  const ids = Array.from({ length: Math.min(speakers, 4) }, (_, i) => `S${i + 1}`);
  const [known, setKnown] = useState<string[]>([]);
  const running = status?.state === "live" || status?.state === "connecting";

  const start = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: { suppressLocalAudioPlayback: true },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "include",
      } as unknown as DisplayMediaStreamOptions);
    } catch {
      setError("Sharing was cancelled. Pick a tab and keep “Also share tab audio” switched on.");
      return;
    }
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      setError("No audio was shared. Choose a Chrome TAB and switch on “Also share tab audio”.");
      return;
    }
    const D = mode === "synced" ? delay : 0;
    useSession.getState().reset();
    const relay = new LiveRelay(stream, {
      base: API_BASE,
      accessCode: getCode(),
      viewDelay: D,
      maxSpeakers: speakers,
      voiceMap: Object.fromEntries(ids.filter((k) => cast[k]).map((k) => [k, cast[k] as string])),
      label: stream.getVideoTracks()[0]?.label || "tab",
      knownVoices: known,
      workletUrl: "/pcm-worklet.js",
      onMessage: (m) => useSession.getState().apply(m),
      onStatus: setStatus,
    });
    relayRef.current = relay;
    try {
      await relay.start();
    } catch (e) {
      setError((e as Error).message);
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    relay.setOriginalLevel(levels.original);
    const video = videoRef.current;
    const vt = stream.getVideoTracks()[0];
    if (video && vt) {
      if (D > 0 && DelayedVideo.supported()) {
        const dv = new DelayedVideo(vt, video, relay, D);
        delayedRef.current = dv;
        dv.start();
      } else {
        video.srcObject = new MediaStream([vt]);
        video.muted = true;
        void video.play();
      }
    }
    vt?.addEventListener("ended", stop);
  };

  const stop = () => {
    relayRef.current?.stop();
    delayedRef.current?.stop();
    delayedRef.current = null;
  };

  const current = s.lines.find(
    (l) => l.playAt !== undefined && l.duration !== undefined && viewerT >= l.playAt && viewerT <= l.playAt + l.duration + 0.3,
  );
  const curSpeaker = current?.speakerId ? s.speakers[current.speakerId] : undefined;
  const speakerViews = s.speakerOrder.map((k) => s.speakers[k]).filter((x) => x !== undefined);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 pb-16 pt-5 sm:px-6">
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#0f1a2c] via-[#0c111b] to-[#1b0f22] px-6 py-6 sm:px-8">
        <p className="eyebrow">Live capture</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          <span className="gradient-text">Any tab. Any live stream. Re-voiced live.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Share a Chrome tab that is playing a match (YouTube, Twitch, a broadcaster's player…). Its sound is re-voiced in the characters
          you cast. Prefer one click? Use the <a className="text-accent underline" href="#extension">Chrome extension</a>.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <section className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-card" style={{ aspectRatio: "16 / 9" }}>
            <video ref={videoRef} playsInline muted className="h-full w-full object-contain" data-testid="live-video" />
            {!running && status?.state !== "ended" && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-violet text-2xl shadow-glow">⦿</div>
                  <p className="text-lg font-semibold">Pick a tab to re-voice</p>
                  <p className="mt-1 text-sm text-muted">Choose a <b>Chrome tab</b> in the share dialog and keep <b>“Also share tab audio”</b> on.</p>
                </div>
              </div>
            )}
            {running && (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider text-white ${mode === "synced" ? "bg-violet/90" : "bg-peak/90"}`}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {mode === "synced" ? `SYNCED +${delay}s` : "LIVE"}
                </span>
              </div>
            )}
            {running && waiting > 0.05 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm" data-testid="live-countdown">
                <span className="font-display text-5xl font-semibold">{Math.ceil(waiting)}</span>
                <p className="text-sm text-white/80">Buffering so every voice lands on time…</p>
              </div>
            )}
            {current && (
              <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6" data-testid="live-subtitle">
                <div className="max-w-[85%] animate-rise rounded-xl bg-black/75 px-4 py-2 text-center text-[clamp(13px,1.6vw,20px)] font-medium text-white backdrop-blur">
                  <span className="mr-2 text-[0.75em] font-bold uppercase tracking-wider" style={{ color: curSpeaker?.color }}>{curSpeaker?.name ?? current.speakerId}</span>
                  {current.text}
                </div>
              </div>
            )}
          </div>

          <div className="panel flex flex-wrap items-center gap-3 p-4">
            {!running ? (
              <button type="button" className="btn-primary !rounded-full !px-6 !py-3" onClick={() => void start()} data-testid="live-start">
                ⦿ Choose a tab & start
              </button>
            ) : (
              <button type="button" className="btn !rounded-full bg-peak !px-6 !py-3 text-white" onClick={stop} data-testid="live-stop">■ Stop</button>
            )}
            <div className="flex flex-wrap gap-4 font-mono text-xs text-muted">
              <span>audio sent <b className="text-ink">{(status?.sentS ?? 0).toFixed(0)} s</b></span>
              <span>voiced <b className="text-ok">{status?.voiced ?? 0}</b></span>
              <span>late <b className={(status?.late ?? 0) > 0 ? "text-excited" : "text-ink"}>{status?.late ?? 0}</b></span>
              <span>felt delay <b className="text-ink">{s.metrics.p50.toFixed(1)} s</b> (p95 {s.metrics.p95.toFixed(1)})</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <label className="flex items-center gap-2">Original
                <input type="range" min={0} max={1} step={0.05} value={levels.original} aria-label="Original level"
                  onChange={(e) => { const v = Number(e.target.value); setLevels((l) => ({ ...l, original: v })); relayRef.current?.setOriginalLevel(v); }} />
              </label>
              <label className="flex items-center gap-2">Voices
                <input type="range" min={0} max={1.5} step={0.05} value={levels.voice} aria-label="Voice level"
                  onChange={(e) => { const v = Number(e.target.value); setLevels((l) => ({ ...l, voice: v })); relayRef.current?.setVoiceLevel(v); }} />
              </label>
            </div>
            {error && <p className="w-full text-sm text-peak" role="alert">{error}</p>}
            {status?.state === "ended" && status.sessionId && (
              <p className="w-full text-sm">Stream ended. <Link className="text-accent underline" to={`/session/${status.sessionId}/report`}>Open the report →</Link></p>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          {!running ? (
            <section className="panel flex flex-col gap-4 p-5" data-testid="live-setup">
              <div>
                <p className="eyebrow mb-2">Playback</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["synced", "Synced", "Picture + sound held back so every voice lands exactly on time."],
                    ["live", "Live", "No picture delay; voices follow each line."],
                  ] as const).map(([k, t, d]) => (
                    <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
                      className={`rounded-xl border p-3 text-left transition ${mode === k ? "border-accent/70 bg-accent/10 shadow-glow" : "border-white/10 hover:border-white/25"}`}>
                      <div className="text-sm font-semibold">{t}</div>
                      <p className="mt-1 text-[11px] leading-snug text-muted">{d}</p>
                    </button>
                  ))}
                </div>
                {mode === "synced" && (
                  <label className="mt-3 block text-xs text-muted">
                    <span className="flex justify-between"><span>Delay</span><b className="font-mono text-ink">{delay} s</b></span>
                    <input type="range" min={3} max={10} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-full" aria-label="Delay" />
                  </label>
                )}
              </div>
              <div>
                <p className="eyebrow mb-2">Cast</p>
                <label className="mb-3 flex items-center gap-2 text-sm text-muted">Commentators
                  <select className="field !w-auto !py-1" value={speakers} onChange={(e) => setSpeakers(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value={8}>Auto (up to 8)</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2">
                  {ids.map((sid, i) => {
                    const v = voices.find((x) => x.voice_id === cast[sid]);
                    return (
                      <div key={sid} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SPEAKER_COLORS[i] }} />
                        {v ? <Avatar name={v.name} id={v.voice_id} size={30} /> : <span className="w-[30px] text-center text-[10px] text-muted">auto</span>}
                        <select className="field min-w-0 flex-1 !py-1.5" aria-label={`Voice for commentator ${i + 1}`} value={cast[sid] ?? ""}
                          onChange={(e) => setCast((c) => ({ ...c, [sid]: e.target.value }))}>
                          <option value="">Automatic</option>
                          {voices.map((x) => <option key={x.voice_id} value={x.voice_id}>{x.name}{x.custom ? " (clone)" : ""}</option>)}
                        </select>
                        <PlayButton url={v?.preview_url} label="preview" size="sm" />
                      </div>
                    );
                  })}
                </div>
              </div>
              {voices.some((v) => v.custom) && (
                <div>
                  <p className="eyebrow mb-2">Known commentators</p>
                  <div className="flex flex-wrap gap-1.5">
                    {voices.filter((v) => v.custom).map((v) => {
                      const on = known.includes(v.voice_id);
                      return (
                        <button key={v.voice_id} type="button" aria-pressed={on}
                          onClick={() => setKnown((k) => (on ? k.filter((x) => x !== v.voice_id) : [...k, v.voice_id].slice(0, 8)))}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-accent/70 bg-accent/15 text-ink" : "border-white/10 text-muted"}`}>
                          {on ? "✓ " : ""}{v.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-muted">Voice Lab samples of the real commentators: recognised from their first word.</p>
                </div>
              )}
              <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3 text-xs leading-relaxed text-muted">
                <b className="text-ink">How it works:</b> the shared tab is muted; you hear its sound here
                {mode === "synced" ? ` ${delay} s later, with the picture held back by the same amount,` : ","} and each commentator line is
                re-spoken in your voices. Works with any site that plays in a Chrome tab.
              </div>
            </section>
          ) : (
            <section className="panel p-4">
              <h2 className="eyebrow mb-3">Commentators</h2>
              <div className="flex flex-col gap-2">
                {speakerViews.length === 0 && <p className="text-sm text-muted">Listening for the first commentator…</p>}
                {speakerViews.map((sp) => (
                  <SpeakerCard key={sp.id} speaker={sp} voices={s.voices}
                    others={speakerViews.filter((o) => o.id !== sp.id)}
                    onMerge={(into) => relayRef.current?.send({ type: "merge_speakers", from: sp.id, into })}
                    onRename={(name) => relayRef.current?.send({ type: "rename_speaker", speaker_id: sp.id, name })}
                    onVoice={(v) => { useSession.getState().setSpeakerVoice(sp.id, v); relayRef.current?.setVoice(sp.id, v); }}
                    onPreview={(u) => void new Audio(u).play()} />
                ))}
              </div>
            </section>
          )}
          <section className="panel p-4">
            <h2 className="eyebrow mb-3 flex items-center justify-between">Live transcript {current && <EmotionChip emotion={current.emotion} />}</h2>
            <Transcript lines={s.lines} speakers={s.speakers} />
          </section>
        </aside>
      </div>

      <section id="extension" className="panel grid gap-4 p-6 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">One-click on any tab</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Chrome extension</h2>
          <p className="mt-2 text-sm text-muted">Click the extension on any tab playing a live stream: <b>Synced window</b> opens a delayed, perfectly-synced
            viewer; <b>Live overlay</b> re-voices the tab you are watching with subtitles on the page.</p>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink/85">
          <li>Open <code className="rounded bg-black/40 px-1">chrome://extensions</code> and switch on <b>Developer mode</b>.</li>
          <li>Click <b>Load unpacked</b> and choose the folder <code className="rounded bg-black/40 px-1">live-character-voice/extension</code>.</li>
          <li>Pin the extension, open a live stream, click the icon → <b>Start</b>.</li>
        </ol>
      </section>
    </main>
  );
}
