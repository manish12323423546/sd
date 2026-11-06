import type { Metrics, Status } from "../store/session";

function mmss(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Felt delay = when the new voice starts vs when the original line started (viewer's timeline). */
export function DelayHud({ status, mediaTime, metrics, synced = false }: { status: Status; mediaTime: number; metrics: Metrics; synced?: boolean }) {
  const tone = metrics.p50 <= 0.5 ? "text-ok" : metrics.p50 <= 2 ? "text-accent" : "text-excited";
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-sm" data-testid="delay-hud">
      <span className="text-ink">{mmss(mediaTime)}</span>
      {status !== "live" && <span className="uppercase text-muted">{status}</span>}
      <span title="How long after the commentator starts a line its new voice starts (median; 95 % of lines within p95)">
        felt delay <b className={tone}>{metrics.p50.toFixed(1)} s</b>{" "}
        <span className="text-muted">(p95 {metrics.p95.toFixed(1)}{synced ? " · synced" : " · live"})</span>
      </span>
    </div>
  );
}
