"""Offline segmenter tuning: run VAD once, then replay the segmenter with config variants and score
each against the truth (lines ratio, shouts on their own line, cross-speaker merges, mid-line cuts).

Not a live run — used to choose settings; the chosen settings are then verified live (speed 1.0).
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.config import load_engine_config  # noqa: E402
from engine.ingest.decode import decode_audio  # noqa: E402
from engine.segment.segmenter import LineSegmenter  # noqa: E402
from engine.segment.vad import StreamingVAD  # noqa: E402


def score(lines: list, truth: list[dict]) -> dict[str, float]:
    cross = 0
    for ln in lines:
        spk = {
            t["speaker"]
            for t in truth
            if min(t["t_end"], ln.t_end) - max(t["t_start"], ln.t_start) > 0.25
        }
        cross += int(len(spk) > 1)
    mid = 0
    for ln in lines:
        for edge in (ln.t_start, ln.t_end):
            if any(t["t_start"] + 0.15 < edge < t["t_end"] - 0.15 for t in truth):
                mid += 1
                break
    shouts = [t for t in truth if t["emotion"] == "peak" and t["t_end"] - t["t_start"] <= 1.2]
    own = sum(
        1
        for t in shouts
        if any(ln.t_start >= t["t_start"] - 0.4 and ln.t_end <= t["t_end"] + 0.4 for ln in lines)
    )
    reasons: dict[str, int] = {}
    for ln in lines:
        reasons[ln.close_reason] = reasons.get(ln.close_reason, 0) + 1
    return {
        "ratio": round(len(lines) / len(truth), 3),
        "cross_speaker": cross,
        "mid_line_cuts": mid,
        "shouts_own": f"{own}/{len(shouts)}",
        "reasons": reasons,  # type: ignore[dict-item]
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--clip", default=str(ROOT / "data/clips/synthetic_match.mp4"))
    args = p.parse_args()
    truth = json.loads(Path(args.clip).with_suffix(".truth.json").read_text())["lines"]
    audio = decode_audio(args.clip)
    vad = StreamingVAD()
    probs, frames = vad.process(audio)
    base = load_engine_config()
    grid = {
        "end_silence_ms": [250, 300, 350],
        "level_split_db": [5.0, 6.0, 99.0],
        "burst_db": [8.0, 10.0],
    }
    for values in itertools.product(*grid.values()):
        cfg = base.segment.model_copy(update=dict(zip(grid.keys(), values, strict=True)))
        seg = LineSegmenter(cfg, base.vad.threshold)
        lines = []
        for i in range(0, len(probs), 16):
            lines += seg.push(np.asarray(probs[i : i + 16]), frames[i : i + 16])
        lines += seg.flush()
        print(dict(zip(grid.keys(), values, strict=True)), score(lines, truth))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
