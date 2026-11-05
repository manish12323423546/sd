// Decodes a chosen file in the browser and draws its waveform (with the duration).
import { useEffect, useRef, useState } from "react";

export function useDecodedDuration(file: File | null): { peaks: number[]; duration: number; error: string | null } {
  const [state, setState] = useState<{ peaks: number[]; duration: number; error: string | null }>({ peaks: [], duration: 0, error: null });
  useEffect(() => {
    if (!file) {
      setState({ peaks: [], duration: 0, error: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(await file.arrayBuffer());
        void ctx.close();
        const data = buf.getChannelData(0);
        const n = 160;
        const step = Math.max(1, Math.floor(data.length / n));
        const peaks: number[] = [];
        for (let i = 0; i < n; i++) {
          let m = 0;
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) m = Math.max(m, Math.abs(data[j] ?? 0));
          peaks.push(m);
        }
        const max = Math.max(...peaks, 1e-3);
        if (!cancelled) setState({ peaks: peaks.map((p) => p / max), duration: buf.duration, error: null });
      } catch {
        if (!cancelled) setState({ peaks: [], duration: 0, error: "preview not available for this format (the server can still read it)" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);
  return state;
}

export function Waveform({ peaks, highlight }: { peaks: number[]; highlight?: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const bw = w / Math.max(1, peaks.length);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#4FA3FF");
    grad.addColorStop(1, "#8B6CFF");
    peaks.forEach((p, i) => {
      const frac = i / peaks.length;
      const inside = !highlight || (frac >= highlight[0] && frac <= highlight[1]);
      g.fillStyle = inside ? grad : "rgba(255,255,255,.15)";
      const bh = Math.max(2, p * (h - 4));
      g.beginPath();
      g.roundRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh, 2);
      g.fill();
    });
  }, [peaks, highlight]);
  return <canvas ref={ref} className="h-16 w-full" aria-hidden />;
}
