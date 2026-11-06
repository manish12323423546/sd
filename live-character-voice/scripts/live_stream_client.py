"""Live-input test client: behaves like the Chrome extension / Live capture page.

Streams any audio/video file (or a live URL via ffmpeg) to `POST /api/live/sessions` + the session
WebSocket as real-time PCM16 16 kHz mono chunks, collects every message, and prints what a viewer
would get: lines, voiced lines, felt delay (voice start − line start, in the capture timeline).

  python scripts/live_stream_client.py data/clips/synthetic_match.mp4 --view-delay 6
  python scripts/live_stream_client.py "https://…/live.m3u8"     # ffmpeg reads the live stream
  python scripts/live_stream_client.py "https://www.youtube.com/watch?v=…" --resolve
        # page URL → stream URL with yt-dlp (pip install yt-dlp); only streams you may use

Writes <out>/live_client.json.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
import time
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import websockets

ROOT = Path(__file__).resolve().parent.parent
SR = 16000


def resolve(url: str) -> str:
    """Page URL (YouTube, Twitch, …) → direct audio stream URL via yt-dlp."""
    try:
        out = subprocess.run(["yt-dlp", "-g", "-f", "bestaudio/best", url], capture_output=True,
                             text=True, timeout=60, check=True)  # fmt: skip
    except FileNotFoundError as e:
        raise SystemExit("yt-dlp is not installed: pip install yt-dlp") from e
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"yt-dlp could not open the page: {e.stderr.strip()[:300]}") from e
    return out.stdout.strip().splitlines()[0]


async def run(a: argparse.Namespace) -> dict[str, Any]:
    base = a.base.rstrip("/")
    if a.resolve:
        a.source = resolve(a.source)
    async with httpx.AsyncClient(base_url=base, timeout=60) as http:
        body: dict[str, Any] = {"max_speakers": a.speakers, "view_delay_s": a.view_delay,
                                "label": Path(a.source).name[:60]}  # fmt: skip
        if a.voices:
            body["voice_map"] = dict(kv.split("=", 1) for kv in a.voices.split(","))
        r = await http.post("/api/live/sessions", json=body)
        r.raise_for_status()
        sid = r.json()["session_id"]
        ws_url = base.replace("http", "ws", 1) + r.json()["ws_url"]
        # ffmpeg decodes in real time (-re) exactly like a live source would arrive
        proc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-re", "-i", a.source, "-vn", "-ac", "1", "-ar", str(SR),
             "-f", "s16le", "-"],
            stdout=subprocess.PIPE,
        )  # fmt: skip
        assert proc.stdout is not None
        msgs: list[dict[str, Any]] = []
        sent_s = 0.0
        t0 = time.monotonic()
        async with websockets.connect(ws_url, max_size=2**24) as ws:
            await ws.send(json.dumps({"type": "start"}))

            async def sender() -> None:
                nonlocal sent_s
                loop = asyncio.get_running_loop()
                chunk = int(SR * a.chunk_ms / 1000) * 2
                while True:
                    data = await loop.run_in_executor(None, proc.stdout.read, chunk)  # type: ignore[union-attr]
                    if not data:
                        break
                    await ws.send(data)
                    sent_s += len(data) / 2 / SR
                    if a.max_s and sent_s >= a.max_s:
                        break
                await asyncio.sleep(1.0)
                await ws.send(json.dumps({"type": "stop"}))

            task = asyncio.create_task(sender())
            async for raw in ws:
                m = json.loads(raw)
                m["_rx"] = round(time.monotonic() - t0, 3)
                msgs.append(m)
                if m["type"] == "session.ended":
                    break
            task.cancel()
        proc.kill()
        for _ in range(120):
            st = (await http.get(f"/api/sessions/{sid}")).json()
            if st.get("report_url"):
                break
            await asyncio.sleep(1)
    lines = {m["line"]["line_id"]: m["line"] for m in msgs if m["type"] == "line.complete"}
    audio = {m["line_id"]: m for m in msgs if m["type"] == "audio.ready"}
    felt = [max(0.0, au["play_at_media"] - lines[lid]["t_start"]) for lid, au in audio.items()
            if lid in lines]  # fmt: skip
    # how early did each voice file arrive before its play time (capture timeline)?
    started = next((m["_rx"] for m in msgs if m["type"] == "session.started"), 0.0)
    margin = [au["play_at_media"] - (au["_rx"] - started) for au in audio.values()]

    def pct(xs: list[float]) -> dict[str, float | None]:
        if not xs:
            return {"p50": None, "p95": None, "max": None}
        q = np.percentile(xs, [50, 95])
        return {"p50": round(float(q[0]), 3), "p95": round(float(q[1]), 3),
                "max": round(float(max(xs)), 3)}  # fmt: skip

    out = {
        "session_id": sid,
        "source": a.source,
        "view_delay_s": a.view_delay,
        "audio_sent_s": round(sent_s, 1),
        "lines": len(lines),
        "voiced": len(audio),
        "felt_delay": pct(felt),
        "on_time_share": round(sum(1 for d in felt if d <= 0.3) / len(felt), 4) if felt else None,
        "arrival_margin_s": pct(margin),
        "message_counts": {
            t: sum(1 for m in msgs if m["type"] == t) for t in sorted({m["type"] for m in msgs})
        },
        "report": f"outputs/sessions/{sid}/report.md",
    }
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", help="file path or live URL (anything ffmpeg can read)")
    p.add_argument("--base", default="http://localhost:8000")
    p.add_argument("--speakers", type=int, default=2)
    p.add_argument("--view-delay", type=float, default=6.0)
    p.add_argument("--voices", default=None)
    p.add_argument("--chunk-ms", type=int, default=100)
    p.add_argument("--max-s", type=float, default=0.0, help="stop after this much audio")
    p.add_argument("--out", default=None)
    p.add_argument("--resolve", action="store_true", help="page URL → stream URL with yt-dlp")
    a = p.parse_args()
    res = asyncio.run(run(a))
    out = Path(a.out) if a.out else ROOT / "outputs" / "sessions" / res["session_id"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "live_client.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
