"""FFmpeg mux of the original video with a new mix (docs/04 §9a, docs/09 §9.6 size rules).

Demos are encoded at 720p, CRF 28, AAC 128 kbps. If a file would exceed the 24 MB commit budget,
it is re-encoded with a higher CRF (and then 540p) until it fits.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

MAX_BYTES = 24 * 1024 * 1024
LADDER = [(720, 28), (720, 32), (540, 34), (480, 36)]


def mux(video: Path, audio_wav: Path, out: Path, video_delay: float = 0.0) -> dict[str, Any]:
    tried = []
    for height, crf in LADDER:
        vf = f"scale=-2:{height}"
        if video_delay > 0:
            vf = f"tpad=start_duration={video_delay:.3f}:start_mode=clone,{vf}"
        cmd = [
            "ffmpeg",
            "-y",
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-i",
            str(audio_wav),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
        subprocess.run(cmd, check=True)
        size = out.stat().st_size
        tried.append({"height": height, "crf": crf, "mb": round(size / 1e6, 2)})
        if size <= MAX_BYTES:
            break
    return {"file": out.name, "mb": round(out.stat().st_size / 1e6, 2), "encodes": tried}
