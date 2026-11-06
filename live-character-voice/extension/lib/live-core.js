var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  "use strict";
  const ATTACK = 0.08;
  const RELEASE = 0.35;
  class LiveRelay {
    constructor(stream, o) {
      __publicField(this, "ctx");
      __publicField(this, "ws", null);
      __publicField(this, "src", null);
      __publicField(this, "node", null);
      __publicField(this, "delay");
      __publicField(this, "originalGain");
      __publicField(this, "voiceGain");
      __publicField(this, "origLevel", 0.3);
      __publicField(this, "duckUntil", 0);
      __publicField(this, "t0", null);
      // ctx time of the first captured sample
      __publicField(this, "status", { state: "connecting", sentS: 0, voiced: 0, late: 0 });
      __publicField(this, "pingTimer", null);
      this.stream = stream;
      this.o = o;
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.delay = this.ctx.createDelay(20);
      this.delay.delayTime.value = Math.max(0, o.viewDelay);
      this.originalGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.originalGain.gain.value = this.origLevel;
      this.delay.connect(this.originalGain).connect(this.ctx.destination);
      this.voiceGain.connect(this.ctx.destination);
    }
    get sessionId() {
      return this.status.sessionId;
    }
    set(p) {
      var _a, _b;
      this.status = { ...this.status, ...p };
      (_b = (_a = this.o).onStatus) == null ? void 0 : _b.call(_a, this.status);
    }
    url(path) {
      const u = `${this.o.base.replace(/\/$/, "")}${path}`;
      const c = this.o.accessCode;
      return c && path.startsWith("/") ? `${u}${u.includes("?") ? "&" : "?"}code=${encodeURIComponent(c)}` : u;
    }
    async start() {
      await this.ctx.resume();
      const r = await fetch(this.url("/api/live/sessions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.o.accessCode ? { "X-Access-Code": this.o.accessCode } : {} },
        body: JSON.stringify({
          max_speakers: this.o.maxSpeakers,
          view_delay_s: this.o.viewDelay,
          voice_map: this.o.voiceMap && Object.keys(this.o.voiceMap).length ? this.o.voiceMap : void 0,
          label: this.o.label ?? "live"
        })
      });
      if (!r.ok) {
        const detail = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(typeof detail.detail === "string" ? detail.detail : `engine error ${r.status}`);
      }
      const { session_id, ws_url } = await r.json();
      this.set({ sessionId: session_id });
      const wsBase = this.o.base ? this.o.base.replace(/^http/, "ws") : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
      const code = this.o.accessCode ? `?code=${encodeURIComponent(this.o.accessCode)}` : "";
      const ws = new WebSocket(`${wsBase.replace(/\/$/, "")}${ws_url}${code}`);
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      await new Promise((res, rej) => {
        ws.onopen = () => res();
        ws.onerror = () => rej(new Error("could not connect to the engine WebSocket"));
      });
      ws.onmessage = (ev) => {
        var _a, _b;
        if (typeof ev.data !== "string") return;
        const msg = JSON.parse(ev.data);
        this.handle(msg);
        (_b = (_a = this.o).onMessage) == null ? void 0 : _b.call(_a, msg);
      };
      ws.onclose = () => {
        if (this.status.state === "live") this.set({ state: "ended" });
      };
      ws.send(JSON.stringify({ type: "start" }));
      await this.ctx.audioWorklet.addModule(this.o.workletUrl);
      this.src = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, "pcm16-downsampler", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        processorOptions: { outRate: 16e3, chunkMs: 100 }
      });
      this.node.port.onmessage = (e) => {
        var _a;
        const d = e.data;
        if (d instanceof ArrayBuffer) {
          if (((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN) this.ws.send(d);
          this.set({ sentS: this.status.sentS + d.byteLength / 2 / 16e3 });
        } else if (typeof d.first === "number" && this.t0 === null) {
          this.t0 = d.first;
        }
      };
      this.src.connect(this.node);
      this.src.connect(this.delay);
      this.set({ state: "live" });
      this.pingTimer = window.setInterval(() => {
        var _a;
        if (((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "ping", t: performance.now() / 1e3 }));
      }, 1e4);
    }
    /** Context time at which viewer media time τ is heard. */
    ctxTimeOf(mediaT) {
      return this.t0 === null ? null : this.t0 + mediaT + this.o.viewDelay;
    }
    /** Viewer media time now (what the delayed picture/audio shows). */
    viewerTime() {
      return this.t0 === null ? null : this.ctx.currentTime - this.t0 - this.o.viewDelay;
    }
    handle(msg) {
      if (msg.type === "audio.ready") {
        if (msg.url.endsWith(".part.wav")) this.playStream(msg.url, msg.play_at_media, msg.duration, msg.line_id);
        else void this.playLine(msg.url, msg.play_at_media, msg.line_id);
      }
      if (msg.type === "session.ended") this.set({ state: "ended" });
    }
    announce(lineId, start, duration) {
      const ms = Math.max(0, (start - this.ctx.currentTime) * 1e3);
      window.setTimeout(() => {
        var _a, _b;
        return (_b = (_a = this.o).onVoiceStart) == null ? void 0 : _b.call(_a, lineId, duration);
      }, ms);
    }
    async playLine(url, playAt, lineId = "") {
      try {
        const res = await fetch(this.url(url));
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        const when = this.ctxTimeOf(playAt);
        if (when === null) return;
        const now = this.ctx.currentTime;
        const start = Math.max(when, now + 0.02);
        if (start - when > 0.3) this.set({ late: this.status.late + 1 });
        const s = this.ctx.createBufferSource();
        s.buffer = buf;
        s.connect(this.voiceGain);
        s.start(start);
        this.duck(start, start + buf.duration);
        this.announce(lineId, start, buf.duration);
        this.set({ voiced: this.status.voiced + 1 });
      } catch {
      }
    }
    /** A line still being generated: stream it (starts on the first bytes) instead of waiting for
     *  the whole file; started by the audio clock so it lines up with the delayed original. */
    playStream(url, playAt, durationEst, lineId = "") {
      const when = this.ctxTimeOf(playAt);
      if (when === null) return;
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.src = this.url(url);
      const node = this.ctx.createMediaElementSource(el);
      node.connect(this.voiceGain);
      el.addEventListener("ended", () => node.disconnect());
      const go = () => {
        var _a, _b;
        const late = this.ctx.currentTime - when;
        if (late > 0.3) this.set({ late: this.status.late + 1 });
        void el.play().catch(() => void 0);
        this.duck(this.ctx.currentTime, this.ctx.currentTime + durationEst);
        (_b = (_a = this.o).onVoiceStart) == null ? void 0 : _b.call(_a, lineId, durationEst);
        this.set({ voiced: this.status.voiced + 1 });
      };
      const wait = () => this.ctx.currentTime >= when - 0.01 ? go() : window.setTimeout(wait, 10);
      wait();
    }
    duck(start, end) {
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
    setOriginalLevel(v) {
      this.origLevel = v;
      this.originalGain.gain.setTargetAtTime(this.ctx.currentTime < this.duckUntil ? v * 0.35 : v, this.ctx.currentTime, 0.03);
    }
    setVoiceLevel(v) {
      this.voiceGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
    }
    setVoice(speakerId, voiceId) {
      var _a;
      (_a = this.ws) == null ? void 0 : _a.send(JSON.stringify({ type: "set_voice", speaker_id: speakerId, voice_id: voiceId }));
    }
    stop() {
      var _a, _b, _c;
      try {
        (_a = this.ws) == null ? void 0 : _a.send(JSON.stringify({ type: "stop" }));
      } catch {
      }
      if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
      (_b = this.node) == null ? void 0 : _b.disconnect();
      (_c = this.src) == null ? void 0 : _c.disconnect();
      window.setTimeout(() => {
        var _a2;
        (_a2 = this.ws) == null ? void 0 : _a2.close();
        void this.ctx.close();
      }, 1500);
      this.stream.getTracks().forEach((t) => t.stop());
      this.set({ state: "ended" });
    }
  }
  class DelayedVideo {
    // seconds until the delayed picture starts (countdown)
    constructor(track, video, relay, delay) {
      __publicField(this, "recorder", null);
      __publicField(this, "ms", new MediaSource());
      __publicField(this, "sb", null);
      __publicField(this, "queue", []);
      __publicField(this, "recStart", null);
      // ctx time when recording started
      __publicField(this, "timer", null);
      __publicField(this, "waiting", 0);
      this.track = track;
      this.video = video;
      this.relay = relay;
      this.delay = delay;
    }
    static supported() {
      return typeof MediaSource !== "undefined" && MediaSource.isTypeSupported('video/webm; codecs="vp8"');
    }
    start() {
      this.video.muted = true;
      this.video.src = URL.createObjectURL(this.ms);
      this.ms.addEventListener("sourceopen", () => {
        this.sb = this.ms.addSourceBuffer('video/webm; codecs="vp8"');
        this.sb.mode = "segments";
        this.sb.addEventListener("updateend", () => this.pump());
        this.recorder = new MediaRecorder(new MediaStream([this.track]), {
          mimeType: "video/webm;codecs=vp8",
          videoBitsPerSecond: 35e5
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
    pump() {
      if (!this.sb || this.sb.updating || this.queue.length === 0) return;
      const next = this.queue.shift();
      if (!next) return;
      try {
        this.sb.appendBuffer(next);
      } catch {
        try {
          const keepFrom = Math.max(0, this.video.currentTime - 20);
          if (keepFrom > 1) this.sb.remove(0, keepFrom);
        } catch {
        }
        this.queue.unshift(next);
      }
    }
    /** Keep the picture at (relay audio clock − D); count down until the first delayed frame. */
    sync() {
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
        void this.video.play().catch(() => void 0);
      } else if (Math.abs(drift) > 1) this.video.currentTime = target;
      else this.video.playbackRate = 1 - Math.max(-0.05, Math.min(0.05, drift * 0.1));
      if (this.sb && !this.sb.updating && this.video.currentTime > 40 && this.queue.length === 0) {
        try {
          this.sb.remove(0, this.video.currentTime - 30);
        } catch {
        }
      }
    }
    stop() {
      var _a;
      if (this.timer !== null) window.clearInterval(this.timer);
      try {
        (_a = this.recorder) == null ? void 0 : _a.stop();
      } catch {
      }
      this.video.pause();
    }
  }
  window.LCV = { LiveRelay, DelayedVideo };
})();
