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
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    rc: int = args.func(args)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
