import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AudioGraph } from "../audio/graph";
import { Controls } from "../components/Controls";
import { DelayHud } from "../components/DelayHud";
import { EmotionChip } from "../components/EmotionChip";
import { SpeakerCard } from "../components/SpeakerCard";
import { Sparkline } from "../components/Sparkline";
import { Transcript } from "../components/Transcript";
import { wsUrl } from "../net/api";
import { withBase } from "../net/base";
import { ClockSync, syncAction } from "../net/clock";
import { SessionSocket } from "../net/ws";
import { recentDelays, useSession } from "../store/session";
import type { AudioReady, ServerMessage } from "../types/protocol";

const now = () => performance.now() / 1000;

const SHORTCUTS: [string, string][] = [
  ["Space", "pause / resume"],
  ["M", "mute / unmute the original commentary"],
  ["V", "mute / unmute the character voices"],
  ["C", "subtitles on / off"],
  ["F", "full screen"],
  ["?", "show these shortcuts"],
];

export function Player() {
  const { id = "" } = useParams();
  const s = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const sockRef = useRef<SessionSocket | null>(null);
  const clockRef = useRef<ClockSync | null>(null);
  const startedRef = useRef(false);
  const pausedRef = useRef(false);
  const pendingRef = useRef<AudioReady[]>([]);
  const savedLevels = useRef({ original: 0.25, voice: 1 });
  const [mediaTime, setMediaTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [subs, setSubs] = useState(true);
  const [help, setHelp] = useState(false);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const scheduleLine = useCallback((input: AudioReady) => {
    let msg = input;
    const graph = graphRef.current;
    const video = videoRef.current;
    if (!graph || !video || !startedRef.current) {
      pendingRef.current.push(input);
      return;
    }
    msg = { ...msg, url: withBase(msg.url) };
    const played = () =>
      sockRef.current?.send({ type: "played", line_id: msg.line_id, client_media_time: video.currentTime });
    if (msg.url.endsWith(".part.wav")) {
      const plan = graph.playStream(msg.url, msg.play_at_media, msg.duration, video, played);
      useSession.getState().markPlayed(msg.line_id, plan.late);
      return;
    }
    graph
      .preload(msg.url)
      .then((buf) => {
        const plan = graph.schedule(buf, msg.play_at_media, video, played);
        useSession.getState().markPlayed(msg.line_id, plan.late);
      })
      .catch(() => useSession.getState().apply({ type: "warning", message: `could not load audio for ${msg.line_id}` }));
  }, []);

  // the viewer's media time: live time minus the synced-mode picture delay
  const targetTime = (): number | null => {
    const clock = clockRef.current;
    if (!clock) return null;
    const server = clock.serverNow(now());
    return server === null ? null : server - useSession.getState().viewDelay;
  };

  // connect the socket once
  useEffect(() => {
    useSession.getState().reset();
    const sock = new SessionSocket(wsUrl(`/ws/sessions/${id}`));
    sockRef.current = sock;
    const off = sock.on((msg: ServerMessage) => {
      useSession.getState().apply(msg);
      if (msg.type === "session.ready") {
        clockRef.current = new ClockSync(msg.speed ?? 1);
      } else if (msg.type === "session.started" || msg.type === "session.resumed") {
        clockRef.current?.anchor(msg.server_wall, now());
        const video = videoRef.current;
        const target = targetTime() ?? 0;
        if (video) {
          video.playbackRate = useSession.getState().speed;
          if (target >= 0) {
            if (Math.abs(video.currentTime - target) > 0.25) video.currentTime = target;
            void video.play();
          } else {
            video.currentTime = 0; // synced mode: hold the first frame while voices are prepared
          }
        }
        if (msg.type === "session.resumed") {
          pausedRef.current = false; // also when another viewer resumed
          void graphRef.current?.resume();
        }
        startedRef.current = true;
        sock.ping();
        const queued = pendingRef.current.splice(0);
        queued.forEach(scheduleLine);
      } else if (msg.type === "session.paused") {
        if (!pausedRef.current) {
          // another viewer paused the shared session: follow it
          pausedRef.current = true;
          videoRef.current?.pause();
          void graphRef.current?.suspend();
        }
      } else if (msg.type === "audio.ready") {
        if (!msg.url.endsWith(".part.wav")) graphRef.current?.preload(withBase(msg.url)).catch(() => undefined);
        scheduleLine(msg);
      } else if (msg.type === "session.ended") {
        videoRef.current?.pause();
      }
    });
    sock.onPong = (tSent, serverWall, localNow) => clockRef.current?.addPong(tSent, serverWall, localNow);
    sock.connect().catch((e: Error) => setConnError(e.message));
    return () => {
      off();
      sock.close();
      graphRef.current?.close();
      graphRef.current = null;
      startedRef.current = false;
    };
  }, [id, scheduleLine]);

  // keep the video at the viewer's media time (±300 ms), run the synced-mode countdown
  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      setMediaTime(video.currentTime);
      if (!startedRef.current || pausedRef.current || useSession.getState().status !== "live") return;
      const target = targetTime();
      if (target === null) return;
      if (target < 0) {
        setCountdown(-target);
        if (!video.paused) video.pause();
        return;
      }
      setCountdown(null);
      if (video.paused && !video.ended) void video.play();
      const action = syncAction(video.currentTime, target, useSession.getState().speed);
      if (action.kind === "seek") video.currentTime = action.to;
      else video.playbackRate = action.rate;
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  // levels → audio graph
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setOriginalLevel(s.levels.original);
    g.setVoiceLevel(s.levels.voice);
    g.setDucking(s.levels.ducking);
  }, [s.levels]);

  const startPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!graphRef.current) {
      const g = new AudioGraph(); // needs a user gesture (browser autoplay rules)
      g.attachVideo(video);
      g.setOriginalLevel(s.levels.original);
      g.setVoiceLevel(s.levels.voice);
      graphRef.current = g;
      (window as unknown as { __lcvPlayed?: unknown }).__lcvPlayed = g.played; // overlap check (tests)
    }
    await graphRef.current.resume();
    sockRef.current?.send({ type: "start" });
  };

  const togglePause = useCallback(() => {
    const st = useSession.getState();
    if (st.status !== "live") return;
    const video = videoRef.current;
    if (!pausedRef.current) {
      pausedRef.current = true;
      video?.pause();
      void graphRef.current?.suspend();
      sockRef.current?.send({ type: "pause" });
      useSession.getState().apply({ type: "session.paused", server_wall: 0 });
    } else {
      pausedRef.current = false;
      sockRef.current?.send({ type: "resume" }); // video + audio restart on "session.resumed"
    }
  }, []);

  const stop = () => {
    if (!window.confirm("Stop the session? You can open its report afterwards.")) return;
    sockRef.current?.send({ type: "stop" });
  };

  const toggleMute = useCallback((which: "original" | "voice") => {
    const lv = useSession.getState().levels;
    const muted = lv[which] === 0;
    if (!muted) savedLevels.current[which] = lv[which];
    useSession.getState().setLevels({ [which]: muted ? savedLevels.current[which] || (which === "voice" ? 1 : 0.25) : 0 });
    flash(`${which === "voice" ? "Character voices" : "Original commentary"} ${muted ? "on" : "muted"}`);
  }, []);

  const fullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        togglePause();
      } else if (k === "m") toggleMute("original");
      else if (k === "v") toggleMute("voice");
      else if (k === "c") setSubs((x) => !x);
      else if (k === "f") fullscreen();
      else if (k === "?") setHelp((x) => !x);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause, toggleMute, fullscreen]);

  const changeVoice = (speakerId: string, voiceId: string) => {
    useSession.getState().setSpeakerVoice(speakerId, voiceId);
    sockRef.current?.send({ type: "set_voice", speaker_id: speakerId, voice_id: voiceId });
    const name = s.voices.find((v) => v.voice_id === voiceId)?.name ?? voiceId;
    flash(`${name} applies from the next line`);
  };

  const preview = (url: string) => {
    if (!graphRef.current) {
      const g = new AudioGraph();
      if (videoRef.current) g.attachVideo(videoRef.current);
      graphRef.current = g;
    }
    void graphRef.current.preview(url);
  };

  const speakers = s.speakerOrder.map((k) => s.speakers[k]).filter((x) => x !== undefined);
  // the voice line playing right now (subtitle)
  const current = s.lines.find(
    (l) => l.playAt !== undefined && l.duration !== undefined && mediaTime >= l.playAt && mediaTime <= l.playAt + l.duration + 0.3,
  );
  const curSpeaker = current?.speakerId ? s.speakers[current.speakerId] : undefined;
  const synced = s.viewDelay > 0;
  const voiced = s.lines.filter((l) => l.playAt !== undefined).length;
  const dropped = s.lines.filter((l) => l.action === "dropped").length;

  return (
    <main className="mx-auto grid max-w-[1400px] gap-5 px-4 pb-12 pt-5 sm:px-6 xl:grid-cols-[1fr_420px]">
      <section className="flex flex-col gap-3">
        <div ref={stageRef} className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-card" style={{ aspectRatio: "16 / 9" }}>
          {s.mediaUrl && (
            <video ref={videoRef} src={s.mediaUrl} crossOrigin="anonymous" playsInline preload="auto" className="h-full w-full" data-testid="video"
              onContextMenu={(e) => e.preventDefault()} onClick={togglePause} />
          )}
          {/* top-left badges */}
          {s.status === "live" && (
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider text-white ${synced ? "bg-aqua/90" : "bg-peak/90"}`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {synced ? "SYNCED" : "LIVE"}
              </span>
              {s.paused && <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white">PAUSED</span>}
            </div>
          )}
          {/* subtitles of the character voice that is speaking */}
          {subs && current && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6" data-testid="voice-subtitle">
              <div className="max-w-[85%] animate-rise rounded-xl bg-black/75 px-4 py-2 text-center text-[clamp(13px,1.6vw,20px)] font-medium leading-snug text-white shadow-lg backdrop-blur">
                <span className="mr-2 text-[0.75em] font-bold uppercase tracking-wider" style={{ color: curSpeaker?.color }}>
                  {curSpeaker?.name ?? current.speakerId}
                </span>
                {current.text}
              </div>
            </div>
          )}
          {s.status === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/40 to-black/80 backdrop-blur-[2px]">
              <button type="button" data-testid="start-live" onClick={() => void startPlayback()}
                className="btn-primary !rounded-full !px-8 !py-4 text-lg">
                ▶ Start {synced ? "synced" : "live"} playback
              </button>
              <p className="max-w-md text-center text-xs text-white/75">
                {synced
                  ? `Synced mode: the picture starts ${s.viewDelay.toFixed(0)} s later so every voice lands exactly on its moment.`
                  : "Live mode: lowest latency — voices follow about a line behind."}{" "}
                Press <kbd className="rounded bg-white/15 px-1">?</kbd> for shortcuts.
              </p>
            </div>
          )}
          {countdown !== null && s.status === "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm" data-testid="sync-countdown">
              <div className="relative grid h-24 w-24 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                  <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,.12)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="44" stroke="#22D3EE" strokeWidth="8" fill="none" strokeLinecap="round"
                    strokeDasharray={276} strokeDashoffset={276 * (countdown / Math.max(1, s.viewDelay))} />
                </svg>
                <span className="font-display text-3xl font-semibold text-white">{Math.ceil(countdown)}</span>
              </div>
              <p className="text-sm text-white/80">Preparing the first voices — picture starts in sync…</p>
            </div>
          )}
          {s.paused && countdown === null && (
            <button type="button" onClick={togglePause} aria-label="Resume" className="absolute inset-0 grid place-items-center bg-black/40">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/15 text-3xl text-white backdrop-blur">▶</span>
            </button>
          )}
          {s.status === "idle" && <div className="absolute inset-0 flex items-center justify-center text-muted">{connError ?? "connecting…"}</div>}
          {toast && (
            <div className="pointer-events-none absolute right-3 top-3 animate-rise rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white" role="status">
              {toast}
            </div>
          )}
        </div>

        <div className="panel flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={togglePause} disabled={s.status !== "live"} aria-label={s.paused ? "Resume" : "Pause"}
              className="btn-primary !rounded-full !px-4 !py-2" data-testid="pause">
              {s.paused ? "▶ Resume" : "❚❚ Pause"}
            </button>
            <button type="button" onClick={stop} disabled={s.status !== "live"} aria-label="Stop session" className="btn-ghost !py-2 hover:!border-peak/60 hover:!text-peak">
              ■ Stop
            </button>
            <DelayHud status={s.status} mediaTime={mediaTime} metrics={s.metrics} synced={synced} />
            <div className="ml-auto flex items-center gap-1">
              <IconToggle on={s.levels.original > 0} label="Original (M)" onClick={() => toggleMute("original")} />
              <IconToggle on={s.levels.voice > 0} label="Voices (V)" onClick={() => toggleMute("voice")} />
              <IconToggle on={subs} label="Subtitles (C)" onClick={() => setSubs((x) => !x)} />
              <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={fullscreen} aria-label="Full screen">⛶</button>
              <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setHelp((x) => !x)} aria-label="Keyboard shortcuts">?</button>
            </div>
          </div>
          {help && (
            <div className="grid animate-rise gap-1 rounded-xl border border-white/[0.07] bg-black/30 p-3 text-xs sm:grid-cols-2">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex items-center gap-2"><kbd className="min-w-[48px] rounded bg-white/10 px-1.5 py-0.5 text-center font-mono">{k}</kbd><span className="text-muted">{d}</span></div>
              ))}
            </div>
          )}
          <Controls levels={s.levels} onChange={(p) => useSession.getState().setLevels(p)} />
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>lines heard <b className="text-ink">{s.lines.length}</b></span>
            <span>voiced <b className="text-ok">{voiced}</b></span>
            <span>skipped <b className={dropped ? "text-peak" : "text-ink"}>{dropped}</b></span>
            {synced && <span>picture delay <b className="text-ink">{s.viewDelay.toFixed(1)} s</b></span>}
          </div>
          {s.status === "ended" && (
            <p className="text-sm">
              Session ended. <Link className="btn-primary ml-2 !py-1.5" to={`/session/${id}/report`}>Open the session report →</Link>
            </p>
          )}
          {s.warnings[0] && <p className="text-xs text-excited" role="status">⚠ {s.warnings[0]}</p>}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="panel p-4">
          <h2 className="eyebrow mb-3">Commentators</h2>
          <div className="flex flex-col gap-2">
            {speakers.length === 0 && <p className="text-sm text-muted">Commentators appear when they first speak.</p>}
            {speakers.map((sp) => (
              <SpeakerCard key={sp.id} speaker={sp} voices={s.voices} onVoice={(v) => changeVoice(sp.id, v)} onPreview={preview}
                others={speakers.filter((o) => o.id !== sp.id)}
                onMerge={(into) => { sockRef.current?.send({ type: "merge_speakers", from: sp.id, into }); flash(`${sp.name} merged`); }}
                onRename={(name) => sockRef.current?.send({ type: "rename_speaker", speaker_id: sp.id, name })} />
            ))}
          </div>
        </section>
        <section className="panel p-4">
          <h2 className="eyebrow mb-3 flex items-center justify-between">
            Live transcript
            {current && <span className="flex items-center gap-1.5 normal-case tracking-normal"><EmotionChip emotion={current.emotion} /></span>}
          </h2>
          <Transcript lines={s.lines} speakers={s.speakers} />
        </section>
        <section className="panel p-4">
          <h2 className="eyebrow mb-3">Felt delay (last 2 min)</h2>
          <Sparkline points={recentDelays(s)} />
          <a className="mt-3 inline-block text-sm text-accent" href={withBase(`/api/sessions/${id}/lines.csv`)} download>
            Export delay log CSV
          </a>
        </section>
      </aside>
    </main>
  );
}

function IconToggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} title={label}
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${on ? "border-accent/50 bg-accent/10 text-accent" : "border-white/10 text-muted line-through"}`}>
      {label.split(" (")[0]}
    </button>
  );
}
