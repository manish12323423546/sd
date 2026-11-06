interface Props {
  points: { t: number; d: number }[];
  width?: number;
  height?: number;
  target?: number;
}

/** Delay sparkline (last 2 minutes). Inline SVG, no chart library. */
export function Sparkline({ points, width = 320, height = 64, target = 4 }: Props) {
  if (points.length < 2) {
    return <div className="text-xs text-muted" style={{ height }}>waiting for delay data…</div>;
  }
  const t0 = points[0]?.t ?? 0;
  const t1 = points[points.length - 1]?.t ?? t0;
  const maxD = Math.max(target * 1.5, ...points.map((p) => p.d));
  const x = (t: number) => ((t - t0) / Math.max(1e-6, t1 - t0)) * (width - 4) + 2;
  const y = (d: number) => height - 2 - (d / maxD) * (height - 4);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.d).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Delay over the last two minutes">
      <line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke="#34D399" strokeDasharray="4 4" strokeWidth={1} />
      <path d={path} fill="none" stroke="#7C5CFF" strokeWidth={2} />
    </svg>
  );
}
