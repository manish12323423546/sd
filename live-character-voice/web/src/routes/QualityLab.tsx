// Quality Lab: run a scored test in the app and see MEASURED results (never estimates).
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Clip } from "../net/api";
import { apiFetch } from "../net/base";

interface Run {
  session_id: string;
  clip: string;
  view_delay_s: number | null;
  felt_p50: number | null;
  felt_p95: number | null;
  felt_max: number | null;
  on_time: number | null;
  lines: number | null;
  voiced: number | null;
  actions?: Record<string, number>;
  asr_by?: Record<string, number>;
  wer: number | null;
  speaker_accuracy: number | null;
  speaker_two_pass?: number | null;
  emotion_exact: number | null;
  emotion_within_one: number | null;
  spoken_wer?: number | null;
  spoken_deletions?: number | null;
  ref_words?: number | null;
  missing_words?: string[];
  crashes?: number | null;
  commit?: string;
  finished?: string;
  live_input?: boolean;
  partial?: boolean;
}
interface Running {
  session_id: string;
  clip: string;
  stage: string;
  media_t?: number;
  duration?: number | null;
  elapsed_s: number;
}

const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? "–" : `${(x * 100).toFixed(d)}%`);
const sec = (x: number | null | undefined) => (x === null || x === undefined ? "–" : `${x.toFixed(2)} s`);

// targets used to colour results (same as the reports)
function tone(ok: boolean | null): string {
  return ok === null ? "text-muted" : ok ? "text-ok" : "text-excited";
}

export function QualityLab() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [clip, setClip] = useState("");
  const [mode, setMode] = useState<"synced" | "live">("synced");
  const [running, setRunning] = useState<Running[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sessions, setSessions] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await (await apiFetch("/api/lab/runs")).json();
    setRunning(r.running);
    setRuns(r.runs);
    setSessions(await (await apiFetch("/api/lab/sessions")).json());
  }, []);

  useEffect(() => {
    void api.clips().then((c) => {
      const scored = c.filter((x) => x.has_truth);
      setClips(scored);
      setClip((cur) => cur || scored[0]?.clip_id || "");
    });
    void load();
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
  }, [load]);

  const start = async () => {
    setError(null);
    const r = await apiFetch("/api/lab/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_id: clip, view_delay_s: mode === "synced" ? 6 : 0 }),
    });
    if (!r.ok) setError(((await r.json().catch(() => ({}))) as { detail?: string }).detail ?? `error ${r.status}`);
    void load();
  };

  const latest = runs[0];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <section className="rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#0f1a2c] via-[#0c111b] to-[#13201a] p-6 sm:p-8">
        <p className="eyebrow">Quality Lab</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl"><span className="gradient-text">Measured, not guessed.</span></h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          A test plays a match whose exact script is known through the <b className="text-ink">same live pipeline viewers use</b>, at real speed.
          Then every generated voice line is listened to again by a second speech model and compared word by word with the script. Delay is
          measured from each original line's start to its voice's start. Nothing here is estimated.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="panel flex flex-col gap-4 p-5" data-testid="lab-setup">
          <h2 className="font-display text-lg font-semibold">Run a test</h2>
          <label className="flex flex-col gap-1.5 text-sm">
            Scored clip
            <select className="field" value={clip} onChange={(e) => setClip(e.target.value)} aria-label="Scored clip">
              {clips.map((c) => <option key={c.clip_id} value={c.clip_id}>{c.name} ({Math.round(c.duration)} s)</option>)}
            </select>
          </label>
          {clips.length === 0 && <p className="text-xs text-excited">No scored clips yet — the server creates them on its first start (a few minutes).</p>}
          <div className="grid grid-cols-2 gap-2">
            {(["synced", "live"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                className={`rounded-xl border p-2.5 text-sm font-semibold ${mode === m ? "border-accent/70 bg-accent/10" : "border-white/10 text-muted"}`}>
                {m === "synced" ? "Synced (6 s)" : "Live"}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary !py-3" disabled={!clip || running.length > 0} onClick={() => void start()} data-testid="lab-start">
            {running.length ? "Test running…" : "▶ Run accuracy test"}
          </button>
          {error && <p className="text-sm text-peak" role="alert">{error}</p>}
          <p className="text-xs text-muted">Takes the clip's length (≈2–3 min) plus ≈1 min of scoring. Only one session can run at a time on this server.</p>
          {running.map((r) => (
            <div key={r.session_id} className="animate-rise rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm" data-testid="lab-running">
              <div className="flex justify-between"><b>{r.clip}</b><span className="font-mono text-xs">{Math.round(r.elapsed_s)} s</span></div>
              <div className="mt-1 text-xs text-muted">{r.stage}{r.media_t ? ` · ${Math.round(r.media_t)} s${r.duration ? ` / ${Math.round(r.duration)} s` : ""}` : ""}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-violet" style={{ width: `${r.duration && r.media_t ? Math.min(100, (r.media_t / r.duration) * 100) : 8}%` }} />
              </div>
              <Link to={`/session/${r.session_id}`} className="mt-2 inline-block text-xs text-accent underline">Watch and listen to it live →</Link>
            </div>
          ))}
        </section>

        <section className="panel p-5" data-testid="lab-latest">
          <h2 className="mb-4 font-display text-lg font-semibold">Latest result {latest && <span className="text-sm font-normal text-muted">· {latest.clip} · {latest.finished}</span>}</h2>
          {!latest && <p className="text-sm text-muted">No test yet — run one.</p>}
          {latest && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Big label="Felt delay (median)" value={sec(latest.felt_p50)} sub={`95 % within ${sec(latest.felt_p95)}`} ok={latest.felt_p50 === null ? null : latest.felt_p50 <= 1} />
              <Big label="Lines exactly on time" value={pct(latest.on_time, 0)} sub="voice started ≤ 0.3 s after the line" ok={latest.on_time === null ? null : latest.on_time >= 0.8} />
              <Big label="Lines voiced" value={`${latest.voiced ?? "–"} / ${latest.lines ?? "–"}`} sub={`dropped ${latest.actions?.dropped ?? 0}`} ok={(latest.actions?.dropped ?? 0) === 0} />
              <Big label="Transcription accuracy" value={pct(latest.wer === null ? null : 1 - latest.wer)} sub={`word error rate ${pct(latest.wer)}`} ok={latest.wer === null ? null : latest.wer <= 0.1} />
              <Big label="What the voices said" value={pct(latest.spoken_wer === null || latest.spoken_wer === undefined ? null : 1 - latest.spoken_wer)} sub={`${latest.spoken_deletions ?? "–"} of ${latest.ref_words ?? "–"} words missing`} ok={latest.spoken_wer == null ? null : latest.spoken_wer <= 0.12} />
              <Big label="Speaker detection" value={pct(latest.speaker_accuracy)} sub={`live labels · two-pass ${pct(latest.speaker_two_pass)}`} ok={latest.speaker_accuracy === null ? null : latest.speaker_accuracy >= 0.9} />
              <Big label="Emotion" value={pct(latest.emotion_exact, 0)} sub={`within one level ${pct(latest.emotion_within_one, 0)}`} ok={latest.emotion_within_one === null ? null : latest.emotion_within_one >= 0.85} />
              <Big label="Transcribed by" value={Object.entries(latest.asr_by ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "–"} sub="Groq (fast) vs local fallback" ok={null} />
            </div>
          )}
          {latest?.missing_words && latest.missing_words.length > 0 && (
            <p className="mt-4 text-xs text-muted"><b className="text-ink">Words missing in the voices:</b> {latest.missing_words.join(" · ")}</p>
          )}
          {latest && <Link to={`/session/${latest.session_id}/report`} className="mt-3 inline-block text-sm text-accent underline">Full session report →</Link>}
        </section>
      </div>

      <section className="panel overflow-x-auto p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Test history</h2>
        <Table rows={runs} scored />
      </section>

      <section className="panel overflow-x-auto p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">All recent sessions</h2>
        <p className="mb-3 text-xs text-muted">Every session (uploaded clips, live streams, tests). Live streams have no script, so only delay, lines and transcriber use can be measured for them.</p>
        <Table rows={sessions} />
      </section>
    </main>
  );
}

function Big({ label, value, sub, ok }: { label: string; value: string; sub: string; ok: boolean | null }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone(ok)}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
    </div>
  );
}

function Table({ rows, scored = false }: { rows: Run[]; scored?: boolean }) {
  if (!rows.length) return <p className="text-sm text-muted">Nothing yet.</p>;
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="text-xs text-muted">
        <tr>
          <th className="py-2 pr-3">Session</th><th className="pr-3">Source</th><th className="pr-3">Mode</th><th className="pr-3">Felt delay p50 / p95</th>
          <th className="pr-3">On time</th><th className="pr-3">Voiced</th><th className="pr-3">WER</th>{scored && <th className="pr-3">Spoken WER</th>}<th className="pr-3">Speakers</th><th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.session_id} className="border-t border-white/[0.06]">
            <td className="py-2 pr-3 font-mono text-xs">{r.session_id}</td>
            <td className="pr-3">{r.live_input ? "live stream" : r.clip || "–"}</td>
            <td className="pr-3">{r.view_delay_s ? `synced ${r.view_delay_s}s` : "live"}</td>
            <td className="pr-3">{sec(r.felt_p50)} / {sec(r.felt_p95)}</td>
            <td className="pr-3">{pct(r.on_time, 0)}</td>
            <td className="pr-3">{r.voiced ?? "–"}/{r.lines ?? "–"}</td>
            <td className="pr-3">{r.partial ? <span className="text-xs text-muted">partial run</span> : pct(r.wer)}</td>
            {scored && <td className="pr-3">{pct(r.spoken_wer)}</td>}
            <td className="pr-3">{pct(r.speaker_accuracy)}</td>
            <td><Link className="text-accent underline" to={`/session/${r.session_id}/report`}>report</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
