"""Results report `report.md` + `delay_over_time.png` (docs/09 §9.5).

Plain language first, numbers second. Every verdict is computed from the metrics of THIS run.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from engine.record.models import SessionRecord

TARGETS = {
    "median_delay": 4.0,
    "p95_delay": 7.0,
    "wer": 0.12,
    "speaker_accuracy": 0.90,
    "drift": 0.02,
}


def _fmt(v: Any, unit: str = "", pct: bool = False, nd: int = 2) -> str:
    if v is None:
        return "—"
    if pct:
        return f"{100 * float(v):.1f} %"
    if isinstance(v, float):
        return f"{v:.{nd}f}{unit}"
    return f"{v}{unit}"


def _ok(passed: bool | None) -> str:
    return "—" if passed is None else ("✅" if passed else "❌")


def write_chart(rec: SessionRecord, path: Path) -> bool:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    pts = [
        (ln.t_end, ln.delay_ready, ln.schedule_action, ln.emotion.value if ln.emotion else "")
        for ln in rec.lines
        if ln.delay_ready is not None
    ]
    play = [
        (ln.t_end, ln.times.play_at - ln.t_end)
        for ln in rec.lines
        if ln.times.play_at is not None and ln.schedule_action != "dropped"
    ]
    if not pts:
        return False
    fig, ax = plt.subplots(figsize=(10, 4.2), dpi=120)
    colors = {"calm": "#5BC0BE", "neutral": "#8A97A8", "excited": "#F5A524", "peak": "#F31260"}
    ax.scatter(
        [p[0] for p in pts],
        [p[1] for p in pts],
        c=[colors.get(p[3], "#4FA3FF") for p in pts],
        s=22,
        label="voice ready (dot colour = emotion)",
        zorder=3,
    )
    if play:
        ax.plot(
            [p[0] for p in play],
            [p[1] for p in play],
            color="#4FA3FF",
            lw=1.2,
            label="voice plays",
            zorder=2,
        )
    ax.axhline(TARGETS["median_delay"], color="#17C964", ls="--", lw=1, label="median target 4 s")
    ax.axhline(TARGETS["p95_delay"], color="#F31260", ls=":", lw=1, label="p95 target 7 s")
    ax.set_xlabel("media time — end of the original line (s)")
    ax.set_ylabel("delay after the line ended (s)")
    ax.set_title("Delay over time (live speed)")
    ax.grid(alpha=0.25)
    ax.legend(loc="upper right", fontsize=8)
    ax.set_ylim(bottom=0)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    return True


def _head(m: dict[str, Any]) -> dict[str, Any]:
    d: dict[str, Any] = m["delay"][m["delay"].get("headline", "delay_ready")]
    return d


def _verdicts(m: dict[str, Any]) -> dict[str, bool | None]:
    d = _head(m)
    out: dict[str, bool | None] = {
        "median_delay": None if d["p50"] is None else d["p50"] <= TARGETS["median_delay"],
        "p95_delay": None if d["p95"] is None else d["p95"] <= TARGETS["p95_delay"],
        "drift": abs(m["delay"]["drift_slope_s_per_s"]) <= TARGETS["drift"] if d["n"] else None,
        "wer": None,
        "speaker_accuracy": None,
        "crashes": m.get("run", {}).get("crashes", 0) == 0,
    }
    if m.get("wer", {}).get("wer") is not None:
        out["wer"] = m["wer"]["wer"] <= TARGETS["wer"]
    if m.get("speaker", {}).get("speaker_accuracy") is not None:
        out["speaker_accuracy"] = m["speaker"]["speaker_accuracy"] >= TARGETS["speaker_accuracy"]
    return out


def build_report(run_dir: Path, m: dict[str, Any], rec: SessionRecord) -> str:
    run = m.get("run", {})
    v = _verdicts(m)
    d = _head(m)
    streaming = m["delay"].get("headline") == "delay_start"
    dp = m["delay"]["delay_play"]
    st = m["delay"]["stages"]
    live = rec.speed == 1.0
    lines: list[str] = []
    w = lines.append

    w(f"# Results report — {run.get('run_id', rec.session_id)}\n")
    if not live:
        w(f"> ⚠️ **Not a live run** (speed {rec.speed}). Numbers below are NOT live numbers.\n")
    # ---- 1. Summary
    w("## 1. Summary\n")
    works = live and v["crashes"] and (m["schedule"]["lines_played"] > 0)
    w(
        f"- **Does the engine work live?** {'Yes' if works else 'Not shown by this run'} — the clip "
        f"was processed at speed {rec.speed} with no look-ahead; {m['schedule']['lines_played']} "
        f"lines were re-voiced and placed back in time; crashes: {run.get('crashes', 0)}."
    )
    felt = m["delay"].get("headline") == "delay_felt"
    view = m["delay"].get("view_delay_s") or 0.0
    what = (
        "original line starts → its new voice starts, as the viewer sees it"
        + (f"; picture held back {view:g} s (synced mode)" if view else "; live mode")
        if felt
        else "line ended → new voice ready"
    )
    w(
        f"- **Median delay** ({what}): **{_fmt(d['p50'], ' s')}** "
        f"(target ≤ {TARGETS['median_delay']} s) {_ok(v['median_delay'])}"
    )
    w(
        f"- **Worst delays:** p95 **{_fmt(d['p95'], ' s')}** (target ≤ {TARGETS['p95_delay']} s) "
        f"{_ok(v['p95_delay'])}, max {_fmt(d['max'], ' s')}; drift "
        f"{_fmt(m['delay']['drift_slope_s_per_s'], ' s/s', nd=4)} {_ok(v['drift'])}"
    )
    if "speaker" in m:
        w(
            f"- **Speaker accuracy:** **{_fmt(m['speaker']['speaker_accuracy'], pct=True)}** of "
            f"speech time labelled with the right commentator (target ≥ 90 %) "
            f"{_ok(v['speaker_accuracy'])}"
        )
    if "wer" in m:
        wer = m["wer"]["wer"]
        acc = None if wer is None else 1 - wer
        w(
            f"- **Word accuracy:** **{_fmt(acc, pct=True)}** (WER {_fmt(wer, pct=True)}, target "
            f"WER ≤ 12 %) {_ok(v['wer'])}"
        )
    w("")
    # ---- 2. Setup
    w("## 2. Setup\n")
    w("| Item | Value |\n|---|---|")
    w(f"| Clip | `{rec.clip_path}` ({_fmt(m.get('duration_s'), ' s')}) |")
    w(f"| Speed | **{rec.speed}** {'(live, honest)' if live else '(development only)'} |")
    w(
        f"| Source | {rec.source}{' (captions lag 3–5 s on live TV)' if rec.source == 'captions' else ''} |"
    )
    for k, val in (run.get("models") or {}).items():
        w(f"| Model: {k} | {val} |")
    w(f"| Model load / warm-up | {run.get('model_load_s')} s |")
    w(f"| VM | {run.get('cpu_count')} vCPU, CPU only |")
    w(f"| Max speakers | {run.get('max_speakers')} |")
    w(f"| Enrollment | {run.get('enroll') or 'none (online clustering only)'} |")
    w(f"| Voices | {run.get('voice_map')} |")
    w(f"| Config hash | `{run.get('config_hash')}` |")
    w(f"| Wall time | {run.get('wall_s')} s (live part {run.get('live_wall_s')} s) |\n")
    # ---- 3. Delay
    w("## 3. Delay\n")
    w("| Delay | p50 | p95 | max | n |\n|---|---|---|---|---|")
    w(
        f"| Line end → voice ready | {_fmt(d['p50'])} | {_fmt(d['p95'])} | {_fmt(d['max'])} | {d['n']} |"
    )
    w(
        f"| Line end → voice plays | {_fmt(dp['p50'])} | {_fmt(dp['p95'])} | {_fmt(dp['max'])} | {dp['n']} |\n"
    )
    w("Stage breakdown (seconds, measured on the session clock):\n")
    w("| Stage | p50 | p95 | what it is |\n|---|---|---|---|")
    meaning = {
        "close_wait": "end of speech → line closed (pause detection)",
        "asr": "line closed → text ready",
        "speaker": "line closed → speaker known",
        "emotion": "line closed → emotion known (needs text)",
        "complete": "line closed → all three ready",
        "tts_queue": "complete → TTS started (waiting for a worker)",
        "tts_first_audio": "TTS start → first streamed audio",
        "tts": "TTS start → audio complete",
        "schedule_wait": "voice ready → voice plays (ordering, gaps)",
    }
    for k, desc in meaning.items():
        s = st.get(k, {})
        w(f"| {k} | {_fmt(s.get('p50'))} | {_fmt(s.get('p95'))} | {desc} |")
    w("")
    if (run_dir / "delay_over_time.png").exists():
        w("![Delay over time](delay_over_time.png)\n")
    drift_txt = (
        "no drift — the delay does not build up" if v["drift"] else "the delay builds up over time"
    )
    w(
        f"**Drift:** slope {_fmt(m['delay']['drift_slope_s_per_s'], ' s/s', nd=4)} → {drift_txt}; "
        f"extrapolated delay after 10 min: {_fmt(m['delay']['delay_after_10min_s'], ' s')}.\n"
    )
    if streaming:
        w(
            f"Streaming: {m['delay']['streamed_lines']} lines started on their first audio; "
            f"{m['delay']['stream_stalls']} would have stalled (max {m['delay']['stream_stall_max_s']} s).\n"
        )
    sched = m["schedule"]
    w(f"Schedule actions: {sched['actions']}. Lines with errors: {sched['errors']}.\n")
    # ---- 4. Accuracy
    if "wer" in m:
        w("## 4. Accuracy\n")
        wr, sp, em, sg = m["wer"], m["speaker"], m["emotion"], m["segmentation"]
        w("| Measure | Result | Target |\n|---|---|---|")
        w(
            f"| Word error rate | **{_fmt(wr['wer'], pct=True)}** (sub {wr.get('substitutions')}, del {wr.get('deletions')}, ins {wr.get('insertions')}) | ≤ 12 % {_ok(v['wer'])} |"
        )
        w(
            f"| Speaker accuracy (time) | **{_fmt(sp['speaker_accuracy'], pct=True)}** | ≥ 90 % {_ok(v['speaker_accuracy'])} |"
        )
        w(f"| Speaker accuracy (lines) | {_fmt(sp.get('speaker_accuracy_lines'), pct=True)} | — |")
        w(
            f"| Speakers found / in truth | {sp.get('n_output_speakers')} / {sp.get('n_truth_speakers')} (mapping {sp.get('mapping')}) | — |"
        )
        w(f"| Emotion agreement (exact) | {_fmt(em['emotion_exact'], pct=True)} | — |")
        w(
            f"| Emotion agreement (within one step) | {_fmt(em['emotion_within_one'], pct=True)} | ≥ 80 % |"
        )
        w(f"| Peak moments detected | {em['peaks_detected']} / {em['peaks_total']} | all |")
        w(
            f"| Lines out / truth | {sg['lines_out']} / {sg['lines_truth']} (ratio {sg['lines_ratio']}) | ≈ 1.0 |"
        )
        w(f"| Line boundaries inside a truth line | {sg['boundaries_inside_truth_lines']} | low |")
        w(
            f"| Short shouts on their own line | {sg['short_shouts_own_line']} / {sg['short_shouts_total']} | — |"
        )
        w(
            f"| Coverage (truth speech re-voiced) | {_fmt(m['coverage']['coverage'], pct=True)} | — |\n"
        )
        w("Emotion confusion (rows = truth, columns = engine):\n")
        labels = ["calm", "neutral", "excited", "peak"]
        w("| truth \\ engine | " + " | ".join(labels) + " |\n|---|---|---|---|---|")
        for t in labels:
            row = em["confusion"].get(t, {})
            w(f"| {t} | " + " | ".join(str(row.get(o, 0)) for o in labels) + " |")
        w("")
    # ---- 5. Voice quality
    vq = m["voice_quality"]
    w("## 5. Voice quality\n")
    w("Automatic checks:\n")
    w(
        f"- TTS duration ÷ original line duration: p50 {_fmt(vq['tts_duration_ratio']['p50'])}, "
        f"p95 {_fmt(vq['tts_duration_ratio']['p95'])}; lines over 1.6× (voice too slow to keep up): "
        f"{vq['lines_ratio_over_1_6']}"
    )
    w(
        f"- Files with clipping: {vq['files_with_clipping']} / {vq['files_checked']} "
        f"(max peak {_fmt(vq['max_peak_dbfs'], ' dBFS')})"
    )
    w(f"- Files with an internal silence > 400 ms: {vq['files_with_silence_over_400ms']}")
    rnd = m.get("render", {}).get("live", {})
    if rnd:
        w(
            f"- Ducking: original commentary {rnd.get('orig_change_inside_db')} dB while a voice "
            f"plays vs {rnd.get('orig_change_outside_db')} dB elsewhere → depth "
            f"**{rnd.get('duck_depth_db')} dB** (target ≥ 9 dB)"
        )
    w("\nHuman listen-test (open `voices_only.wav` and `demo_live.mp4`, tick each box):\n")
    for q in (
        "Voices sound natural (no robotic or metallic artefacts)",
        "Excited / peak moments sound more energetic than calm ones",
        "Player and team names are pronounced correctly",
        "No clipped or cut-off words at the start or end of lines",
        "Each commentator keeps the same character voice throughout",
        "Original commentary is clearly turned down under the new voice; crowd sound stays",
    ):
        w(f"- [ ] {q}")
    w("")
    # ---- 6. What worked / needs improving
    w("## 6. What worked well / what needs improving\n")
    good, bad = _assess(m, v)
    w("**Worked well**\n")
    for g in good or ["—"]:
        w(f"- {g}")
    w("\n**Needs improving**\n")
    for b in bad or ["—"]:
        w(f"- {b}")
    w("")
    # ---- 7. Recommendations
    w("## 7. Recommendations\n")
    for r in _recommend(m, v):
        w(f"- {r}")
    w(
        "- *Expectation, not measured:* paid streaming ASR with end-of-turn detection and a faster "
        "hosted TTS would cut the delay roughly in half (docs/12)."
    )
    w("")
    # ---- 8. Files
    w("## 8. Files\n")
    for f, desc in (
        ("demo_live.mp4", "what a viewer would hear live (voices at their measured delay)"),
        ("demo_synced.mp4", "synced-mode preview (picture held back by D)"),
        ("voices_only.wav", "generated voices only (for judging voice quality)"),
        ("record.json", "the full live record"),
        ("lines.csv", "delay log, one row per line"),
        ("metrics.json", "all computed metrics"),
        ("delay_over_time.png", "delay chart"),
    ):
        if (run_dir / f).exists():
            w(f"- [{f}]({f}) — {desc}")
    if rec.warnings:
        w(f"\nWarnings during the run ({len(rec.warnings)}): " + "; ".join(rec.warnings[:10]))
    return "\n".join(lines) + "\n"


def _assess(m: dict[str, Any], v: dict[str, bool | None]) -> tuple[list[str], list[str]]:
    good: list[str] = []
    bad: list[str] = []
    d = _head(m)
    if v["median_delay"]:
        good.append(f"Median delay {d['p50']} s is inside the {TARGETS['median_delay']} s target.")
    elif v["median_delay"] is False:
        bad.append(f"Median delay {d['p50']} s is above the {TARGETS['median_delay']} s target.")
    if v["p95_delay"] is False:
        bad.append(f"Worst-case (p95) delay {d['p95']} s is above {TARGETS['p95_delay']} s.")
    if v["drift"]:
        good.append("Delay does not build up over the clip (drift ≈ 0).")
    elif v["drift"] is False:
        bad.append("Delay builds up over the clip — the pipeline is slower than real time.")
    if v["wer"]:
        good.append(f"Words are recognised accurately (WER {100 * m['wer']['wer']:.1f} %).")
    elif v["wer"] is False:
        bad.append(f"Word error rate {100 * m['wer']['wer']:.1f} % is above 12 %.")
    if v["speaker_accuracy"]:
        good.append("Commentators are told apart reliably.")
    elif v["speaker_accuracy"] is False:
        bad.append(
            "Speaker labels are not reliable enough; overlaps and handovers are the hard part."
        )
    em = m.get("emotion")
    if em and em.get("emotion_within_one") is not None:
        if em["emotion_within_one"] >= 0.8:
            good.append(
                f"Emotion within one step of the truth on {100 * em['emotion_within_one']:.0f} % of lines."
            )
        else:
            bad.append("Emotion labels are too often off by more than one step.")
        if em["peaks_total"] and em["peaks_detected"] < em["peaks_total"]:
            bad.append(
                f"Only {em['peaks_detected']}/{em['peaks_total']} peak moments were labelled peak."
            )
    vq = m["voice_quality"]
    if vq["files_with_clipping"] == 0 and vq["files_checked"]:
        good.append("No generated line clips.")
    if vq["lines_ratio_over_1_6"]:
        bad.append(f"{vq['lines_ratio_over_1_6']} voice lines are > 1.6× longer than the original.")
    return good, bad


def _recommend(m: dict[str, Any], v: dict[str, bool | None]) -> list[str]:
    st = m["delay"]["stages"]
    out = []
    asr = st.get("asr", {}).get("p95")
    tts = st.get("tts", {}).get("p95")
    q = st.get("tts_queue", {}).get("p95")
    if asr and asr > 1.5:
        out.append(
            f"ASR p95 is {asr} s: switch to `base.en` or lower `max_line_s` (docs/04 levers)."
        )
    if q and q > 1.0:
        out.append(f"Lines wait {q} s (p95) for a TTS worker: add a worker or shorten lines.")
    if tts and tts > 1.6:
        out.append(
            f"TTS p95 is {tts} s: reduce CPU contention (torch threads) or use more workers."
        )
    if v["speaker_accuracy"] is False:
        out.append("Provide an enroll file (8–15 s per commentator) for real clips.")
    if not out:
        out.append("Keep the settings; next step is a real cleared clip in data/clips/.")
    return out


def write_report(run_dir: Path, metrics: dict[str, Any], rec: SessionRecord) -> None:
    write_chart(rec, run_dir / "delay_over_time.png")
    (run_dir / "report.md").write_text(build_report(run_dir, metrics, rec), encoding="utf-8")
