import type { Emotion } from "../types/protocol";

const COLORS: Record<Emotion, string> = {
  calm: "bg-calm/20 text-calm border-calm/50",
  neutral: "bg-neutral/20 text-neutral border-neutral/50",
  excited: "bg-excited/20 text-excited border-excited/50",
  peak: "bg-peak/20 text-peak border-peak/50",
};

// Colour is never the only signal: the chip always carries the word (docs/07 §7.7).
export function EmotionChip({ emotion }: { emotion: Emotion | null | undefined }) {
  if (!emotion) return <span className="text-xs text-muted">—</span>;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase ${COLORS[emotion]}`}>
      {emotion}
    </span>
  );
}

/** ▮▮▮▯ meter from arousal (−2 … 3). */
export function ArousalMeter({ arousal }: { arousal: number | undefined }) {
  const a = arousal ?? 0;
  const filled = a < -0.5 ? 1 : a < 0.8 ? 2 : a < 1.8 ? 3 : 4;
  return (
    <span aria-label={`intensity ${filled} of 4`} className="font-mono tracking-tight text-muted">
      {"▮".repeat(filled)}
      {"▯".repeat(4 - filled)}
    </span>
  );
}
