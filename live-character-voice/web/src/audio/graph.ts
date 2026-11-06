// Web Audio graph (docs/07 §7.4):
//   <video> → MediaElementSource → originalGain ┐
//   TTS AudioBuffer → BufferSource → voiceGain ─┴→ destination
// Voice lines are pre-loaded on `audio.ready`, scheduled at the AudioContext time that matches
// play_at_media, and duck the original while they play.
import { ATTACK_S, DUCK_FACTOR, RELEASE_DELAY_S, RELEASE_S } from "./ducking";
import { planStart, type StartPlan } from "./scheduler";

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
  private pendingStreams: { when: number; el: HTMLAudioElement; onStart?: () => void }[] = [];
  private streamTimer: number | null = null;

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

  /** Schedule a decoded line relative to the video clock. Returns the plan (late flag). */
  schedule(buffer: AudioBuffer, playAtMedia: number, video: HTMLVideoElement, onStart?: () => void): StartPlan {
    const plan = planStart(playAtMedia, video.currentTime, this.ctx.currentTime, video.playbackRate || 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.voiceGain);
    src.start(plan.when);
    if (onStart) {
      const delayMs = Math.max(0, (plan.when - this.ctx.currentTime) * 1000);
      window.setTimeout(onStart, delayMs);
    }
    this.duck(plan.when, plan.when + buffer.duration);
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
    // started by the audio clock (not a wall-clock timer) so a pause holds it back too
    this.pendingStreams.push({ when: plan.when, el, onStart });
    this.pumpStreams();
    el.addEventListener("ended", () => {
      node.disconnect();
      this.streams.delete(el);
    });
    this.duck(plan.when, plan.when + durationEst);
    return plan;
  }

  private pumpStreams(): void {
    if (this.streamTimer !== null) return;
    this.streamTimer = window.setInterval(() => {
      if (this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const due = this.pendingStreams.filter((p) => p.when <= now + 0.01);
      this.pendingStreams = this.pendingStreams.filter((p) => p.when > now + 0.01);
      for (const p of due) {
        this.streams.add(p.el);
        void p.el.play().then(() => p.onStart?.()).catch(() => undefined);
      }
      if (this.pendingStreams.length === 0 && this.streamTimer !== null) {
        window.clearInterval(this.streamTimer);
        this.streamTimer = null;
      }
    }, 15);
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
