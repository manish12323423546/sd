"""Command line entry point: `python -m engine.cli <command>` (docs/06 §6.3).

M0 implements `check`. Later milestones add download-models, bench, poc and report.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from importlib import metadata
from pathlib import Path

REQUIRED_TOOLS: dict[str, list[str]] = {
    "ffmpeg": ["ffmpeg", "-version"],
    "ffprobe": ["ffprobe", "-version"],
    "espeak-ng": ["espeak-ng", "--version"],
}
OPTIONAL_TOOLS: dict[str, list[str]] = {
    "sox": ["sox", "--version"],
    "node": ["node", "--version"],
    "npm": ["npm", "--version"],
}
PY_PACKAGES = [
    "numpy",
    "pydantic",
    "torch",
    "torchaudio",
    "faster-whisper",
    "ctranslate2",
    "speechbrain",
    "kokoro",
    "silero-vad",
    "librosa",
    "fastapi",
    "uvicorn",
]
# (label, url). The model-file URL follows HF's redirect to its CDN, so it proves that real
# downloads work, not just the website.
NETWORK_TARGETS: list[tuple[str, str]] = [
    ("huggingface.co", "https://huggingface.co/api/models/hexgrad/Kokoro-82M"),
    (
        "huggingface.co (file download via CDN)",
        "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/config.json",
    ),
    ("download.pytorch.org", "https://download.pytorch.org/whl/cpu/"),
]
HF_MODEL_REPOS = [
    "Systran/faster-whisper-small.en",
    "Systran/faster-whisper-base.en",
    "speechbrain/spkrec-ecapa-voxceleb",
    "hexgrad/Kokoro-82M",
]


@dataclass
class CheckItem:
    name: str
    ok: bool
    detail: str
    required: bool = True


def check_tool(name: str, cmd: list[str], required: bool = True) -> CheckItem:
    if shutil.which(cmd[0]) is None:
        hint = f"missing — install with: apt-get install -y {name}" if required else "missing"
        return CheckItem(name, False, hint, required)
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        first = (out.stdout or out.stderr).strip().splitlines()
        return CheckItem(name, True, first[0] if first else "ok", required)
    except (OSError, subprocess.TimeoutExpired) as e:
        return CheckItem(name, False, f"error: {e}", required)


def check_package(name: str) -> CheckItem:
    try:
        return CheckItem(f"py:{name}", True, metadata.version(name), required=False)
    except metadata.PackageNotFoundError:
        return CheckItem(f"py:{name}", False, "not installed", required=False)


def check_url(label: str, url: str, timeout: float = 15.0) -> CheckItem:
    req = urllib.request.Request(url, method="GET", headers={"User-Agent": "lcv-check/0.1"})
    ctx = ssl.create_default_context()
    bundle = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    if bundle and Path(bundle).exists():
        ctx.load_verify_locations(bundle)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            resp.read(256)
            return CheckItem(f"net:{label}", True, f"OK (HTTP {resp.status})", required=False)
    except urllib.error.HTTPError as e:
        return CheckItem(f"net:{label}", False, f"BLOCKED/ERROR (HTTP {e.code})", required=False)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return CheckItem(f"net:{label}", False, f"BLOCKED/UNREACHABLE ({e})", required=False)


def hf_cache_dir() -> Path:
    home = os.environ.get("HF_HOME")
    return Path(home) / "hub" if home else Path.home() / ".cache" / "huggingface" / "hub"


def check_model_cache() -> list[CheckItem]:
    cache = hf_cache_dir()
    items = []
    for repo in HF_MODEL_REPOS:
        folder = cache / ("models--" + repo.replace("/", "--"))
        present = folder.exists() and any(folder.rglob("*"))
        items.append(
            CheckItem(
                f"model:{repo}",
                present,
                "cached" if present else "not downloaded yet (M1)",
                required=False,
            )
        )
    return items


def system_info() -> dict[str, str]:
    mem = "unknown"
    meminfo = Path("/proc/meminfo")
    if meminfo.exists():
        for row in meminfo.read_text().splitlines():
            if row.startswith("MemTotal:"):
                mem = f"{int(row.split()[1]) / 1024 / 1024:.1f} GiB"
    return {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "cpu_count": str(os.cpu_count()),
        "memory": mem,
    }


def run_check(network: bool = True) -> tuple[dict[str, str], list[CheckItem]]:
    items = [check_tool(n, c) for n, c in REQUIRED_TOOLS.items()]
    items += [check_tool(n, c, required=False) for n, c in OPTIONAL_TOOLS.items()]
    items += [check_package(p) for p in PY_PACKAGES]
    items += check_model_cache()
    if network:
        items += [check_url(label, url) for label, url in NETWORK_TARGETS]
    return system_info(), items


def cmd_check(args: argparse.Namespace) -> int:
    info, items = run_check(network=not args.no_network)
    if args.json:
        print(json.dumps({"system": info, "checks": [asdict(i) for i in items]}, indent=2))
    else:
        print("== System ==")
        for k, v in info.items():
            print(f"  {k:<10} {v}")
        print("== Checks ==")
        for i in items:
            mark = "OK  " if i.ok else ("FAIL" if i.required else "--  ")
            print(f"  [{mark}] {i.name:<42} {i.detail}")
        blocked = [i for i in items if i.name.startswith("net:") and not i.ok]
        if blocked:
            print("\nNetwork blocked. Add these domains to the environment's Custom network list:")
            print(
                "  huggingface.co, *.huggingface.co, *.hf.co, download.pytorch.org, *.pytorch.org"
            )
    failed_required = [i for i in items if i.required and not i.ok]
    return 1 if failed_required else 0


def _run_script(name: str, extra: list[str]) -> int:
    script = Path(__file__).resolve().parent.parent / "scripts" / name
    return subprocess.run([sys.executable, str(script), *extra]).returncode


def cmd_download_models(args: argparse.Namespace) -> int:
    return _run_script("download_models.py", [])


def cmd_bench(args: argparse.Namespace) -> int:
    return _run_script("bench_models.py", ["--clip", args.clip, "--runs", str(args.runs)])


def _parse_voices(spec: str | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in (spec or "").split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def _find_truth(clip: Path, explicit: str | None) -> Path | None:
    if explicit:
        return Path(explicit)
    guess = clip.with_suffix(".truth.json")
    return guess if guess.exists() else None


def cmd_poc(args: argparse.Namespace) -> int:
    import asyncio
    import time
    from datetime import datetime

    from engine.config import load_engine_config
    from engine.ingest.decode import probe
    from engine.metrics.compute import compute_all
    from engine.metrics.export import write_lines_csv
    from engine.orchestrator import Models, Session
    from engine.speakers.enroll import load_enroll

    cfg = load_engine_config(Path(args.config) if args.config else None)
    cfg.speed = args.speed
    if args.source:
        cfg.source = args.source
    if args.speakers:
        cfg.speaker.max_speakers = args.speakers
    if args.asr_model:
        cfg.asr.model = args.asr_model
    if args.no_split:
        cfg.segment.speaker_split = False
    clip = Path(args.clip)
    info = probe(clip)
    run_id = f"{datetime.now():%Y%m%d-%H%M%S}_{clip.stem}" + (
        f"_{args.label}" if args.label else ""
    )
    out = Path(args.out) / run_id
    out.mkdir(parents=True, exist_ok=True)
    stages = {"segment": set(), "understand": {"asr", "speaker"}}.get(
        args.stop_after, {"asr", "speaker", "tts"}
    )
    print(
        f"run {run_id}: clip {clip} ({info['duration']:.1f} s) speed {cfg.speed} "
        f"stop-after {args.stop_after}"
    )
    models = Models.load(cfg, stages, torch_threads=args.torch_threads)
    truth_path = _find_truth(clip, args.truth)
    truth = json.loads(truth_path.read_text()) if truth_path else None
    enroll = load_enroll(args.enroll) if args.enroll else None
    session = Session(
        cfg, clip, models, out, stop_after=args.stop_after, enroll=enroll,
        voice_map=_parse_voices(args.voices), captions_path=args.captions,
    )  # fmt: skip

    async def _run() -> None:
        sub = session.store.subscribe("session.metrics")

        async def progress() -> None:
            async for ev in sub:
                d = ev.data
                print(f"  t={session.clock.now():6.1f}s lines={d['lines']} "
                      f"p50={d['p50_delay']}s p95={d['p95_delay']}s last={d['last_delay']}s",
                      flush=True)  # fmt: skip

        task = asyncio.create_task(progress())
        await session.run()
        sub.close()
        await task

    t0 = time.monotonic()
    crashed = None
    try:
        asyncio.run(_run())
    except Exception as e:
        crashed = f"{type(e).__name__}: {e}"
    wall = time.monotonic() - t0
    rec = session.store.record
    session.store.checkpoint(out / "record.json")
    metrics = compute_all(rec, truth, float(info["duration"]))
    metrics["run"] = {
        "run_id": run_id,
        "clip": str(clip),
        "truth": str(truth_path) if truth_path else None,
        "enroll": args.enroll,
        "clip_duration_s": round(float(info["duration"]), 3),
        "wall_s": round(wall, 2),
        "live_wall_s": round((session.finished_wall or 0) - (session.started_wall or 0), 2),
        "speed": cfg.speed,
        "stop_after": args.stop_after,
        "crashes": 0 if crashed is None else 1,
        "crash": crashed,
        "models": models.info,
        "model_load_s": models.load_s,
        "cpu_count": os.cpu_count(),
        "config_hash": cfg.snapshot_hash(),
        "max_speakers": cfg.speaker.max_speakers,
        "voice_map": session.voice_map,
    }
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2, default=str))
    write_lines_csv(rec, out / "lines.csv")
    if args.stop_after == "all" and not args.no_render and crashed is None:
        from engine.render.mixer import render_all

        render_all(rec, clip, out, cfg, separate=args.separate)
    from engine.metrics.report import write_report

    write_report(out, metrics, rec)
    print(f"done in {wall:.1f} s → {out}")
    print(json.dumps(_summary(metrics), indent=2))
    if crashed:
        print(f"CRASH: {crashed}")
        return 2
    return 0


def _summary(m: dict[str, object]) -> dict[str, object]:
    keys = ("delay", "wer", "speaker", "emotion", "segmentation", "coverage", "schedule")
    out: dict[str, object] = {"wall_s": m["run"]["wall_s"]}  # type: ignore[index]
    for k in keys:
        if k in m:
            v = m[k]
            if k == "delay" and isinstance(v, dict):
                v = {"ready": v["delay_ready"], "drift": v["drift_slope_s_per_s"]}
            if k == "emotion" and isinstance(v, dict):
                v = {kk: vv for kk, vv in v.items() if kk != "confusion"}
            out[k] = v
    return out


def cmd_report(args: argparse.Namespace) -> int:
    from engine.metrics.compute import compute_all
    from engine.metrics.export import write_lines_csv
    from engine.metrics.report import write_report
    from engine.record.store import RecordStore

    run = Path(args.run)
    rec = RecordStore.load(run / "record.json")
    old = json.loads((run / "metrics.json").read_text()) if (run / "metrics.json").exists() else {}
    run_info = old.get("run", {})
    truth_path = _find_truth(Path(rec.clip_path), args.truth or run_info.get("truth"))
    truth = json.loads(truth_path.read_text()) if truth_path else None
    duration = float(run_info.get("clip_duration_s") or (truth or {}).get("duration") or 0.0)
    metrics = compute_all(rec, truth, duration)
    metrics["run"] = run_info
    (run / "metrics.json").write_text(json.dumps(metrics, indent=2, default=str))
    write_lines_csv(rec, run / "lines.csv")
    write_report(run, metrics, rec)
    print(f"report → {run / 'report.md'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="engine.cli", description="Live Sports Character Voice engine")
    sub = p.add_subparsers(dest="command", required=True)
    c = sub.add_parser("check", help="versions, CPU count, tools, model cache, network to HF")
    c.add_argument("--json", action="store_true", help="machine-readable output")
    c.add_argument("--no-network", action="store_true", help="skip network checks (CI)")
    c.set_defaults(func=cmd_check)
    d = sub.add_parser("download-models", help="pre-fetch all models into ~/.cache")
    d.set_defaults(func=cmd_download_models)
    b = sub.add_parser("bench", help="time each model on ~3 s samples → outputs/bench.json")
    b.add_argument("--clip", default="data/clips/synthetic_match.mp4")
    b.add_argument("--runs", type=int, default=10)
    b.set_defaults(func=cmd_bench)
    pc = sub.add_parser("poc", help="run the POC on a clip at live speed")
    pc.add_argument("--clip", required=True)
    pc.add_argument("--truth", default=None, help="default: <clip>.truth.json if present")
    pc.add_argument("--enroll", default=None)
    pc.add_argument("--speakers", type=int, default=None)
    pc.add_argument("--voices", default=None, help="S1=bm_george,S2=am_adam")
    pc.add_argument("--source", choices=["asr", "captions"], default=None)
    pc.add_argument("--captions", default=None)
    pc.add_argument("--speed", type=float, default=1.0)
    pc.add_argument("--separate", action="store_true", help="also render a Demucs clean demo")
    pc.add_argument("--out", default="outputs")
    pc.add_argument("--label", default="")
    pc.add_argument("--config", default=None)
    pc.add_argument("--asr-model", default=None)
    pc.add_argument("--torch-threads", type=int, default=None)
    pc.add_argument("--no-split", action="store_true", help="disable speaker-change split")
    pc.add_argument("--no-render", action="store_true")
    pc.add_argument("--stop-after", choices=["segment", "understand", "tts", "all"], default="all")
    pc.set_defaults(func=cmd_poc)
    rp = sub.add_parser("report", help="recompute metrics + report from record.json")
    rp.add_argument("--run", required=True)
    rp.add_argument("--truth", default=None)
    rp.set_defaults(func=cmd_report)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    rc: int = args.func(args)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
