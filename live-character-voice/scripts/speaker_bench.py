"""Speaker-tracking bench (V7): replay speaker decisions on scored clips in seconds.

Every truth line of each clip is embedded once (ECAPA, cached in ~/.cache/live-character-voice),
then a tracker assigns lines in order exactly as it would live. Scores:
  accuracy  share of speech time given to the right person (best one-to-one label mapping)
  splits    real people that ended up under ≥ 2 labels (each label holding ≥ 10 % of their time)
  merges    labels that hold ≥ 2 real people (each ≥ 10 % of the label's time)
  labels    number of labels created vs real speakers
Usage: python scripts/speaker_bench.py [--tracker v1|v2|both] [--offline]
"""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CLIPS = ["synthetic_match", "synthetic_match_3spk", "synthetic_panel_6spk", "synthetic_panel_8spk"]
CACHE = (
    Path(os.environ.get("LCV_CACHE", Path.home() / ".cache" / "live-character-voice")) / "spkbench"
)


def embeddings(clip: str) -> tuple[list[dict[str, Any]], np.ndarray, np.ndarray]:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f"{clip}.npz"
    truth = json.loads((ROOT / "data/clips" / f"{clip}.truth.json").read_text())["lines"]
    if f.exists():
        z = np.load(f)
        if "loud" in z:
            return truth, z["emb"], z["loud"]
    from engine.ingest.decode import decode_audio
    from engine.providers import registry

    sr = 16000
    audio = decode_audio(ROOT / "data/clips" / f"{clip}.mp4", sr)
    spk = registry.create("speaker", "ecapa")
    from engine.providers.free.emotion_prosody import loudest_window_db

    segs = [audio[int(t["t_start"] * sr) : int(t["t_end"] * sr)] for t in truth]
    e = np.stack([np.asarray(spk.embed(x, sr)) for x in segs]).astype(np.float32)
    loud = np.array([loudest_window_db(x, sr) for x in segs], dtype=np.float32)
    np.savez(f, emb=e, loud=loud)
    return truth, e, loud


def score(truth: list[dict[str, Any]], labels: list[str]) -> dict[str, Any]:
    from scipy.optimize import linear_sum_assignment

    dur = np.array([t["t_end"] - t["t_start"] for t in truth])
    real = sorted({t["speaker"] for t in truth})
    lab = sorted(set(labels))
    m = np.zeros((len(real), len(lab)))
    for t, lb, d in zip(truth, labels, dur, strict=True):
        m[real.index(t["speaker"]), lab.index(lb)] += d
    r, c = linear_sum_assignment(-m)
    acc = m[r, c].sum() / m.sum()
    splits = sum(1 for i in range(len(real)) if (m[i] >= 0.1 * m[i].sum()).sum() >= 2)
    merges = sum(1 for j in range(len(lab)) if (m[:, j] >= 0.1 * m[:, j].sum()).sum() >= 2)
    return {"accuracy": round(float(acc), 4), "splits": splits, "merges": merges,
            "labels": len(lab), "speakers": len(real)}  # fmt: skip


def run_v1(truth: list[dict[str, Any]], emb: np.ndarray, max_spk: int) -> list[str]:
    from engine.config import SpeakerConfig
    from engine.speakers.online_cluster import OnlineClusterer

    cl = OnlineClusterer(SpeakerConfig(max_speakers=min(3, max_spk)))
    out: list[str] = []
    for t, e in zip(truth, emb, strict=True):
        out.append(cl.assign(e, t["t_end"] - t["t_start"], out[-1] if out else None).speaker_id)
    return out


def run_v2(
    truth: list[dict[str, Any]],
    emb: np.ndarray,
    max_spk: int,
    loud: np.ndarray | None = None,
    **kw: Any,
) -> list[str]:
    from engine.config import SpeakerConfig
    from engine.speakers.tracker import SpeakerTracker

    tr = SpeakerTracker(SpeakerConfig(max_speakers=max_spk), **kw)
    out: list[str] = []
    for i, (t, e) in enumerate(zip(truth, emb, strict=True)):
        ld = None if loud is None else float(loud[i])
        a = tr.assign(
            e, t["t_end"] - t["t_start"], out[-1] if out else None, key=str(i), loudness_db=ld
        )
        out.append(a.speaker_id)
        for old, new in tr.drain_merges():  # relabel earlier lines (what the app shows/reports)
            out = [new if x == old else x for x in out]
    return out


def run_offline(truth: list[dict[str, Any]], emb: np.ndarray, threshold: float) -> list[str]:
    from engine.speakers.tracker import offline_labels

    return offline_labels(emb, [t["t_end"] - t["t_start"] for t in truth], threshold)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tracker", default="both")
    p.add_argument(
        "--max", type=int, default=8, help="speaker limit given to the tracker (8 = auto)"
    )
    p.add_argument("--offline", action="store_true")
    a = p.parse_args()
    rows: dict[str, dict[str, Any]] = defaultdict(dict)
    for clip in CLIPS:
        truth, emb, loud = embeddings(clip)
        n = len({t["speaker"] for t in truth})
        if a.tracker in ("v1", "both"):
            rows[clip]["v1 (cap 3)"] = score(truth, run_v1(truth, emb, n))
        if a.tracker in ("v2", "both"):
            rows[clip][f"v2 (max {a.max})"] = score(truth, run_v2(truth, emb, a.max, loud))
        if a.offline:
            rows[clip]["offline 2-pass"] = score(truth, run_offline(truth, emb, 0.5))
    for clip, r in rows.items():
        for name, s in r.items():
            lab = f"{s['labels']}/{s['speakers']}"
            print(f"{clip:24s} {name:14s} acc {s['accuracy']:.3f}  labels {lab}"
                  f"  splits {s['splits']}  merges {s['merges']}")  # fmt: skip
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
