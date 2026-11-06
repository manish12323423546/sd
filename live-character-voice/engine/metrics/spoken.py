"""What the character voices ACTUALLY said, scored against the truth script (V3 measurement,
used by `scripts/spoken_check.py` and the in-app Quality Lab).

  asr WER     transcription of the original commentary vs the truth
  voiced WER  text of the lines that were voiced (dropped lines count as missing)
  spoken WER  every generated voice file transcribed again (local Whisper small.en, beam 5) and
              joined in play order — catches dropped lines, cut-off audio and skipped words
  missing     truth words absent from what was spoken
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_model: Any = None


def _whisper() -> Any:
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
    return _model


def spoken_check(session_dir: Path, truth_path: Path, retranscribe: bool = True) -> dict[str, Any]:
    import jiwer

    from engine.ingest.decode import decode_audio
    from engine.tts.text_normalize import normalize_for_wer

    rec = json.loads((session_dir / "record.json").read_text())
    truth = json.loads(truth_path.read_text())["lines"]
    ref = normalize_for_wer(" ".join(t["text"] for t in truth))
    lines = sorted(rec["lines"], key=lambda ln: ln["t_start"])
    actions: dict[str, int] = {}
    for ln in lines:
        actions[ln["schedule_action"]] = actions.get(ln["schedule_action"], 0) + 1

    def wer(hyp: str) -> dict[str, Any]:
        o = jiwer.process_words(ref, normalize_for_wer(hyp) or "<empty>")
        return {"wer": round(float(o.wer), 4), "deletions": o.deletions,
                "substitutions": o.substitutions, "insertions": o.insertions}  # fmt: skip

    voiced = [ln for ln in lines if ln["schedule_action"] != "dropped" and ln.get("tts_path")]
    out: dict[str, Any] = {
        "lines": len(lines),
        "actions": actions,
        "ref_words": len(ref.split()),
        "asr": wer(" ".join(ln["text"] or "" for ln in lines)),
        "voiced": wer(
            " ".join(ln["text"] or "" for ln in lines if ln["schedule_action"] != "dropped")
        ),
    }
    if retranscribe:
        model = _whisper()
        spoken = []
        for ln in voiced:
            path = Path(ln["tts_path"])
            if not path.exists():
                continue
            segs, _ = model.transcribe(decode_audio(path, 16000), beam_size=5, language="en",
                                       vad_filter=False)  # fmt: skip
            spoken.append(" ".join(s.text.strip() for s in segs))
        text = " ".join(spoken)
        out["spoken"] = wer(text)
        o = jiwer.process_words(ref, normalize_for_wer(text) or "<empty>")
        rw = ref.split()
        out["missing_words"] = [
            " ".join(rw[ch.ref_start_idx : ch.ref_end_idx])
            for ch in o.alignments[0]
            if ch.type == "delete"
        ]
    return out
