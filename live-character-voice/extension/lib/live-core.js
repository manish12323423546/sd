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
      __publicField(this, "fullGain");
      __publicField(this, "crowdGain");
      __publicField(this, "anL");
      __publicField(this, "anR");
      __publicField(this, "originalMode", "full");
      // ---- voice lane: one character voice at a time, never on top of each other -------------
      __publicField(this, "lane", Promise.resolve());
      __publicField(this, "laneFreeAt", 0);
      this.stream = stream;
      this.o = o;
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.delay = this.ctx.createDelay(20);
      this.delay.delayTime.value = Math.max(0, o.viewDelay);
      this.originalGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.originalGain.gain.value = this.origLevel;
      this.originalGain.connect(this.ctx.destination);
      this.voiceGain.connect(this.ctx.destination);
      this.fullGain = this.ctx.createGain();
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.value = 0;
      this.delay.connect(this.fullGain).connect(this.originalGain);
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
      this.anL = this.ctx.createAnalyser();
      this.anR = this.ctx.createAnalyser();
      this.anL.fftSize = this.anR.fftSize = 2048;
      split.connect(this.anL, 0);
      split.connect(this.anR, 1);
    }
    /** "full" original · "crowd" = commentary removed (stereo streams) · "off" = voices only. */
    setOriginalMode(mode) {
      this.originalMode = mode;
      const t = this.ctx.currentTime;
      this.fullGain.gain.setTargetAtTime(mode === "full" ? 1 : 0, t, 0.05);
      this.crowdGain.gain.setTargetAtTime(mode === "crowd" ? 1 : 0, t, 0.05);
    }
    /** width = energy(L−R)/energy(L+R) of the incoming sound; mono streams cannot be split. */
    stereoInfo() {
      const a = new Float32Array(this.anL.fftSize);
      const b = new Float32Array(this.anR.fftSize);
      this.anL.getFloatTimeDomainData(a);
      this.anR.getFloatTimeDomainData(b);
      let sl = 0, sr = 0, sd = 0, ss = 0;
      for (let i = 0; i < a.length; i++) {
        const x = a[i] ?? 0, y = b[i] ?? 0;
        sl += x * x;
        sr += y * y;
        sd += (x - y) ** 2;
        ss += (x + y) ** 2;
      }
      const silent = sl + sr < 1e-7;
      const mono = silent || sr < sl * 1e-3 || sl < sr * 1e-3 || sd < ss * 1e-4;
      return { width: ss > 0 ? sd / ss : 0, mono, silent };
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
    // ctx time the previous voice ends (exact for files, live for streams)
    async waitUntil(t) {
      while (this.ctx.currentTime < t - 8e-3) {
        await new Promise((r) => window.setTimeout(r, Math.min(50, Math.max(4, (t - this.ctx.currentTime) * 1e3 - 6))));
      }
    }
    enqueue(job) {
      this.lane = this.lane.then(job, job).catch(() => void 0);
    }
    playLine(url, playAt, lineId = "") {
      const buf = fetch(this.url(url)).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b));
      this.enqueue(async () => {
        const when = this.ctxTimeOf(playAt);
        if (when === null) return;
        let audio;
        try {
          audio = await buf;
        } catch {
          return;
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
    playStream(url, playAt, durationEst, lineId = "") {
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.src = this.url(url);
      const node = this.ctx.createMediaElementSource(el);
      node.connect(this.voiceGain);
      this.enqueue(async () => {
        var _a, _b;
        const when = this.ctxTimeOf(playAt);
        if (when === null) return;
        await this.waitUntil(Math.max(when, this.laneFreeAt + 0.06));
        if (this.ctx.currentTime - when > 0.3) this.set({ late: this.status.late + 1 });
        const ended = new Promise((res) => {
          el.addEventListener("ended", () => res(), { once: true });
          el.addEventListener("error", () => res(), { once: true });
        });
        const t0 = this.ctx.currentTime;
        this.laneFreeAt = t0 + durationEst;
        void el.play().catch(() => void 0);
        this.duck(t0, t0 + durationEst);
        (_b = (_a = this.o).onVoiceStart) == null ? void 0 : _b.call(_a, lineId, durationEst);
        this.set({ voiced: this.status.voiced + 1 });
        await Promise.race([ended, new Promise((r) => window.setTimeout(r, Math.max(4e3, durationEst * 4e3)))]);
        node.disconnect();
        this.laneFreeAt = Math.max(this.ctx.currentTime, 0);
        this.duck(this.ctx.currentTime, this.ctx.currentTime);
      });
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
