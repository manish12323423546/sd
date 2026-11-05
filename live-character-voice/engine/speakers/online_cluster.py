"""Online speaker clustering (our code, docs/04 §4).

- Up to `max_speakers` centroids; cosine similarity of the (L2-normalised) line embedding to each.
- best ≥ assign_sim → assign; EMA-update the centroid (alpha) only for lines ≥ 1.0 s.
- else, if fewer than max centroids and line ≥ 1.5 s → new speaker.
- else → best match with confidence "low".
- Short-line rule: lines < 0.8 s inherit the previous line's speaker unless the best similarity to
  another speaker is ≥ 0.7.
- Enrollment: centroids initialised from reference spans; names come from the enroll file.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

from engine.config import SpeakerConfig

Vec = npt.NDArray[np.float32]
COLORS = ["#4FA3FF", "#F5A524", "#17C964"]
SHORT_LINE_S = 0.8
SHORT_OVERRIDE_SIM = 0.7
MIN_UPDATE_S = 1.0
MIN_NEW_S = 1.5


@dataclass
class Assignment:
    speaker_id: str
    similarity: float
    confidence: str  # high | low
    is_new: bool
    sims: dict[str, float]


def _norm(v: Vec) -> Vec:
    return np.asarray(v / (np.linalg.norm(v) + 1e-9), dtype=np.float32)


class OnlineClusterer:
    def __init__(self, cfg: SpeakerConfig) -> None:
        self.cfg = cfg
        self.centroids: dict[str, Vec] = {}
        self.counts: dict[str, int] = {}
        self.names: dict[str, str] = {}
        self.enrolled = False

    def next_id(self) -> str:
        return f"S{len(self.centroids) + 1}"

    def enroll(self, name: str, embeddings: list[Vec]) -> str:
        sid = self.next_id()
        mean = np.mean(np.stack([_norm(e) for e in embeddings]), axis=0)
        self.centroids[sid] = _norm(mean.astype(np.float32))
        self.counts[sid] = len(embeddings)
        self.names[sid] = name
        self.enrolled = True
        return sid

    def similarities(self, emb: Vec) -> dict[str, float]:
        e = _norm(emb)
        return {sid: float(np.dot(e, c)) for sid, c in self.centroids.items()}

    def assign(self, emb: Vec, duration_s: float, prev_speaker: str | None) -> Assignment:
        sims = self.similarities(emb)
        if not sims:
            return self._create(emb, sims)
        best = max(sims, key=lambda k: sims[k])
        best_sim = sims[best]

        if duration_s < SHORT_LINE_S and prev_speaker in sims:
            others = {k: v for k, v in sims.items() if k != prev_speaker}
            if not others or max(others.values()) < SHORT_OVERRIDE_SIM:
                return Assignment(prev_speaker, sims[prev_speaker], "low", False, sims)
            best = max(others, key=lambda k: others[k])
            return Assignment(best, others[best], "high", False, sims)

        can_grow = len(self.centroids) < self.cfg.max_speakers and not (
            self.enrolled and len(self.centroids) >= self.cfg.max_speakers
        )
        if best_sim >= self.cfg.assign_sim:
            if duration_s >= MIN_UPDATE_S:
                self._update(best, emb)
            return Assignment(best, best_sim, "high", False, sims)
        if can_grow and duration_s >= MIN_NEW_S:
            return self._create(emb, sims)
        return Assignment(best, best_sim, "low", False, sims)

    def best_match(self, emb: Vec) -> tuple[str | None, float]:
        sims = self.similarities(emb)
        if not sims:
            return None, 0.0
        best = max(sims, key=lambda k: sims[k])
        return best, sims[best]

    def _create(self, emb: Vec, sims: dict[str, float]) -> Assignment:
        sid = self.next_id()
        self.centroids[sid] = _norm(emb)
        self.counts[sid] = 1
        self.names[sid] = f"Commentator {len(self.centroids)}"
        return Assignment(sid, 1.0, "high", True, sims)

    def _update(self, sid: str, emb: Vec) -> None:
        a = self.cfg.ema_alpha
        self.centroids[sid] = _norm((1 - a) * self.centroids[sid] + a * _norm(emb))
        self.counts[sid] += 1

    def color(self, sid: str) -> str:
        idx = list(self.centroids).index(sid) if sid in self.centroids else 0
        return COLORS[idx % len(COLORS)]
