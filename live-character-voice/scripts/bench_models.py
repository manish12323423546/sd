"""Per-model speed benchmark on this VM (docs/10 M1) → outputs/bench.json.

Times ASR (small.en, base.en), ECAPA and Kokoro on ~3 s samples, 10 runs each, p50/p95.
Samples are real ~3 s lines cut from the synthetic clip (run `make synth` first).
Also measures each stage while the other two run at the same time ("contended"), because that is
what happens live.
"""

from __future__ import annotations

import argparse
import json
import platform
import sys
import threading
import time
import warnings
from collections.abc import Callable
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
warnings.filterwarnings("ignore")

from engine.ingest.decode import decode_audio  # noqa: E402
from engine.providers.base import DeliveryStyle  # noqa: E402

SR = 16000


def pct(xs: list[float]) -> dict[str, float]:
    a = np.asarray(xs)
    return {
        "p50": round(float(np.percentile(a, 50)), 3),
        "p95": round(float(np.percentile(a, 95)), 3),
        "max": round(float(a.max()), 3),
        "n": len(xs),
    }


def time_runs(fn: Callable[[int], Any], runs: int) -> list[float]:
    fn(0)  # warm-up (not counted)
    out = []
    for i in range(runs):
        t = time.monotonic()
        fn(i)
        out.append(time.monotonic() - t)
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--clip", default=str(ROOT / "data/clips/synthetic_match.mp4"))
    p.add_argument("--runs", type=int, default=10)
    p.add_argument("--asr-threads", type=int, default=4)
    args = p.parse_args()

    truth = json.loads(Path(args.clip).with_suffix(".truth.json").read_text())
    audio = decode_audio(args.clip, SR)
    # ~3 s lines (2.6–3.6 s), with the 120 ms padding the engine uses
    picks = [ln for ln in truth["lines"] if 2.6 <= ln["t_end"] - ln["t_start"] <= 3.6]
    samples = [
        audio[int((ln["t_start"] - 0.12) * SR) : int((ln["t_end"] + 0.12) * SR)] for ln in picks
    ]
    texts = [ln["text"] for ln in picks]
    print(f"{len(samples)} samples of ~3 s, mean {np.mean([s.size / SR for s in samples]):.2f} s")

    from engine.providers.free.asr_faster_whisper import FasterWhisperASR
    from engine.providers.free.speaker_ecapa import EcapaSpeaker
    from engine.providers.free.tts_kokoro import KokoroTTS

    results: dict[str, Any] = {
        "vm": {"cpu_count": __import__("os").cpu_count(), "platform": platform.platform()},
        "sample_s_mean": round(float(np.mean([s.size / SR for s in samples])), 3),
        "runs": args.runs,
        "load_s": {},
        "isolated": {},
        "contended": {},
    }

    def load(name: str, fn: Callable[[], Any]) -> Any:
        t = time.monotonic()
        obj = fn()
        results["load_s"][name] = round(time.monotonic() - t, 2)
        print(f"loaded {name} in {results['load_s'][name]} s")
        return obj

    asr_small = load("asr_small.en", lambda: FasterWhisperASR("small.en", "int8", args.asr_threads))
    asr_base = load("asr_base.en", lambda: FasterWhisperASR("base.en", "int8", args.asr_threads))
    ecapa = load("ecapa", lambda: EcapaSpeaker())
    tts = load("kokoro", lambda: KokoroTTS())

    def s(i: int) -> np.ndarray:
        return samples[i % len(samples)]

    jobs: dict[str, Callable[[int], Any]] = {
        "asr_small.en": lambda i: asr_small.transcribe(s(i), SR),
        "asr_base.en": lambda i: asr_base.transcribe(s(i), SR),
        "ecapa": lambda i: ecapa.embed(s(i), SR),
        "kokoro": lambda i: tts.synthesize(texts[i % len(texts)], "bm_george", DeliveryStyle()),
    }
    for name, fn in jobs.items():
        results["isolated"][name] = pct(time_runs(fn, args.runs))
        print(f"isolated  {name:<14} {results['isolated'][name]}")

    # TTS real-time factor (audio seconds produced per wall second)
    t = time.monotonic()
    produced = sum(
        tts.synthesize(texts[i % len(texts)], "am_adam", DeliveryStyle()).duration_s
        for i in range(5)
    )
    results["kokoro_realtime_factor"] = round(produced / (time.monotonic() - t), 2)

    # contended: run ASR (each model) while TTS + ECAPA loop in background threads
    for asr_name in ("asr_small.en", "asr_base.en"):
        stop = threading.Event()

        def background(fn: Callable[[int], Any], stop: threading.Event = stop) -> None:
            i = 0
            while not stop.is_set():
                fn(i)
                i += 1

        bg = [
            threading.Thread(target=background, args=(jobs[k],), daemon=True)
            for k in ("kokoro", "ecapa")
        ]
        for th in bg:
            th.start()
        times = time_runs(jobs[asr_name], args.runs)
        stop.set()
        for th in bg:
            th.join()
        results["contended"][asr_name] = pct(times)
        print(f"contended {asr_name:<14} {results['contended'][asr_name]}")

    # TTS under ASR load
    stop = threading.Event()

    def asr_loop() -> None:
        i = 0
        while not stop.is_set():
            jobs["asr_small.en"](i)
            i += 1

    th = threading.Thread(target=asr_loop, daemon=True)
    th.start()
    results["contended"]["kokoro"] = pct(time_runs(jobs["kokoro"], args.runs))
    stop.set()
    th.join()
    print(f"contended kokoro         {results['contended']['kokoro']}")

    small_p95 = results["isolated"]["asr_small.en"]["p95"]
    results["asr_choice"] = "small.en" if small_p95 <= 1.5 else "base.en"
    results["asr_choice_rule"] = "small.en if isolated p95 on ~3 s ≤ 1.5 s, else base.en"
    out = ROOT / "outputs" / "bench.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"ASR choice: {results['asr_choice']} (small.en p95 {small_p95} s). Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
