"""Speaker tracker v2 (V7): many speakers, one stable label per person.

Measured on 4 scored clips (scripts/speaker_bench.py): one voice-print (ECAPA) per line is noisy —
two lines of the SAME person score 0.37–0.48 typical but 0.02–0.12 at the low end (shouting vs
normal speech), while DIFFERENT people score 0.05 typical and up to 0.66. A single fingerprint per
person and one threshold therefore cannot be reliable. This tracker:

  1. keeps a BANK of voice-prints per person (up to `bank` lines) and scores a new line by the mean
     of its `topk` closest prints — a shout is compared with that person's earlier shouts;
  2. creates a new speaker only from a clearly different (score < `new`), long enough
     (≥ `min_new_s`), not-shouted line; shouts and short lines stay with the current speaker unless
     another speaker clearly matches;
  3. has a grey zone (`new` ≤ score < `assign`): the line goes to the best speaker with LOW
     confidence and is not learned from;
  4. MERGES two labels when their banks turn out to be the same voice (`merge`), relabelling the
     earlier lines (`drain_merges()` → (old, new) pairs), so one person keeps one label;
  5. `offline_labels()` re-clusters a whole recording at the end (two-pass, for reports).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import numpy.typing as npt

from engine.config import SpeakerConfig

Vec = npt.NDArray[np.float32]
COLORS = ["#4FA3FF", "#F5A524", "#17C964", "#F31260", "#9B7BFF", "#2BD4D4", "#FF8A3D", "#E8E36B"]


def _norm(v: Vec) -> Vec:
    return np.asarray(v / (np.linalg.norm(v) + 1e-9), dtype=np.float32)


@dataclass
class Assignment:
    speaker_id: str
    similarity: float
    confidence: str  # high | low | new
    is_new: bool
    sims: dict[str, float]


@dataclass
class _Spk:
    bank: list[Vec] = field(default_factory=list)
    lines: int = 0
    speech_s: float = 0.0
    enrolled: bool = False  # known person: never merged with another known person


class SpeakerTracker:
    def __init__(
        self,
        cfg: SpeakerConfig,
        assign: float = 0.22,  # tuned on 2/3/6-speaker clips (BUILD_LOG V7)
        new: float = 0.18,
        merge: float = 0.34,
        topk: int = 3,
        bank: int = 40,
        short_s: float = 0.8,
        min_new_s: float = 1.5,
        shout_z: float = 1.5,
    ) -> None:
        self.cfg = cfg
        self.t_assign, self.t_new, self.t_merge = assign, new, merge
        self.topk, self.bank_max = topk, bank
        self.short_s, self.min_new_s, self.shout_z = short_s, min_new_s, shout_z
        self.spk: dict[str, _Spk] = {}
        self.names: dict[str, str] = {}
        self.enrolled = False
        self._n = 0
        self._merges: list[tuple[str, str]] = []
        self._loud: list[float] = []

    # ---- compatibility with OnlineClusterer (orchestrator, enrollment) ----
    @property
    def centroids(self) -> dict[str, Vec]:
        return {k: _norm(np.mean(v.bank, axis=0)) for k, v in self.spk.items() if v.bank}

    @property
    def counts(self) -> dict[str, int]:
        return {k: v.lines for k, v in self.spk.items()}

    def color(self, sid: str) -> str:
        idx = int(sid[1:]) - 1 if sid[1:].isdigit() else 0
        return COLORS[idx % len(COLORS)]

    def enroll(self, name: str, embeddings: list[Vec]) -> str:
        sid = self._new_id()
        self.spk[sid] = _Spk(
            bank=[_norm(e) for e in embeddings], lines=len(embeddings), enrolled=True
        )
        self.names[sid] = name
        if not self.enrolled:  # known voices: choose among them (measured best: assign 0.15, top-5)
            self.t_assign, self.topk = min(self.t_assign, 0.15), 5
        self.enrolled = True
        return sid

    def best_match(self, emb: Vec) -> tuple[str | None, float]:
        sims = self.similarities(emb)
        if not sims:
            return None, 0.0
        best = max(sims, key=lambda k: sims[k])
        return best, sims[best]

    # ---- core ----
    def _new_id(self) -> str:
        self._n += 1
        return f"S{self._n}"

    def _score(self, e: Vec, s: _Spk) -> float:
        if not s.bank:
            return -1.0
        sims = np.stack(s.bank) @ e
        k = min(self.topk, sims.size)
        return float(np.mean(np.sort(sims)[-k:]))

    def similarities(self, emb: Vec) -> dict[str, float]:
        e = _norm(emb)
        return {sid: self._score(e, s) for sid, s in self.spk.items()}

    def _loud_z(self, loudness_db: float | None) -> float:
        if loudness_db is None:
            return 0.0
        self._loud.append(loudness_db)
        hist = self._loud[-200:]
        if len(hist) < 5:
            return 0.0
        med = float(np.median(hist))
        mad = max(1.0, 1.4826 * float(np.median(np.abs(np.asarray(hist) - med))))
        return (loudness_db - med) / mad

    def assign(
        self,
        emb: Vec,
        duration_s: float,
        prev_speaker: str | None,
        key: str = "",
        loudness_db: float | None = None,
    ) -> Assignment:
        e = _norm(emb)
        z = self._loud_z(loudness_db)
        sims = {sid: self._score(e, s) for sid, s in self.spk.items()}
        if not sims:
            return self._create(e, duration_s, sims)
        best = max(sims, key=lambda k: sims[k])
        b = sims[best]
        prev = prev_speaker if prev_speaker in sims else None

        # short interjections: stay with the current speaker unless someone else clearly matches
        if duration_s < self.short_s and prev is not None:
            if best != prev and b >= self.t_assign + 0.1:
                return Assignment(best, b, "low", False, sims)
            return Assignment(prev, sims[prev], "low", False, sims)

        if b >= self.t_assign:
            self._learn(best, e, duration_s)
            return Assignment(best, b, "high", False, sims)

        can_grow = len(self.spk) < self.cfg.max_speakers and not self.enrolled
        shouted = z >= self.shout_z
        if can_grow and b < self.t_new and duration_s >= self.min_new_s and not shouted:
            a = self._create(e, duration_s, sims)
            self._check_merges()
            return a
        # grey zone (or a shout / too short to start someone new): best guess, not learned from
        pick = prev if prev is not None and sims[prev] >= b - 0.05 else best
        return Assignment(pick, sims[pick], "low", False, sims)

    def _create(self, e: Vec, duration_s: float, sims: dict[str, float]) -> Assignment:
        sid = self._new_id()
        self.spk[sid] = _Spk(bank=[e], lines=1, speech_s=duration_s)
        self.names[sid] = f"Commentator {len(self.spk)}"
        return Assignment(sid, 1.0, "new", True, sims)

    def _learn(self, sid: str, e: Vec, duration_s: float) -> None:
        s = self.spk[sid]
        s.lines += 1
        s.speech_s += duration_s
        if duration_s >= 1.0:
            s.bank.append(e)
            if len(s.bank) > self.bank_max:
                s.bank.pop(1)  # keep the first (anchor) print, drop the oldest after it
        self._check_merges()

    def _check_merges(self) -> None:
        ids = list(self.spk)
        for i, a in enumerate(ids):
            for b in ids[i + 1 :]:
                if a not in self.spk or b not in self.spk:
                    continue
                sa, sb = self.spk[a], self.spk[b]
                if not sa.bank or not sb.bank or (sa.enrolled and sb.enrolled):
                    continue
                cross = np.mean([self._score(x, sa) for x in sb.bank])
                if cross >= self.t_merge:
                    self._merge(keep=a, drop=b)

    def _merge(self, keep: str, drop: str) -> None:
        k, d = self.spk[keep], self.spk.pop(drop)
        k.bank = (k.bank + d.bank)[-self.bank_max :]
        k.lines += d.lines
        k.speech_s += d.speech_s
        self.names.pop(drop, None)
        self._merges.append((drop, keep))

    def merge(self, drop: str, keep: str) -> bool:
        """Manual correction: `drop` is the same person as `keep`."""
        if drop == keep or drop not in self.spk or keep not in self.spk:
            return False
        self._merge(keep=keep, drop=drop)
        return True

    def drain_merges(self) -> list[tuple[str, str]]:
        out, self._merges = self._merges, []
        return out


def offline_labels(emb: np.ndarray, durations: list[float], threshold: float = 0.5) -> list[str]:
    """Two-pass labelling of a whole recording: average-linkage clustering of the lines ≥ 1 s
    (cosine distance < threshold joins), then short lines take their nearest cluster."""
    from sklearn.cluster import AgglomerativeClustering

    e = emb / (np.linalg.norm(emb, axis=1, keepdims=True) + 1e-9)
    d = np.asarray(durations)
    long_idx = np.where(d >= 1.0)[0]
    if long_idx.size < 2:
        return ["S1"] * len(durations)
    cl = AgglomerativeClustering(n_clusters=None, metric="cosine", linkage="average",
                                 distance_threshold=threshold).fit(e[long_idx])  # fmt: skip
    labels = np.full(len(durations), -1)
    labels[long_idx] = cl.labels_
    cents = {c: e[long_idx[cl.labels_ == c]].mean(axis=0) for c in set(cl.labels_)}
    for i in np.where(labels < 0)[0]:
        labels[i] = max(cents, key=lambda c: float(e[i] @ cents[c]))
    # stable names in order of first appearance
    order: dict[int, str] = {}
    for lb in labels:
        if lb not in order:
            order[int(lb)] = f"S{len(order) + 1}"
    return [order[int(lb)] for lb in labels]
