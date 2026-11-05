"""Assemble the final Pilot report `outputs/pilot_<date>/report.md` (docs/10 M10).

Inputs: ws_client.json files of the M8 session, the 3-commentator voice-switch session and the
20-minute stability session, plus a server RSS time series (csv: seconds,rss_mb). Copies each
session's report/metrics/lines.csv/chart next to the summary.
"""

from __future__ import annotations

import argparse
import json
import shutil
import time
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def load(p: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(Path(p).read_text())
    return data


def mem_stats(csv_path: Path) -> dict[str, float]:
    rows = [ln.split(",") for ln in csv_path.read_text().split() if "," in ln]
    t = np.array([float(a) for a, b in rows if b])
    m = np.array([float(b) for a, b in rows if b])
    # malloc_trim every 60 s makes a saw-tooth: compare 2-minute window troughs (retained memory)
    troughs = []
    for w0 in range(60, int(t.max()) - 119, 120):
        sel = (t >= w0) & (t < w0 + 120)
        if sel.any():
            troughs.append((w0 + 60.0, float(m[sel].min())))
    tr = np.array(troughs) if troughs else np.zeros((0, 2))
    last = tr[tr[:, 0] >= tr[-1, 0] - 600] if len(tr) else tr
    late_slope = float(np.polyfit(last[:, 0], last[:, 1], 1)[0]) if len(last) > 2 else 0.0
    growth = float(tr[:, 1].max() - tr[0, 1]) if len(tr) else 0.0
    return {
        "start_mb": round(float(m[0]), 1),
        "after_warmup_mb": round(float(tr[0, 1]), 1) if len(tr) else round(float(m[0]), 1),
        "max_mb": round(float(m.max()), 1),
        "end_mb": round(float(m[-1]), 1),
        "growth_after_warmup_mb": round(growth, 1),
        "late_slope_mb_per_min": round(late_slope * 60, 2),
        "troughs_mb": [int(round(float(x))) for x in tr[:, 1]] if len(tr) else [],
        "samples": int(m.size),
    }


def copy_session(sid: str, dest: Path) -> None:
    src = ROOT / "outputs" / "sessions" / sid
    dest.mkdir(parents=True, exist_ok=True)
    for f in ("report.md", "metrics.json", "lines.csv", "delay_over_time.png", "record.json"):
        if (src / f).exists():
            shutil.copy2(src / f, dest / f)


def ok(b: bool) -> str:
    return "✅" if b else "❌"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--m8", required=True)
    p.add_argument("--switch", required=True)
    p.add_argument("--long", required=True)
    p.add_argument("--rss", required=True)
    p.add_argument("--rss-label", default="server RSS sampled every 30 s via /api/health")
    args = p.parse_args()
    m8, sw, lg = load(args.m8), load(args.switch), load(args.long)
    mem = mem_stats(Path(args.rss))
    out = ROOT / "outputs" / f"pilot_{time.strftime('%Y%m%d')}"
    for name, d in (("m8_session", m8), ("three_commentators", sw), ("stability_20min", lg)):
        copy_session(d["session_id"], out / name)
        (out / name / "ws_client.json").write_text(json.dumps(d, indent=2))
    shutil.copy2(args.rss, out / "stability_20min" / "server_rss.csv")

    switch_tests = sw["voice_switch"]["tested"] + lg["voice_switch"]["tested"]
    switch_pass = sw["voice_switch"]["passed"] + lg["voice_switch"]["passed"]
    rate = switch_pass / switch_tests if switch_tests else 0.0
    ld = lg["server_delay"]
    rows = [
        ("Voice switch applies to the next unsynthesized line", "≥ 95 %",
         f"{switch_pass}/{switch_tests} = {100 * rate:.1f} %", rate >= 0.95),
        ("3-speaker accuracy (3-commentator clip)", "≥ 85 %",
         f"{100 * sw['speaker_accuracy']:.1f} %", sw["speaker_accuracy"] >= 0.85),
        ("3-speaker accuracy (20-min clip)", "≥ 85 %",
         f"{100 * lg['speaker_accuracy']:.1f} %", lg["speaker_accuracy"] >= 0.85),
        ("20-min run: crashes", "0", str(lg["crashes"]), lg["crashes"] == 0),
        ("20-min run: drift slope", "≈ 0", f"{lg['drift_slope']:+.5f} s/s",
         abs(lg["drift_slope"]) <= 0.02),
        ("20-min run: p95 delay", "≤ 6.0 s", f"{ld['p95']:.2f} s", ld["p95"] <= 6.0),
        ("20-min run: memory growth after the first minute", "< 300 MB",
         f"{mem['growth_after_warmup_mb']:+.0f} MB "
         f"(last 10 min {mem['late_slope_mb_per_min']:+.1f} MB/min)",
         mem["growth_after_warmup_mb"] < 300),
        ("M8: line.complete / audio.ready coverage", "≥ 95 %",
         f"{100 * m8['line_complete_coverage']:.0f} % / {100 * m8['audio_ready_coverage']:.0f} %",
         min(m8["line_complete_coverage"], m8["audio_ready_coverage"]) >= 0.95),
    ]  # fmt: skip
    lines = [
        f"# Pilot report — {time.strftime('%Y-%m-%d')}\n",
        "Pilot = the POC engine behind a FastAPI + WebSocket API and a React web player. All runs "
        "at speed 1.0 (live), 4 vCPU, no GPU, free models only (Whisper small.en, ECAPA, "
        "Kokoro-82M).\n",
        "## Acceptance (docs/10 M10)\n",
        "| Check | Target | Result | |",
        "|---|---|---|---|",
    ]
    lines += [f"| {a} | {b} | **{c}** | {ok(d)} |" for a, b, c, d in rows]
    lines += [
        "",
        "## Sessions\n",
        "| Session | Clip | Lines | Median / p95 / max delay | WER | Speakers | Switches |",
        "|---|---|---|---|---|---|---|",
    ]
    for label, d in (("M8 — scripted client", m8), ("3 commentators + switching", sw),
                     ("20-minute stability", lg)):  # fmt: skip
        sd = d["server_delay"]
        vs = d["voice_switch"]
        lines.append(
            f"| {label} (`{d['session_id']}`) | {d['clip']} | {d['lines_with_text']} | "
            f"{sd['p50']:.2f} / {sd['p95']:.2f} / {sd['max']:.2f} s | {100 * d['wer']:.1f} % | "
            f"{100 * d['speaker_accuracy']:.1f} % | {vs['passed']}/{vs['tested']} |"
        )
    lines += [
        "",
        "## Memory (20-minute run)\n",
        f"{args.rss_label}: start {mem['start_mb']} MB (idle server) → first-minute trough "
        f"{mem['after_warmup_mb']} MB → max {mem['max_mb']} MB, end {mem['end_mb']} MB. "
        f"Retained memory (2-minute troughs, MB): {mem['troughs_mb']}. Growth after the first "
        f"minute: {mem['growth_after_warmup_mb']:+.0f} MB; slope over the last 10 minutes: "
        f"{mem['late_slope_mb_per_min']:+.2f} MB/min (≈ 0 means no leak). The saw-tooth is "
        "`malloc_trim` returning freed buffers every 60 s; the server runs with "
        "`MALLOC_ARENA_MAX=2` and warms the models with worst-case input sizes at start-up.\n",
        "## Honest notes\n",
        f"- **Median delay** in the 20-minute run is {ld['p50']:.2f} s. The product brief's "
        "Pilot aim (≤ 3.5 s median) is not reached on this 4-vCPU CPU-only machine; the POC "
        "analysis (`outputs/poc_summary.md`) shows why (ASR + TTS share the cores) and what "
        "would close it.",
        "- WER on the 20-minute clip is higher than on the 3-minute clip because it rotates the "
        "invented player names through every loop (names are the hardest words for ASR).",
        "- The web player was verified headless (Playwright): `outputs/ui/player.png`, "
        "`outputs/ui/session.webm` (no audio in browser recordings — listen via the POC demos).",
        "",
        "## Files\n",
        "- `m8_session/`, `three_commentators/`, `stability_20min/` — each with the session's "
        "`report.md`, `metrics.json`, `lines.csv`, `delay_over_time.png`, `record.json`, "
        "`ws_client.json`",
        "- `stability_20min/server_rss.csv` — memory samples",
    ]
    (out / "report.md").write_text("\n".join(lines) + "\n")
    print(f"wrote {out / 'report.md'}")
    print("\n".join(lines[:16]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
