import type { Levels } from "../store/session";

interface Props {
  levels: Levels;
  onChange: (patch: Partial<Levels>) => void;
}

export function Controls({ levels, onChange }: Props) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-[180px_1fr_48px] sm:items-center">
      <label htmlFor="orig">Original commentary</label>
      <input id="orig" type="range" min={0} max={1} step={0.05} value={levels.original}
        onChange={(e) => onChange({ original: Number(e.target.value) })} />
      <span className="font-mono text-muted">{Math.round(levels.original * 100)}%</span>
      <label htmlFor="voice">Character voices</label>
      <input id="voice" type="range" min={0} max={1.5} step={0.05} value={levels.voice}
        onChange={(e) => onChange({ voice: Number(e.target.value) })} />
      <span className="font-mono text-muted">{Math.round(levels.voice * 100)}%</span>
      <label htmlFor="duck">Ducking</label>
      <input id="duck" type="checkbox" className="h-4 w-4 justify-self-start accent-accent" checked={levels.ducking}
        onChange={(e) => onChange({ ducking: e.target.checked })} />
      <span className="font-mono text-muted">{levels.ducking ? "on" : "off"}</span>
    </div>
  );
}
