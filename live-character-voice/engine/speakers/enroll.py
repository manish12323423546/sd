"""Enrollment file loader (docs/04 §4). Accepts single spans or lists of spans per speaker:

speakers:
  - name: Commentator A
    t_start: 0.0
    t_end: 8.0
  - name: Commentator B
    spans: [[10.0, 14.0], [20.0, 24.0]]
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field, model_validator


class EnrollSpeaker(BaseModel):
    name: str
    spans: list[tuple[float, float]] = Field(default_factory=list)
    t_start: float | None = None
    t_end: float | None = None
    truth_speaker: str | None = None

    @model_validator(mode="after")
    def _merge_single_span(self) -> EnrollSpeaker:
        if self.t_start is not None and self.t_end is not None:
            self.spans = [(self.t_start, self.t_end), *self.spans]
        if not self.spans:
            raise ValueError(f"speaker {self.name!r} has no spans")
        for a, b in self.spans:
            if b <= a:
                raise ValueError(f"bad span {a}–{b} for {self.name!r}")
        return self

    @property
    def total_s(self) -> float:
        return sum(b - a for a, b in self.spans)

    @property
    def last_end(self) -> float:
        return max(b for _, b in self.spans)


class EnrollFile(BaseModel):
    speakers: list[EnrollSpeaker]

    @property
    def ready_at(self) -> float:
        """Media time when every enrollment span has been heard (live-honest enrollment)."""
        return max(s.last_end for s in self.speakers)


def load_enroll(path: str | Path) -> EnrollFile:
    data = yaml.safe_load(Path(path).read_text())
    return EnrollFile.model_validate(data)
