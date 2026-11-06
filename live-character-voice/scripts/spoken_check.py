"""End-to-end check of what the character voices ACTUALLY said (not just what was transcribed).

For one session folder (needs the clip's truth file):
  * asr WER       — transcription of the original commentary vs the truth script
  * voiced WER    — text of the lines that were voiced (dropped lines count as missing)
  * spoken WER    — every generated voice file transcribed again (local Whisper) and joined in
                    play order: catches dropped lines, cut-off audio and words the TTS skipped
  * missing words — the truth words absent from what was spoken, with their time
  * perceived delay — when the voice started vs when the original line started, in the viewer's
                    timeline (subtracts the broadcast delay in synced mode)
Usage: python scripts/spoken_check.py outputs/sessions/<id> [--truth data/clips/x.truth.json]
Writes <session>/spoken_check.json.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parent.parent


def pct(xs: list[float]) -> dict[str, float | None]:
    if not xs:
        return {"p50": None, "p95": None, "max": None}
    a = np.asarray(xs)
    q = np.percentile(a, [50, 95])
    return {"p50": round(float(q[0]), 3), "p95": round(float(q[1]), 3),
            "max": round(float(a.max()), 3)}  # fmt: skip


def main() -> int:
    import jiwer

    from engine.ingest.decode import decode_audio
    from engine.tts.text_normalize import normalize_for_wer

    p = argparse.ArgumentParser()
    p.add_argument("session")
    p.add_argument("--truth", default=None)
    p.add_argument("--no-retranscribe", action="store_true")
    a = p.parse_args()
    sdir = Path(a.session)
    rec = json.loads((sdir / "record.json").read_text())
    clip = Path(rec.get("clip") or rec.get("clip_path") or "")
    truth_path = Path(a.truth) if a.truth else ROOT / "data" / "clips" / (clip.stem + ".truth.json")
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

    asr_text = " ".join(ln["text"] or "" for ln in lines)
    voiced = [ln for ln in lines if ln["schedule_action"] != "dropped" and ln.get("tts_path")]
    # merged lines are spoken inside their parent's audio: keep their text for "voiced"
    voiced_text = " ".join(ln["text"] or "" for ln in lines if ln["schedule_action"] != "dropped")
    out: dict[str, Any] = {
        "session": sdir.name,
        "lines": len(lines),
        "actions": actions,
        "ref_words": len(ref.split()),
        "asr": wer(asr_text),
        "voiced": wer(voiced_text),
    }
    sync = float(rec.get("config_snapshot", {}).get("schedule", {}).get("broadcast_delay_s") or 0.0)
    starts = []
    for ln in voiced:
        t = ln["times"]
        if t.get("play_at") is not None:
            starts.append(t["play_at"] - sync - ln["t_start"])
    out["perceived_delay_start"] = pct(starts)
    if not a.no_retranscribe:
        from faster_whisper import WhisperModel

        model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
        spoken = []
        for ln in voiced:
            path = Path(ln["tts_path"])
            if not path.exists():
                continue
            audio = decode_audio(path, 16000)
            segs, _ = model.transcribe(audio, beam_size=5, language="en", vad_filter=False)
            spoken.append(" ".join(s.text.strip() for s in segs))
        spoken_text = " ".join(spoken)
        out["spoken"] = wer(spoken_text)
        o = jiwer.process_words(ref, normalize_for_wer(spoken_text) or "<empty>")
        missing = []
        rw = ref.split()
        for ch in o.alignments[0]:
            if ch.type == "delete":
                missing.append(" ".join(rw[ch.ref_start_idx : ch.ref_end_idx]))
        out["missing_words"] = missing
    (sdir / "spoken_check.json").write_text(json.dumps(out, indent=2))
    print(json.dumps({k: v for k, v in out.items() if k != "missing_words"}, indent=1))
    if out.get("missing_words"):
        print("missing:", " | ".join(out["missing_words"][:40]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
