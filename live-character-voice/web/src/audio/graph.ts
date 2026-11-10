// Web Audio graph (docs/07 §7.4):
//   <video> → MediaElementSource → originalGain ┐
//   TTS AudioBuffer → BufferSource → voiceGain ─┴→ destination
// Voice lines are pre-loaded on `audio.ready`, scheduled at the AudioContext time that matches
// play_at_media, and duck the original while they play.
import { ATTACK_S, DUCK_FACTOR, RELEASE_DELAY_S, RELEASE_S } from "./ducking";
import { planStart, VoiceLane, type StartPlan } from "./scheduler";

interface Queued {
  when: number;
  duration: number;
  buffer?: AudioBuffer;
  el?: HTMLAudioElement;
  onStart?: () => void;
}

export class AudioGraph {
  readonly ctx: AudioContext;
  readonly originalGain: GainNode;
  readonly voiceGain: GainNode;
  private source: MediaElementAudioSourceNode | null = null;
  private level = 0.25;
  private ducking = true;
  private activeUntil = 0; // ctx time until which a voice line is playing
  private cache = new Map<string, Promise<AudioBuffer>>();
  private streams = new Set<HTMLAudioElement>(); // streamed lines that started playing
  private queue: Queued[] = []; // voice lines waiting for their moment and a free lane
  private lane = new VoiceLane();
  /** actual start/end (audio-clock seconds) of every voice line played — for the overlap check */
  readonly played: { start: number; end: number | null }[] = [];
  private streamTimer: number | null = null;
  private streamLog = new Map<HTMLAudioElement, { start: number; end: number | null }>();

  constructor() {
    this.ctx = new AudioContext();
    this.originalGain = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();
    this.originalGain.connect(this.ctx.destination);
    this.voiceGain.connect(this.ctx.destination);
    this.originalGain.gain.value = this.level;
  }

  attachVideo(video: HTMLVideoElement): void {
    if (this.source) return;
    this.source = this.ctx.createMediaElementSource(video);
    this.source.connect(this.originalGain);
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.streams.forEach((el) => void el.play().catch(() => undefined));
  }

  /** Pause everything: the audio clock stops, so scheduled lines wait with the picture. */
  async suspend(): Promise<void> {
    this.streams.forEach((el) => el.pause());
    if (this.ctx.state === "running") await this.ctx.suspend();
  }

  setOriginalLevel(level: number): void {
    this.level = level;
    const now = this.ctx.currentTime;
    const ducked = this.ducking && now < this.activeUntil;
    this.originalGain.gain.cancelScheduledValues(now);
    this.originalGain.gain.setTargetAtTime(ducked ? level * DUCK_FACTOR : level, now, 0.02);
  }

  setVoiceLevel(level: number): void {
    this.voiceGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
  }

  setDucking(on: boolean): void {
    this.ducking = on;
    this.setOriginalLevel(this.level);
  }

  /** Fetch + decode now so the line can start exactly on time. */
  preload(url: string): Promise<AudioBuffer> {
    let p = this.cache.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`audio ${r.status}`);
          return r.arrayBuffer();
        })
        .then((b) => this.ctx.decodeAudioData(b));
      this.cache.set(url, p);
    }
    return p;
  }

  /** Schedule a decoded line relative to the video clock. Returns the plan (late flag).
   *  Lines go through one lane, so a voice never starts on top of the previous one. */
  schedule(buffer: AudioBuffer, playAtMedia: number, video: HTMLVideoElement, onStart?: () => void): StartPlan {
    const plan = planStart(playAtMedia, video.currentTime, this.ctx.currentTime, video.playbackRate || 1);
    this.queue.push({ when: plan.when, duration: buffer.duration, buffer, onStart });
    this.pump();
    return plan;
  }

  /** Streamed line (still being generated on the server): an <audio> element starts playing as
   *  soon as data arrives; routed through voiceGain and ducking like any other line. */
  playStream(
    url: string,
    playAtMedia: number,
    durationEst: number,
    video: HTMLVideoElement,
    onStart?: () => void,
  ): StartPlan {
    const plan = planStart(playAtMedia, video.currentTime, this.ctx.currentTime, video.playbackRate || 1);
    const el = new Audio();
    el.crossOrigin = "anonymous"; // engine may be on another host (hosted app)
    el.preload = "auto";
    el.src = url;
    const node = this.ctx.createMediaElementSource(el);
    node.connect(this.voiceGain);
    const done = () => {
      node.disconnect();
      if (!this.streams.delete(el)) return;
      this.lane.closeOpen(this.ctx.currentTime);
      const rec = this.streamLog.get(el);
      if (rec) rec.end = this.ctx.currentTime;
    };
    el.addEventListener("ended", done);
    el.addEventListener("error", done);
    this.queue.push({ when: plan.when, duration: durationEst, el, onStart });
    this.pump();
    return plan;
  }

  /** Start queued lines by the audio clock (not a wall-clock timer, so a pause holds them too):
   *  the earliest line starts when its moment has come AND the previous voice has finished. */
  private pump(): void {
    this.step();
    if (this.streamTimer !== null || this.queue.length === 0) return;
    this.streamTimer = window.setInterval(() => {
      this.step();
      if (this.queue.length === 0 && this.streamTimer !== null) {
        window.clearInterval(this.streamTimer);
        this.streamTimer = null;
      }
    }, 15);
  }

  private step(): void {
    if (this.ctx.state !== "running") return;
    this.queue.sort((a, b) => a.when - b.when);
    for (;;) {
      const head = this.queue[0];
      if (!head) return;
      const now = this.ctx.currentTime;
      const at = this.lane.startTime(head.when, now);
      // buffers can be handed to the audio clock a little early (sample-exact start);
      // streams start "now", so wait until their moment
      if (at === null || at > now + (head.buffer ? 0.05 : 0.01)) return;
      this.queue.shift();
      if (head.buffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = head.buffer;
        src.connect(this.voiceGain);
        src.start(at);
        this.lane.occupy(at, head.duration);
        this.played.push({ start: at, end: at + head.duration });
        if (head.onStart) window.setTimeout(head.onStart, Math.max(0, (at - now) * 1000));
      } else if (head.el) {
        const el = head.el;
        this.streams.add(el);
        this.lane.open(now, head.duration * 2 + 4);
        const rec = { start: now, end: null };
        this.played.push(rec);
        this.streamLog.set(el, rec);
        void el.play().then(() => head.onStart?.()).catch(() => undefined);
      }
      this.duck(at, at + head.duration);
    }
  }

  /** Ramp the original down for [start, end] (+150 ms hold), merging with lines already playing. */
  private duck(start: number, end: number): void {
    if (!this.ducking) {
      this.activeUntil = Math.max(this.activeUntil, end);
      return;
    }
    const g = this.originalGain.gain;
    const ducked = this.level * DUCK_FACTOR;
    const overlapping = start <= this.activeUntil + RELEASE_DELAY_S;
    const holdEnd = Math.max(end, this.activeUntil);
    g.cancelScheduledValues(start);
    if (!overlapping) {
      g.setValueAtTime(this.level, start);
      g.linearRampToValueAtTime(ducked, start + ATTACK_S);
    } else {
      g.setValueAtTime(ducked, start);
    }
    g.setValueAtTime(ducked, holdEnd + RELEASE_DELAY_S);
    g.linearRampToValueAtTime(this.level, holdEnd + RELEASE_DELAY_S + RELEASE_S);
    this.activeUntil = holdEnd;
  }

  /** Preview a voice through voiceGain (does not duck). */
  async preview(url: string): Promise<void> {
    await this.resume();
    const buf = await this.preload(url);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceGain);
    src.start();
  }

  close(): void {
    if (this.streamTimer !== null) window.clearInterval(this.streamTimer);
    this.streams.forEach((el) => el.pause());
    void this.ctx.close();
  }
}
