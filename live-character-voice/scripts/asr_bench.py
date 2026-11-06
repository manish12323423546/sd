"""Speech-to-text bench (V8): same phrases, each engine, word error rate + time per phrase.

Every truth line of a scored clip is cut out (with 0.2 s padding) and sent to each engine exactly
as the live pipeline would. Groq is limited to ~20 requests/min on the free tier, so lines are
paced for it. Engines without a working key are skipped.
Usage: python scripts/asr_bench.py [--clips synthetic_match ...] [--engines deepgram groq local]
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def make(name: str) -> Any:
    from engine.providers.free.asr_faster_whisper import FasterWhisperASR

    class _Fail:  # no silent fallback: a failed request counts as an empty line
        def transcribe(self, *a: Any, **k: Any) -> Any:
            from engine.providers.base import ASRResult

            return ASRResult(text="", source="failed")

    if name == "deepgram":
        from engine.providers.paid.asr_deepgram import DeepgramASR

        return DeepgramASR(fallback=_Fail())
    if name == "groq":
        from engine.providers.free.asr_groq import GroqASR

        return GroqASR(fallback=_Fail())
    return FasterWhisperASR("small.en")


def main() -> int:
    import jiwer

    from engine.env import load_env
    from engine.ingest.decode import decode_audio
    from engine.keycheck import check_deepgram, check_groq
    from engine.metrics.compute import normalize_for_wer

    load_env()
    p = argparse.ArgumentParser()
    p.add_argument("--clips", nargs="*", default=["synthetic_match", "synthetic_panel_6spk"])
    p.add_argument("--engines", nargs="*", default=["deepgram", "groq"])
    a = p.parse_args()
    ok = {"deepgram": check_deepgram().ok, "groq": check_groq().ok, "local": True}
    rows = []
    for eng in a.engines:
        if not ok.get(eng):
            print(f"skip {eng}: no working key")
            continue
        asr = make(eng)
        refs, hyps, secs, failed = [], [], [], 0
        for clip in a.clips:
            truth = json.loads((ROOT / f"data/clips/{clip}.truth.json").read_text())["lines"]
            audio = decode_audio(ROOT / f"data/clips/{clip}.mp4")
            for t in truth:
                s0, s1 = max(0, int((t["t_start"] - 0.2) * 16000)), int((t["t_end"] + 0.2) * 16000)
                t0 = time.monotonic()
                r = asr.transcribe(audio[s0:s1], 16000, None)
                secs.append(time.monotonic() - t0)
                failed += r.source == "failed"
                refs.append(t["text"])
                hyps.append(r.text)
                if eng == "groq":
                    time.sleep(max(0.0, 3.1 - secs[-1]))  # free tier: stay under 20/min
        ref = normalize_for_wer(" ".join(refs))
        hyp = normalize_for_wer(" ".join(hyps)) or "<empty>"
        w = jiwer.process_words(ref, hyp)
        secs.sort()
        rows.append(
            (eng, len(refs), w.wer, statistics.median(secs), secs[int(0.95 * (len(secs) - 1))], failed)
        )
    print(f"\n{'engine':10s} {'lines':>5s} {'WER':>7s} {'p50 s':>7s} {'p95 s':>7s} {'failed':>6s}")
    for eng, n, wer, p50, p95, f in rows:
        print(f"{eng:10s} {n:5d} {wer * 100:6.2f}% {p50:7.2f} {p95:7.2f} {f:6d}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
