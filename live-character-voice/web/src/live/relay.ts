// Live relay (V4): any captured MediaStream (a browser tab via the Chrome extension or via
// getDisplayMedia, a mic, a capture card) → engine → character voices, perfectly timed.
//
//   captured audio ─┬─ AudioWorklet → PCM16 16 kHz → WebSocket → engine
//                   └─ DelayNode(D) → originalGain (ducked under voices) → speakers
//   engine audio.ready (play_at_media) → fetch + decode → BufferSource at t0 + play_at_media + D
//
// One AudioContext is the clock for everything: t0 = context time of the first captured sample,
// media time τ = seconds of audio sent. The original sample captured at t0 + τ plays at
// t0 + τ + D, and the voice of a line that started at τ is scheduled at the same moment. In
// "synced" mode D > 0 (and the picture is delayed by D too, see DelayedVideo); in "live" mode D = 0.
import type { ServerMessage } from "../types/protocol";

export interface RelayOptions {
  base: string; // engine URL, e.g. http://localhost:8000 ("" = same origin)
  viewDelay: number; // seconds (0 = live)
  maxSpeakers: number;
  voiceMap?: Record<string, string>;
  label?: string;
  workletUrl: string;
  /** hosted engines with LCV_ACCESS_CODE */
  accessCode?: string;
  onMessage?: (msg: ServerMessage) => void;
  onStatus?: (s: RelayStatus) => void;
  /** a voice line starts playing now (for subtitles): line id + its length in seconds */
  onVoiceStart?: (lineId: string, durationS: number) => void;
}

export interface RelayStatus {
  state: "connecting" | "live" | "ended" | "error";
  sessionId?: string;
  sentS: number;
  voiced: number;
  late: number;
  error?: string;
}

const ATTACK = 0.08;
const RELEASE = 0.35;

export class LiveRelay {
  readonly ctx: AudioContext;
  private ws: WebSocket | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private delay: DelayNode;
  readonly originalGain: GainNode;
  readonly voiceGain: GainNode;
  private origLevel = 0.3;
  private duckUntil = 0;
  t0: number | null = null; // ctx time of the first captured sample
  private status: RelayStatus = { state: "connecting", sentS: 0, voiced: 0, late: 0 };
  private pingTimer: number | null = null;

  constructor(
    private readonly stream: MediaStream,
    private readonly o: RelayOptions,
  ) {
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    this.delay = this.ctx.createDelay(20);
    this.delay.delayTime.value = Math.max(0, o.viewDelay);
    this.originalGain = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();
    this.originalGain.gain.value = this.origLevel;
    this.originalGain.connect(this.ctx.destination);
    this.voiceGain.connect(this.ctx.destination);
    // original sound modes: "full" | "crowd" (commentary removed) | "off"
    this.fullGain = this.ctx.createGain();
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;
    this.delay.connect(this.fullGain).connect(this.originalGain);
    // crowd only: commentary is mixed in the centre (same in L and R); crowd/ambience is wide.
    // side = (L − R)/2 cancels the centre; a little < 120 Hz keeps the stadium's body.
    const split = this.ctx.createChannelSplitter(2);
    const l = this.ctx.createGain();
    const r = this.ctx.createGain();
    l.gain.value = 0.5;
    r.gain.value = -0.5;
    const side = this.ctx.createGain();
    side.gain.value = 1.6;
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 120;
    const lowGain = this.ctx.createGain();
    lowGain.gain.value = 0.5;
    this.delay.connect(split);
    split.connect(l, 0);
    split.connect(r, 1);
    l.connect(side);
    r.connect(side);
    side.connect(this.crowdGain);
    this.delay.connect(low).connect(lowGain).connect(this.crowdGain);
    this.crowdGain.connect(this.originalGain);
    // stereo meter (is the stream stereo at all?)
    this.anL = this.ctx.createAnalyser();
    this.anR = this.ctx.createAnalyser();
    this.anL.fftSize = this.anR.fftSize = 2048;
    split.connect(this.anL, 0);
    split.connect(this.anR, 1);
  }

  private fullGain: GainNode;
  private crowdGain: GainNode;
  private anL: AnalyserNode;
  private anR: AnalyserNode;
  originalMode: "full" | "crowd" | "off" = "full";

  /** "full" original · "crowd" = commentary removed (stereo streams) · "off" = voices only. */
  setOriginalMode(mode: "full" | "crowd" | "off") {
    this.originalMode = mode;
    const t = this.ctx.currentTime;
    this.fullGain.gain.setTargetAtTime(mode === "full" ? 1 : 0, t, 0.05);
    this.crowdGain.gain.setTargetAtTime(mode === "crowd" ? 1 : 0, t, 0.05);
  }

  /** width = energy(L−R)/energy(L+R) of the incoming sound; mono streams cannot be split. */
  stereoInfo(): { width: number; mono: boolean; silent: boolean } {
    const a = new Float32Array(this.anL.fftSize);
    const b = new Float32Array(this.anR.fftSize);
    this.anL.getFloatTimeDomainData(a);
    this.anR.getFloatTimeDomainData(b);
    let sl = 0, sr = 0, sd = 0, ss = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i] ?? 0, y = b[i] ?? 0;
      sl += x * x; sr += y * y; sd += (x - y) ** 2; ss += (x + y) ** 2;
    }
    const silent = sl + sr < 1e-7;
    const mono = silent || sr < sl * 1e-3 || sl < sr * 1e-3 || sd < ss * 1e-4;
    return { width: ss > 0 ? sd / ss : 0, mono, silent };
  }

  get sessionId(): string | undefined {
    return this.status.sessionId;
  }

  private set(p: Partial<RelayStatus>) {
    this.status = { ...this.status, ...p };
    this.o.onStatus?.(this.status);
  }

  private url(path: string): string {
    const u = `${this.o.base.replace(/\/$/, "")}${path}`;
    const c = this.o.accessCode;
    return c && path.startsWith("/") ? `${u}${u.includes("?") ? "&" : "?"}code=${encodeURIComponent(c)}` : u;
  }

  async start(): Promise<void> {
    await this.ctx.resume();
    const r = await fetch(this.url("/api/live/sessions"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.o.accessCode ? { "X-Access-Code": this.o.accessCode } : {}) },
      body: JSON.stringify({
        max_speakers: this.o.maxSpeakers,
        view_delay_s: this.o.viewDelay,
        voice_map: this.o.voiceMap && Object.keys(this.o.voiceMap).length ? this.o.voiceMap : undefined,
        label: this.o.label ?? "live",
      }),
    });
    if (!r.ok) {
      const detail = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(typeof detail.detail === "string" ? detail.detail : `engine error ${r.status}`);
    }
    const { session_id, ws_url } = (await r.json()) as { session_id: string; ws_url: string };
    this.set({ sessionId: session_id });
    const wsBase = this.o.base ? this.o.base.replace(/^http/, "ws") : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const code = this.o.accessCode ? `?code=${encodeURIComponent(this.o.accessCode)}` : "";
    const ws = new WebSocket(`${wsBase.replace(/\/$/, "")}${ws_url}${code}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    await new Promise<void>((res, rej) => {
      ws.onopen = () => res();
      ws.onerror = () => rej(new Error("could not connect to the engine WebSocket"));
    });
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      const msg = JSON.parse(ev.data) as ServerMessage;
      this.handle(msg);
      this.o.onMessage?.(msg);
    };
    ws.onclose = () => {
      if (this.status.state === "live") this.set({ state: "ended" });
    };
    ws.send(JSON.stringify({ type: "start" }));

    // capture graph
    await this.ctx.audioWorklet.addModule(this.o.workletUrl);
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm16-downsampler", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: { outRate: 16000, chunkMs: 100 },
    });
    this.node.port.onmessage = (e: MessageEvent) => {
      const d = e.data as ArrayBuffer | { first: number };
      if (d instanceof ArrayBuffer) {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(d);
        this.set({ sentS: this.status.sentS + d.byteLength / 2 / 16000 });
      } else if (typeof d.first === "number" && this.t0 === null) {
        this.t0 = d.first;
      }
    };
    this.src.connect(this.node);
    this.src.connect(this.delay);
    this.set({ state: "live" });
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "ping", t: performance.now() / 1000 }));
    }, 10000);
  }

  /** Context time at which viewer media time τ is heard. */
  ctxTimeOf(mediaT: number): number | null {
    return this.t0 === null ? null : this.t0 + mediaT + this.o.viewDelay;
  }

  /** Viewer media time now (what the delayed picture/audio shows). */
  viewerTime(): number | null {
    return this.t0 === null ? null : this.ctx.currentTime - this.t0 - this.o.viewDelay;
  }

  private handle(msg: ServerMessage) {
    if (msg.type === "audio.ready") {
      if (msg.url.endsWith(".part.wav")) this.playStream(msg.url, msg.play_at_media, msg.duration, msg.line_id);
      else void this.playLine(msg.url, msg.play_at_media, msg.line_id);
    }
    if (msg.type === "session.ended") this.set({ state: "ended" });
  }

  private announce(lineId: string, start: number, duration: number) {
    const ms = Math.max(0, (start - this.ctx.currentTime) * 1000);
    window.setTimeout(() => this.o.onVoiceStart?.(lineId, duration), ms);
  }

  // ---- voice lane: one character voice at a time, never on top of each other -------------
  private lane: Promise<void> = Promise.resolve();
  private laneFreeAt = 0; // ctx time the previous voice ends (exact for files, live for streams)

  private async waitUntil(t: number): Promise<void> {
    while (this.ctx.currentTime < t - 0.008) {
      await new Promise((r) => window.setTimeout(r, Math.min(50, Math.max(4, (t - this.ctx.currentTime) * 1000 - 6))));
    }
  }

  private enqueue(job: () => Promise<void>) {
    this.lane = this.lane.then(job, job).catch(() => undefined);
  }

  private playLine(url: string, playAt: number, lineId = "") {
    const buf = fetch(this.url(url))
      .then((r) => r.arrayBuffer())
      .then((b) => this.ctx.decodeAudioData(b));
    this.enqueue(async () => {
      const when = this.ctxTimeOf(playAt);
      if (when === null) return;
      let audio: AudioBuffer;
      try {
        audio = await buf;
      } catch {
        return; // one bad line never stops the stream
      }
      const start = Math.max(when, this.laneFreeAt + 0.06);
      await this.waitUntil(start - 0.05);
      const at = Math.max(start, this.ctx.currentTime + 0.01);
      if (at - when > 0.3) this.set({ late: this.status.late + 1 });
      const s = this.ctx.createBufferSource();
      s.buffer = audio;
      s.connect(this.voiceGain);
      s.start(at);
      this.laneFreeAt = at + audio.duration;
      this.duck(at, at + audio.duration);
      this.announce(lineId, at, audio.duration);
      this.set({ voiced: this.status.voiced + 1 });
    });
  }

  /** A line still being generated: stream it (starts on the first bytes) instead of waiting for
   *  the whole file. Its real length is unknown, so the lane waits for its `ended` event. */
  private playStream(url: string, playAt: number, durationEst: number, lineId = "") {
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.src = this.url(url);
    const node = this.ctx.createMediaElementSource(el);
    node.connect(this.voiceGain);
    this.enqueue(async () => {
      const when = this.ctxTimeOf(playAt);
      if (when === null) return;
      await this.waitUntil(Math.max(when, this.laneFreeAt + 0.06));
      if (this.ctx.currentTime - when > 0.3) this.set({ late: this.status.late + 1 });
      const ended = new Promise<void>((res) => {
        el.addEventListener("ended", () => res(), { once: true });
        el.addEventListener("error", () => res(), { once: true });
      });
      const t0 = this.ctx.currentTime;
      this.laneFreeAt = t0 + durationEst;
      void el.play().catch(() => undefined);
      this.duck(t0, t0 + durationEst);
      this.o.onVoiceStart?.(lineId, durationEst);
      this.set({ voiced: this.status.voiced + 1 });
      // hold the lane until this voice has really finished (max 4× the estimate as a safety net)
      await Promise.race([ended, new Promise((r) => window.setTimeout(r, Math.max(4000, durationEst * 4000)))]);
      node.disconnect();
      this.laneFreeAt = Math.max(this.ctx.currentTime, 0);
      this.duck(this.ctx.currentTime, this.ctx.currentTime);
    });
  }

  private duck(start: number, end: number) {
    const g = this.originalGain.gain;
    const low = this.origLevel * 0.35;
    const overlapping = start <= this.duckUntil + RELEASE;
    g.cancelScheduledValues(start);
    if (!overlapping) {
      g.setValueAtTime(this.origLevel, start);
      g.linearRampToValueAtTime(low, start + ATTACK);
    } else g.setValueAtTime(low, start);
    const holdEnd = Math.max(end, this.duckUntil);
    g.setValueAtTime(low, holdEnd + 0.15);
    g.linearRampToValueAtTime(this.origLevel, holdEnd + 0.15 + RELEASE);
    this.duckUntil = holdEnd;
  }

  setOriginalLevel(v: number) {
    this.origLevel = v;
    this.originalGain.gain.setTargetAtTime(this.ctx.currentTime < this.duckUntil ? v * 0.35 : v, this.ctx.currentTime, 0.03);
  }

  setVoiceLevel(v: number) {
    this.voiceGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  setVoice(speakerId: string, voiceId: string) {
    this.ws?.send(JSON.stringify({ type: "set_voice", speaker_id: speakerId, voice_id: voiceId }));
  }

  stop() {
    try {
      this.ws?.send(JSON.stringify({ type: "stop" }));
    } catch {
      /* closed already */
    }
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    this.node?.disconnect();
    this.src?.disconnect();
    window.setTimeout(() => {
      this.ws?.close();
      void this.ctx.close();
    }, 1500);
    this.stream.getTracks().forEach((t) => t.stop());
    this.set({ state: "ended" });
  }
}

/** Picture delay for synced mode: the captured video is recorded (VP8, compressed — a few MB per
 *  minute instead of hundreds of MB of raw frames) and played back through Media Source
 *  Extensions D seconds behind, kept in step with the relay's audio clock. */
export class DelayedVideo {
  private recorder: MediaRecorder | null = null;
  private ms = new MediaSource();
  private sb: SourceBuffer | null = null;
  private queue: ArrayBuffer[] = [];
  private recStart: number | null = null; // ctx time when recording started
  private timer: number | null = null;
  waiting = 0; // seconds until the delayed picture starts (countdown)

  constructor(
    private readonly track: MediaStreamTrack,
    private readonly video: HTMLVideoElement,
    private readonly relay: LiveRelay,
    private readonly delay: number,
  ) {}

  static supported(): boolean {
    return typeof MediaSource !== "undefined" && MediaSource.isTypeSupported('video/webm; codecs="vp8"');
  }

  start() {
    this.video.muted = true; // sound comes from the relay (delayed original + voices)
    this.video.src = URL.createObjectURL(this.ms);
    this.ms.addEventListener("sourceopen", () => {
      this.sb = this.ms.addSourceBuffer('video/webm; codecs="vp8"');
      this.sb.mode = "segments";
      this.sb.addEventListener("updateend", () => this.pump());
      this.recorder = new MediaRecorder(new MediaStream([this.track]), {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 3_500_000,
      });
      this.recorder.ondataavailable = async (e) => {
        if (e.data.size) {
          this.queue.push(await e.data.arrayBuffer());
          this.pump();
        }
      };
      this.recorder.onstart = () => {
        this.recStart = this.relay.ctx.currentTime;
      };
      this.recorder.start(200);
    });
    this.timer = window.setInterval(() => this.sync(), 100);
  }

  private pump() {
    if (!this.sb || this.sb.updating || this.queue.length === 0) return;
    const next = this.queue.shift();
    if (!next) return;
    try {
      this.sb.appendBuffer(next);
    } catch {
      // quota: drop old video (> 20 s behind) and retry
      try {
        const keepFrom = Math.max(0, this.video.currentTime - 20);
        if (keepFrom > 1) this.sb.remove(0, keepFrom);
      } catch {
        /* ignore */
      }
      this.queue.unshift(next);
    }
  }

  /** Keep the picture at (relay audio clock − D); count down until the first delayed frame. */
  private sync() {
    if (this.recStart === null) return;
    const target = this.relay.ctx.currentTime - this.recStart - this.delay;
    if (target < 0) {
      this.waiting = -target;
      if (!this.video.paused) this.video.pause();
      return;
    }
    this.waiting = 0;
    const drift = this.video.currentTime - target;
    if (this.video.paused) {
      this.video.currentTime = target;
      void this.video.play().catch(() => undefined);
    } else if (Math.abs(drift) > 1) this.video.currentTime = target;
    else this.video.playbackRate = 1 - Math.max(-0.05, Math.min(0.05, drift * 0.1));
    // trim buffered video older than 30 s
    if (this.sb && !this.sb.updating && this.video.currentTime > 40 && this.queue.length === 0) {
      try {
        this.sb.remove(0, this.video.currentTime - 30);
      } catch {
        /* ignore */
      }
    }
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    try {
      this.recorder?.stop();
    } catch {
      /* ignore */
    }
    this.video.pause();
  }
}
