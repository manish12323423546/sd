import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AudioGraph } from "../audio/graph";
import { Controls } from "../components/Controls";
import { DelayHud } from "../components/DelayHud";
import { SpeakerCard } from "../components/SpeakerCard";
import { Sparkline } from "../components/Sparkline";
import { Transcript } from "../components/Transcript";
import { wsUrl } from "../net/api";
import { ClockSync, syncAction } from "../net/clock";
import { SessionSocket } from "../net/ws";
import { recentDelays, useSession } from "../store/session";
import type { AudioReady, ServerMessage } from "../types/protocol";

const now = () => performance.now() / 1000;

export function Player() {
  const { id = "" } = useParams();
  const s = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const sockRef = useRef<SessionSocket | null>(null);
  const clockRef = useRef<ClockSync | null>(null);
  const startedRef = useRef(false);
  const pendingRef = useRef<AudioReady[]>([]);
  const [mediaTime, setMediaTime] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [connError, setConnError] = useState<string | null>(null);

  const scheduleLine = useCallback((msg: AudioReady) => {
    const graph = graphRef.current;
    const video = videoRef.current;
    if (!graph || !video || !startedRef.current) {
      pendingRef.current.push(msg);
      return;
    }
    graph
      .preload(msg.url)
      .then((buf) => {
        const plan = graph.schedule(buf, msg.play_at_media, video, () => {
          sockRef.current?.send({ type: "played", line_id: msg.line_id, client_media_time: video.currentTime });
        });
        useSession.getState().markPlayed(msg.line_id, plan.late);
      })
      .catch(() => useSession.getState().apply({ type: "warning", message: `could not load audio for ${msg.line_id}` }));
  }, []);

  // connect the socket once
  useEffect(() => {
    useSession.getState().reset();
    const sock = new SessionSocket(wsUrl(`/ws/sessions/${id}`));
    sockRef.current = sock;
    const off = sock.on((msg: ServerMessage) => {
      useSession.getState().apply(msg);
      if (msg.type === "session.ready") {
        clockRef.current = new ClockSync(msg.speed ?? 1);
      } else if (msg.type === "session.started") {
        clockRef.current?.anchor(msg.server_wall, now());
        const video = videoRef.current;
        if (video) {
          video.currentTime = msg.server_wall;
          video.playbackRate = useSession.getState().speed;
          void video.play();
        }
        startedRef.current = true;
        sock.ping();
        const queued = pendingRef.current.splice(0);
        queued.forEach(scheduleLine);
      } else if (msg.type === "audio.ready") {
        graphRef.current?.preload(msg.url).catch(() => undefined); // pre-load immediately
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

  // keep the video at live media time (±300 ms) and update the clock display
  useEffect(() => {
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const clock = clockRef.current;
      if (!video) return;
      setMediaTime(video.currentTime);
      if (!startedRef.current || !clock || useSession.getState().status !== "live") return;
      const server = clock.serverNow(now());
      if (server === null) return;
      const action = syncAction(video.currentTime, server, useSession.getState().speed);
      if (action.kind === "seek") video.currentTime = action.to;
      else video.playbackRate = action.rate;
    }, 250);
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
    }
    await graphRef.current.resume();
    sockRef.current?.send({ type: "start" });
  };

  const stop = () => {
    if (!window.confirm("Stop the live session? This ends the broadcast for this session.")) return;
    sockRef.current?.send({ type: "stop" });
  };

  const changeVoice = (speakerId: string, voiceId: string) => {
    useSession.getState().setSpeakerVoice(speakerId, voiceId);
    sockRef.current?.send({ type: "set_voice", speaker_id: speakerId, voice_id: voiceId });
    const name = s.voices.find((v) => v.voice_id === voiceId)?.name ?? voiceId;
    setToast(`${name} applies from the next line`);
    window.setTimeout(() => setToast(null), 2500);
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

  return (
    <main className="mx-auto grid max-w-[1400px] gap-4 p-4 xl:grid-cols-[1fr_420px]">
      <section className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-panel border border-line bg-black" style={{ aspectRatio: "16 / 9" }}>
          {s.mediaUrl && (
            <video ref={videoRef} src={s.mediaUrl} playsInline preload="auto" className="h-full w-full" data-testid="video"
              onContextMenu={(e) => e.preventDefault()} />
          )}
          {s.status === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <button type="button" data-testid="start-live" onClick={() => void startPlayback()}
                className="rounded-panel bg-accent px-6 py-3 text-lg font-semibold text-bg">
                ▶ Start live playback
              </button>
            </div>
          )}
          {s.status === "idle" && <div className="absolute inset-0 flex items-center justify-center text-muted">{connError ?? "connecting…"}</div>}
        </div>
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-panel p-3">
          <div className="flex flex-wrap items-center gap-3">
            {s.status === "live" ? (
              <button type="button" onClick={stop} aria-label="Stop session" className="rounded-md border border-line px-3 py-1 hover:border-peak">❚❚ stop</button>
            ) : (
              <span className="rounded-md border border-line px-3 py-1 text-muted">▶</span>
            )}
            <DelayHud status={s.status} mediaTime={mediaTime} metrics={s.metrics} />
          </div>
          <Controls levels={s.levels} onChange={(p) => useSession.getState().setLevels(p)} />
          {s.status === "ended" && (
            <p className="text-sm">
              Session ended. <Link className="text-accent" to={`/session/${id}/report`}>Open the session report →</Link>
            </p>
          )}
          {s.warnings[0] && <p className="text-xs text-excited" role="status">⚠ {s.warnings[0]}</p>}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-panel border border-line bg-panel p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Commentators</h2>
          <div className="flex flex-col gap-2">
            {speakers.length === 0 && <p className="text-sm text-muted">Commentators appear when they first speak.</p>}
            {speakers.map((sp) => (
              <SpeakerCard key={sp.id} speaker={sp} voices={s.voices} onVoice={(v) => changeVoice(sp.id, v)} onPreview={preview} />
            ))}
          </div>
          {toast && <p className="mt-2 rounded-md bg-accent/15 px-2 py-1 text-xs text-accent" role="status">{toast}</p>}
        </section>
        <section className="rounded-panel border border-line bg-panel p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Live transcript</h2>
          <Transcript lines={s.lines} speakers={s.speakers} />
        </section>
        <section className="rounded-panel border border-line bg-panel p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Delay (last 2 min)</h2>
          <Sparkline points={recentDelays(s)} />
          <a className="mt-2 inline-block text-sm text-accent" href={`/api/sessions/${id}/lines.csv`} download>
            Export delay log CSV
          </a>
        </section>
      </aside>
    </main>
  );
}
