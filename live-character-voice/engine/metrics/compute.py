"""Metrics from a finished (or partial) live record + optional ground truth (docs/09 §9.4)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from engine.audio import as_f32, count_clipped, longest_silence_s
from engine.record.models import EMOTION_ORDER, Emotion, Line, SessionRecord
from engine.schedule.scheduler import drift_slope
from engine.tts.text_normalize import normalize_for_wer

GRID_S = 0.01
MID_LINE_MARGIN_S = 0.15
TTS_RATIO_FLAG = 1.6
INTERNAL_SILENCE_FLAG_S = 0.4


def pct(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"p50": None, "p95": None, "max": None, "mean": None, "n": 0}
    a = np.asarray(values, dtype=np.float64)
    return {
        "p50": round(float(np.percentile(a, 50)), 3),
        "p95": round(float(np.percentile(a, 95)), 3),
        "max": round(float(a.max()), 3),
        "mean": round(float(a.mean()), 3),
        "n": len(values),
    }


def _played(ln: Line) -> bool:
    return ln.times.play_at is not None and ln.schedule_action != "dropped"


def delay_metrics(rec: SessionRecord) -> dict[str, Any]:
    lines = [ln for ln in rec.lines if ln.schedule_action != "dropped"]
    view = float(rec.config_snapshot.get("schedule", {}).get("broadcast_delay_s") or 0.0)
    felt = [ln.times.play_at - view - ln.t_start for ln in lines if ln.times.play_at is not None]
    ready = [(ln.t_end, ln.delay_ready) for ln in lines if ln.delay_ready is not None]
    starts = [(ln.t_end, ln.delay_first) for ln in lines if ln.delay_first is not None]
    play = [(ln.t_end, ln.times.play_at - ln.t_end) for ln in lines if ln.times.play_at is not None]
    slope = drift_slope([t for t, _ in starts], [d for _, d in starts if d is not None])
    intercept = 0.0
    if len(starts) >= 3:
        x = np.asarray([t for t, _ in starts])
        y = np.asarray([d for _, d in starts], dtype=np.float64)
        slope_fit, intercept = np.polyfit(x, y, 1)
        slope = float(slope_fit)
    t = rec.lines

    def stage(a: str, b: str, src: list[Line] = t) -> list[float]:
        out = []
        for ln in src:
            va, vb = getattr(ln.times, a), getattr(ln.times, b)
            if va is not None and vb is not None:
                out.append(vb - va)
        return out

    close_wait = [ln.times.created - ln.t_end for ln in t if ln.times.created is not None]
    start = [ln.delay_first for ln in lines if ln.delay_first is not None]
    streamed = [ln for ln in lines if ln.times.tts_first is not None]
    stalls = [float(ln.features.get("stream_stall_s", 0.0)) for ln in streamed]
    return {
        "headline": "delay_felt",
        "view_delay_s": view,
        # V3: what the viewer feels — voice start vs ORIGINAL line start, in the viewer's timeline
        "delay_felt": pct([max(0.0, d) for d in felt]),
        "felt_on_time_share": round(sum(1 for d in felt if d <= 0.3) / len(felt), 4)
        if felt
        else None,
        "delay_start": pct([d for d in start if d is not None]),
        "streamed_lines": len(streamed),
        "stream_stalls": sum(1 for x in stalls if x > 0),
        "stream_stall_max_s": round(max(stalls), 3) if stalls else 0.0,
        "delay_ready": pct([d for _, d in ready if d is not None]),
        "delay_play": pct([d for _, d in play]),
        "stages": {
            "close_wait": pct(close_wait),
            "asr": pct(stage("created", "asr_done")),
            "speaker": pct(stage("created", "speaker_done")),
            "emotion": pct(stage("created", "emotion_done")),
            "complete": pct(stage("created", "complete")),
            "tts_queue": pct(stage("complete", "tts_start")),
            "tts_first_audio": pct(stage("tts_start", "tts_first")),
            "tts": pct(stage("tts_start", "tts_ready")),
            "schedule_wait": pct(stage("tts_ready", "play_at")),
        },
        "drift_slope_s_per_s": round(slope, 5),
        "delay_after_10min_s": round(float(intercept + slope * 600), 3) if starts else None,
        "drift_ok": abs(slope) <= 0.02,
    }


def wer_metrics(rec: SessionRecord, truth_lines: list[dict[str, Any]]) -> dict[str, Any]:
    import jiwer

    ref = normalize_for_wer(" ".join(t["text"] for t in truth_lines))
    hyp = normalize_for_wer(" ".join(ln.text for ln in rec.lines if ln.text))
    if not ref:
        return {"wer": None}
    out = jiwer.process_words(ref, hyp or "<empty>")
    return {
        "wer": round(float(out.wer), 4),
        "substitutions": out.substitutions,
        "deletions": out.deletions,
        "insertions": out.insertions,
        "ref_words": len(ref.split()),
        "hyp_words": len(hyp.split()),
    }


def _grid(duration: float) -> int:
    return int(np.ceil(duration / GRID_S)) + 1


def speaker_metrics(
    rec: SessionRecord, truth_lines: list[dict[str, Any]], duration: float
) -> dict[str, Any]:
    from scipy.optimize import linear_sum_assignment

    n = _grid(duration)
    t_spk = sorted({t["speaker"] for t in truth_lines})
    o_spk = sorted({ln.speaker_id for ln in rec.lines if ln.speaker_id})
    if not t_spk or not o_spk:
        return {"speaker_accuracy": None}
    truth_lab = np.full(n, -1, dtype=np.int32)
    for t in truth_lines:
        a, b = int(t["t_start"] / GRID_S), int(t["t_end"] / GRID_S)
        k = t_spk.index(t["speaker"])
        seg = truth_lab[a:b]
        seg[(seg != -1) & (seg != k)] = -2  # overlapped speech is ambiguous: ignored
        seg[seg == -1] = k
    out_lab = np.full(n, -1, dtype=np.int32)
    for ln in rec.lines:
        if ln.speaker_id and ln.text:
            out_lab[int(ln.t_start / GRID_S) : int(ln.t_end / GRID_S)] = o_spk.index(ln.speaker_id)
    both = (truth_lab >= 0) & (out_lab >= 0)
    conf = np.zeros((len(t_spk), len(o_spk)), dtype=np.int64)
    np.add.at(conf, (truth_lab[both], out_lab[both]), 1)
    rows, cols = linear_sum_assignment(conf, maximize=True)
    matched = int(conf[rows, cols].sum())
    total = int(both.sum())
    mapping = {o_spk[c]: t_spk[r] for r, c in zip(rows, cols, strict=True)}

    # line-level: each output line's majority truth speaker
    line_ok = line_n = 0
    for ln in rec.lines:
        if not (ln.speaker_id and ln.text):
            continue
        seg = truth_lab[int(ln.t_start / GRID_S) : int(ln.t_end / GRID_S)]
        seg = seg[seg >= 0]
        if seg.size == 0:
            continue
        line_n += 1
        maj = t_spk[int(np.bincount(seg).argmax())]
        line_ok += int(mapping.get(ln.speaker_id) == maj)
    truth_frames = int((truth_lab >= 0).sum())
    return {
        "speaker_accuracy": round(matched / total, 4) if total else None,
        "speaker_accuracy_lines": round(line_ok / line_n, 4) if line_n else None,
        "mapping": mapping,
        "n_truth_speakers": len(t_spk),
        "n_output_speakers": len(o_spk),
        "speech_covered_by_lines": round(total / truth_frames, 4) if truth_frames else None,
        "low_confidence_lines": sum(1 for ln in rec.lines if ln.speaker_conf == "low"),
    }


def _best_overlap(t: dict[str, Any], lines: list[Line]) -> Line | None:
    best, best_ov = None, 0.0
    for ln in lines:
        ov = min(t["t_end"], ln.t_end) - max(t["t_start"], ln.t_start)
        if ov > best_ov:
            best, best_ov = ln, ov
    return best


def emotion_metrics(rec: SessionRecord, truth_lines: list[dict[str, Any]]) -> dict[str, Any]:
    labelled = [ln for ln in rec.lines if ln.emotion is not None]
    exact = near = n = 0
    confusion: dict[str, dict[str, int]] = {e.value: {} for e in EMOTION_ORDER}
    peaks_total = peaks_hit = 0
    for t in truth_lines:
        ln = _best_overlap(t, labelled)
        if ln is None or ln.emotion is None:
            continue
        n += 1
        te, oe = Emotion(t["emotion"]), ln.emotion
        exact += int(te == oe)
        near += int(abs(EMOTION_ORDER.index(te) - EMOTION_ORDER.index(oe)) <= 1)
        confusion[te.value][oe.value] = confusion[te.value].get(oe.value, 0) + 1
        if te is Emotion.peak:
            peaks_total += 1
            overlapping = [x for x in labelled if x.t_start < t["t_end"] and x.t_end > t["t_start"]]
            peaks_hit += int(any(x.emotion is Emotion.peak for x in overlapping))
    return {
        "emotion_exact": round(exact / n, 4) if n else None,
        "emotion_within_one": round(near / n, 4) if n else None,
        "matched_truth_lines": n,
        "peaks_detected": peaks_hit,
        "peaks_total": peaks_total,
        "confusion": confusion,
    }


def segmentation_metrics(rec: SessionRecord, truth_lines: list[dict[str, Any]]) -> dict[str, Any]:
    reasons: dict[str, int] = {}
    for ln in rec.lines:
        reasons[ln.close_reason] = reasons.get(ln.close_reason, 0) + 1
    mid = 0
    for ln in rec.lines:
        for edge in (ln.t_start, ln.t_end):
            for t in truth_lines:
                if t["t_start"] + MID_LINE_MARGIN_S < edge < t["t_end"] - MID_LINE_MARGIN_S:
                    mid += 1
                    break
    # truth "burst" lines = short peak shouts; detected if an output line covers them
    shouts = [t for t in truth_lines if t["emotion"] == "peak" and t["t_end"] - t["t_start"] <= 1.2]
    shouts_hit = sum(
        1
        for t in shouts
        if any(ln.t_start < t["t_end"] and ln.t_end > t["t_start"] for ln in rec.lines)
    )
    shouts_own_line = sum(
        1
        for t in shouts
        if any(
            ln.t_start >= t["t_start"] - 0.4 and ln.t_end <= t["t_end"] + 0.4 for ln in rec.lines
        )
    )
    n_out, n_truth = len(rec.lines), len(truth_lines)
    return {
        "lines_out": n_out,
        "lines_truth": n_truth,
        "lines_ratio": round(n_out / n_truth, 3) if n_truth else None,
        "close_reasons": reasons,
        "boundaries_inside_truth_lines": mid,
        "short_shouts_total": len(shouts),
        "short_shouts_detected": shouts_hit,
        "short_shouts_own_line": shouts_own_line,
    }


def coverage_metrics(
    rec: SessionRecord, truth_lines: list[dict[str, Any]], duration: float
) -> dict[str, Any]:
    n = _grid(duration)
    truth = np.zeros(n, dtype=bool)
    for t in truth_lines:
        truth[int(t["t_start"] / GRID_S) : int(t["t_end"] / GRID_S)] = True
    voiced = np.zeros(n, dtype=bool)
    for ln in rec.lines:
        if _played(ln) or ln.schedule_action == "merged":
            voiced[int(ln.t_start / GRID_S) : int(ln.t_end / GRID_S)] = True
    tot = int(truth.sum())
    return {"coverage": round(int((truth & voiced).sum()) / tot, 4) if tot else None}


def schedule_metrics(rec: SessionRecord) -> dict[str, Any]:
    counts: dict[str, int] = {}
    asr_by: dict[str, int] = {}
    for ln in rec.lines:
        counts[ln.schedule_action] = counts.get(ln.schedule_action, 0) + 1
        src = str(ln.features.get("asr_by", "")) or "unknown"
        asr_by[src] = asr_by.get(src, 0) + 1
    return {
        "actions": counts,
        "asr_by": asr_by,
        "errors": sum(1 for ln in rec.lines if ln.error),
        "lines_with_text": sum(1 for ln in rec.lines if ln.text),
        "lines_played": sum(1 for ln in rec.lines if _played(ln)),
    }


def voice_quality_metrics(rec: SessionRecord) -> dict[str, Any]:
    ratios: list[float] = []
    clipped = silent = flagged_ratio = files = 0
    peaks: list[float] = []
    for ln in rec.lines:
        if ln.tts_duration is None or not ln.tts_path:
            continue
        dur = max(0.05, ln.t_end - ln.t_start)
        if ln.schedule_action != "merged":
            r = ln.tts_duration / dur
            ratios.append(r)
            flagged_ratio += int(r > TTS_RATIO_FLAG)
        p = Path(ln.tts_path)
        if p.exists():
            audio, sr = sf.read(p, dtype="float32")
            a = as_f32(audio)
            files += 1
            clipped += int(count_clipped(a) > 0)
            silent += int(longest_silence_s(a, int(sr)) > INTERNAL_SILENCE_FLAG_S)
            peaks.append(float(np.max(np.abs(a), initial=0.0)))
    return {
        "tts_duration_ratio": pct(ratios),
        "lines_ratio_over_1_6": flagged_ratio,
        "files_checked": files,
        "files_with_clipping": clipped,
        "files_with_silence_over_400ms": silent,
        "max_peak_dbfs": round(20 * float(np.log10(max(peaks))), 2) if peaks else None,
    }


def compute_all(
    rec: SessionRecord, truth: dict[str, Any] | None, duration: float
) -> dict[str, Any]:
    m: dict[str, Any] = {
        "session_id": rec.session_id,
        "speed": rec.speed,
        "source": rec.source,
        "duration_s": round(duration, 3),
        "delay": delay_metrics(rec),
        "schedule": schedule_metrics(rec),
        "voice_quality": voice_quality_metrics(rec),
        "warnings": len(rec.warnings),
    }
    if truth is not None:
        tl = truth["lines"]
        m["wer"] = wer_metrics(rec, tl)
        m["speaker"] = speaker_metrics(rec, tl, duration)
        m["emotion"] = emotion_metrics(rec, tl)
        m["segmentation"] = segmentation_metrics(rec, tl)
        m["coverage"] = coverage_metrics(rec, tl, duration)
    return m
