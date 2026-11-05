import type { LineView, SpeakerView } from "../store/session";
import { EmotionChip } from "./EmotionChip";

function clock(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  lines: LineView[];
  speakers: Record<string, SpeakerView>;
}

// Newest at top (the store keeps newest first), so it "auto-scrolls" without jumping.
export function Transcript({ lines, speakers }: Props) {
  return (
    <ol className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1" aria-live="polite" data-testid="transcript">
      {lines.length === 0 && <li className="text-sm text-muted">Lines appear here as they are spoken…</li>}
      {lines.map((l) => {
        const sp = l.speakerId ? speakers[l.speakerId] : undefined;
        return (
          <li key={l.lineId} className="grid grid-cols-[44px_1fr_auto] items-start gap-2 animate-rise rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
            <span className="font-mono text-xs text-muted">{clock(l.tStart)}</span>
            <span>
              <span className="mr-1 font-semibold" style={{ color: sp?.color }}>
                {l.speakerId ?? "?"}
              </span>
              <EmotionChip emotion={l.emotion} /> <span className="ml-1">“{l.text}”</span>
              {l.action && l.action !== "none" && <span className="ml-1 text-xs text-muted">[{l.action}]</span>}
              {l.late && <span className="ml-1 text-xs text-peak">[late]</span>}
            </span>
            <span className="font-mono text-xs text-muted">{l.delay !== undefined ? `${l.delay.toFixed(1)} s` : "…"}</span>
          </li>
        );
      })}
    </ol>
  );
}
