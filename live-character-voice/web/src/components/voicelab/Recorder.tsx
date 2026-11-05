// Record a voice sample in the browser (microphone) with a live level meter and a reading script.
import { useEffect, useRef, useState } from "react";
import { fmtTime } from "../../ui/kit";

export const SCRIPTS: Record<"instant" | "pro", { mood: string; lines: string[] }[]> = {
  instant: [
    {
      mood: "Read naturally, like you are talking to a friend",
      lines: [
        "Welcome back to the stadium, where the evening light is fading over a packed crowd.",
        "Both teams have started carefully, passing it around and looking for a gap.",
        "And here comes the first real chance of the night — what a run that is!",
      ],
    },
  ],
  pro: [
    {
      mood: "Calm — quiet, relaxed, unhurried",
      lines: [
        "Good evening and welcome along. It is a cool, clear night here at the ground.",
        "The players are going through their final stretches as the stands slowly fill up.",
        "There is no rush in this opening spell; both sides are happy to keep the ball.",
      ],
    },
    {
      mood: "Normal — your everyday commentary voice",
      lines: [
        "He picks it up in midfield, looks left, and plays a neat pass into the channel.",
        "The full back overlaps, the cross comes in, and it is headed away for a corner.",
        "They have had more of the ball, but they are still waiting for that first clear chance.",
        "A quick throw in, a one-two on the edge of the box, and the shot is blocked.",
      ],
    },
    {
      mood: "Excited — loud and energetic, the big moments",
      lines: [
        "He is through on goal! Only the keeper to beat! And he scores! What a finish!",
        "Oh, that is unbelievable! Top corner from thirty yards out!",
        "The whole stadium is on its feet! You will not see a better goal this season!",
      ],
    },
  ],
};

export function Recorder({ mode, onDone }: { mode: "instant" | "pro"; onDone: (f: File) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "denied">("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const timer = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const target = mode === "pro" ? 90 : 20;

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearInterval(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } });
      stream.current = s;
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Float32Array(an.fftSize);
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
        raf.current = requestAnimationFrame(tick);
      };
      tick();
      const r = new MediaRecorder(s);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        cancelAnimationFrame(raf.current);
        window.clearInterval(timer.current);
        s.getTracks().forEach((t) => t.stop());
        void ctx.close();
        const type = r.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onDone(new File(chunks.current, `recording.${ext}`, { type }));
        setState("idle");
      };
      r.start(250);
      rec.current = r;
      setSecs(0);
      const t0 = performance.now();
      timer.current = window.setInterval(() => setSecs((performance.now() - t0) / 1000), 200);
      setState("recording");
    } catch {
      setState("denied");
    }
  };

  const stop = () => rec.current?.stop();

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-56 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/30 p-4 text-[13px] leading-relaxed">
        {SCRIPTS[mode].map((sec) => (
          <div key={sec.mood} className="mb-3 last:mb-0">
            <p className="eyebrow mb-1">{sec.mood}</p>
            {sec.lines.map((l) => (
              <p key={l} className="text-ink/90">“{l}”</p>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {state !== "recording" ? (
          <button type="button" onClick={() => void start()} className="btn-primary !rounded-full !px-5">
            <span className="h-2.5 w-2.5 rounded-full bg-white" /> Start recording
          </button>
        ) : (
          <button type="button" onClick={stop} className="btn !rounded-full bg-peak !px-5 text-white animate-ring">
            <span className="h-2.5 w-2.5 rounded-sm bg-white" /> Stop · {fmtTime(secs)}
          </button>
        )}
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-ok via-accent to-peak transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{state === "recording" ? "listening…" : "mic level"}</span>
            <span>aim for {target}+ s · {mode === "pro" ? "read all three moods" : "one clear voice"}</span>
          </div>
        </div>
      </div>
      {state === "denied" && <p className="text-sm text-peak">Microphone permission was denied — allow it in the browser address bar and try again.</p>}
    </div>
  );
}
