"""lines.csv export: one row per line (ids, times, text, speaker, emotion, stages, delay)."""

from __future__ import annotations

import csv
import io
from pathlib import Path

from engine.record.models import SessionRecord

COLUMNS = [
    "line_id", "t_start", "t_end", "close_reason", "speaker_id", "speaker_sim", "speaker_conf",
    "emotion", "arousal", "text", "voice_id", "tts_duration", "schedule_action", "error",
    "created", "asr_done", "speaker_done", "emotion_done", "complete", "tts_start", "tts_ready",
    "play_at", "played", "delay_ready", "delay_play",
]  # fmt: skip


def lines_csv(rec: SessionRecord) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(COLUMNS)
    for ln in rec.lines:
        t = ln.times
        delay_play = None if t.play_at is None else round(t.play_at - ln.t_end, 3)
        delay_ready = None if ln.delay_ready is None else round(ln.delay_ready, 3)
        w.writerow(
            [
                ln.line_id,
                ln.t_start,
                ln.t_end,
                ln.close_reason,
                ln.speaker_id,
                ln.speaker_sim,
                ln.speaker_conf,
                ln.emotion.value if ln.emotion else None,
                ln.arousal,
                ln.text,
                ln.voice_id,
                ln.tts_duration,
                ln.schedule_action,
                ln.error,
                t.created,
                t.asr_done,
                t.speaker_done,
                t.emotion_done,
                t.complete,
                t.tts_start,
                t.tts_ready,
                t.play_at,
                t.played,
                delay_ready,
                delay_play,
            ]
        )
    return buf.getvalue()


def write_lines_csv(rec: SessionRecord, path: Path) -> None:
    path.write_text(lines_csv(rec), encoding="utf-8")
