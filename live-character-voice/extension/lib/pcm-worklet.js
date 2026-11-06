// AudioWorklet: captured audio → mono 16 kHz PCM16 chunks for the engine (live input).
// Posts {first: <ctx seconds of the first captured sample>} once, then ArrayBuffers of Int16 PCM.
class Pcm16Downsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.outRate = o.outRate || 16000;
    this.chunk = Math.round(this.outRate * ((o.chunkMs || 100) / 1000));
    this.ratio = sampleRate / this.outRate;
    this.pos = 0; // fractional read position into the incoming stream (input samples)
    this.prev = 0; // last input sample of the previous block (for interpolation)
    this.acc = 0; // low-pass state
    this.buf = new Int16Array(this.chunk);
    this.n = 0;
    this.started = false;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0]) return true;
    if (!this.started) {
      this.started = true;
      this.port.postMessage({ first: currentFrame / sampleRate });
    }
    const len = input[0].length;
    const mono = new Float32Array(len);
    for (let c = 0; c < input.length; c++) {
      const ch = input[c];
      for (let i = 0; i < len; i++) mono[i] += ch[i] / input.length;
    }
    // one-pole low-pass at ~7 kHz before decimation (keeps speech, removes aliasing)
    const a = Math.exp((-2 * Math.PI * 7000) / sampleRate);
    for (let i = 0; i < len; i++) {
      this.acc = (1 - a) * mono[i] + a * this.acc;
      mono[i] = this.acc;
    }
    // linear-interpolation resampler (works for 44.1 k and 48 k)
    while (this.pos < len) {
      const i0 = Math.floor(this.pos);
      const frac = this.pos - i0;
      const s0 = i0 - 1 < 0 ? this.prev : mono[i0 - 1];
      const s1 = mono[i0];
      const v = s0 + (s1 - s0) * frac;
      this.buf[this.n++] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
      if (this.n === this.chunk) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
        this.buf = new Int16Array(this.chunk);
        this.n = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= len;
    this.prev = mono[len - 1];
    return true;
  }
}

registerProcessor("pcm16-downsampler", Pcm16Downsampler);
