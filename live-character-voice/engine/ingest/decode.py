"""Decode any clip once with FFmpeg to 16 kHz mono float32 for analysis (docs/04 §1).

The original file is kept untouched for the final render.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

from engine.audio import F32


class FFmpegMissingError(RuntimeError):
    pass


def require_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise FFmpegMissingError("FFmpeg not found. Install it with: apt-get install -y ffmpeg")


def decode_audio(path: str | Path, sr: int = 16000) -> F32:
    require_ffmpeg()
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(sr),
        "-f",
        "f32le",
        "-",
    ]
    out = subprocess.run(cmd, capture_output=True, check=False)
    if out.returncode != 0:
        raise RuntimeError(f"ffmpeg failed on {path}: {out.stderr.decode(errors='replace')[-500:]}")
    return np.frombuffer(out.stdout, dtype=np.float32).copy()


def probe(path: str | Path) -> dict[str, float | bool]:
    """Duration and which stream types exist."""
    require_ffmpeg()
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type",
        "-of",
        "json",
        str(path),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(out.stdout)
    types = {s.get("codec_type") for s in data.get("streams", [])}
    return {
        "duration": float(data.get("format", {}).get("duration", 0.0)),
        "has_video": "video" in types,
        "has_audio": "audio" in types,
    }
