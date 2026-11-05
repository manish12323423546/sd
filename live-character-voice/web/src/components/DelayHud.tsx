import type { Metrics, Status } from "../store/session";

function mmss(t: number): string {
  const s = Math.max(0, Math.floor(t));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function DelayHud({ status, mediaTime, metrics }: { status: Status; mediaTime: number; metrics: Metrics }) {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-sm" data-testid="delay-hud">
      <span>{mmss(mediaTime)}</span>
      {status === "live" ? (
        <span className="flex items-center gap-1 text-peak">
          LIVE <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-peak" />
        </span>
      ) : (
        <span className="uppercase text-muted">{status}</span>
      )}
      <span>
        delay <b>{metrics.last.toFixed(1)} s</b> <span className="text-muted">(p50 {metrics.p50.toFixed(1)} · p95 {metrics.p95.toFixed(1)})</span>
      </span>
      <span className="text-muted">lines {metrics.lines} · dropped {metrics.dropped}</span>
    </div>
  );
}
