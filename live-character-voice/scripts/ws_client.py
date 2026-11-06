"""Scripted Pilot client (docs/10 M8, M10): runs a full session over HTTP + WebSocket.

- creates a session, connects, sends `start`, pings every 10 s, collects every message
- optional voice switches every N seconds (M10): cycles each speaker through the pilot voices
- samples the server's memory (RSS) from /api/health every 10 s
- at the end fetches the server record and scores: line.complete / audio.ready coverage, delay,
  voice-switch correctness (first line synthesized after a switch uses the new voice; lines
  synthesized before keep the old one), memory growth.
Writes <out>/ws_client.json.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import websockets

ROOT = Path(__file__).resolve().parent.parent


def pct(xs: list[float]) -> dict[str, float | None]:
    if not xs:
        return {"p50": None, "p95": None, "max": None}
    a = np.asarray(xs)
    return {
        k: round(float(v), 3)
        for k, v in (("p50", np.percentile(a, 50)), ("p95", np.percentile(a, 95)), ("max", a.max()))
    }


def score_switches(record: dict[str, Any], switches: list[dict[str, Any]]) -> dict[str, Any]:
    """A switch passes if the first line of that speaker whose TTS started after the switch uses
    the new voice, and lines whose TTS started before it kept the previous voice."""
    lines = [ln for ln in record["lines"] if ln["times"].get("tts_start") is not None]
    results = []
    for i, sw in enumerate(switches):
        spk, t, voice = sw["speaker_id"], sw["t"], sw["voice_id"]
        nxt = next((s["t"] for s in switches[i + 1 :] if s["speaker_id"] == spk), float("inf"))
        after = [
            ln for ln in lines if ln["speaker_id"] == spk and t < ln["times"]["tts_start"] < nxt
        ]
        if not after:
            results.append({"t": t, "speaker": spk, "voice": voice, "result": "no_line"})
            continue
        first = min(after, key=lambda ln: ln["times"]["tts_start"])
        ok = first["voice_id"] == voice and all(ln["voice_id"] == voice for ln in after)
        results.append(
            {
                "t": round(t, 2),
                "speaker": spk,
                "voice": voice,
                "first_line": first["line_id"],
                "result": "pass" if ok else "fail",
            }
        )
    tested = [r for r in results if r["result"] != "no_line"]
    passed = sum(r["result"] == "pass" for r in tested)
    return {
        "switches": len(switches),
        "tested": len(tested),
        "passed": passed,
        "pass_rate": round(passed / len(tested), 4) if tested else None,
        "detail": results,
    }


async def run(args: argparse.Namespace) -> dict[str, Any]:
    base = args.base.rstrip("/")
    async with httpx.AsyncClient(base_url=base, timeout=60) as http:
        voices = [v["voice_id"] for v in (await http.get("/api/voices")).json()]
        body = {
            "clip_id": args.clip,
            "max_speakers": args.speakers,
            "use_enroll": args.enroll,
            "speed": args.speed,
            "view_delay_s": args.view_delay,
        }
        if args.voices:
            body["voice_map"] = dict(kv.split("=", 1) for kv in args.voices.split(","))
        r = await http.post("/api/sessions", json=body)
        r.raise_for_status()
        sid = r.json()["session_id"]
        ws_url = base.replace("http", "ws", 1) + r.json()["ws_url"]
        msgs: list[dict[str, Any]] = []
        mem: list[tuple[float, float]] = []
        sent_switches: list[dict[str, Any]] = []
        speakers: list[str] = []
        t0 = time.monotonic()
        async with websockets.connect(ws_url, max_size=2**24) as ws:

            async def pinger() -> None:
                while True:
                    await ws.send(json.dumps({"type": "ping", "t": round(time.monotonic(), 3)}))
                    h = (await http.get("/api/health")).json()
                    if h.get("rss_mb"):
                        mem.append((time.monotonic() - t0, h["rss_mb"]))
                    await asyncio.sleep(10)

            async def switcher() -> None:
                k = 0
                while args.switch_every > 0:
                    await asyncio.sleep(args.switch_every)
                    if not speakers:
                        continue
                    spk = speakers[k % len(speakers)]
                    voice = voices[(k + 1) % len(voices)]
                    k += 1
                    await ws.send(
                        json.dumps({"type": "set_voice", "speaker_id": spk, "voice_id": voice})
                    )
                    sent_switches.append(
                        {
                            "speaker_id": spk,
                            "voice_id": voice,
                            "client_t": round(time.monotonic() - t0, 2),
                        }
                    )

            await ws.send(json.dumps({"type": "start"}))
            tasks = [asyncio.create_task(pinger()), asyncio.create_task(switcher())]
            async for raw in ws:
                m = json.loads(raw)
                m["_rx"] = round(time.monotonic() - t0, 3)
                msgs.append(m)
                if m["type"] == "speaker.new":
                    speakers.append(m["speaker"]["speaker_id"])
                if m["type"] == "session.ended":
                    break
            for t in tasks:
                t.cancel()
        wall = time.monotonic() - t0
        for _ in range(120):  # wait for the server report
            st = (await http.get(f"/api/sessions/{sid}")).json()
            if st.get("report_url"):
                break
            await asyncio.sleep(1)
        record = (await http.get(f"/api/sessions/{sid}/record")).json()
        metrics_file = ROOT / "outputs" / "sessions" / sid / "metrics.json"
        server_metrics = json.loads(metrics_file.read_text()) if metrics_file.exists() else {}

    complete = {m["line"]["line_id"] for m in msgs if m["type"] == "line.complete"}
    audio = {m["line_id"]: m for m in msgs if m["type"] == "audio.ready"}
    with_text = [ln for ln in record["lines"] if ln.get("text")]
    expected_audio = [
        ln
        for ln in with_text
        if ln["schedule_action"] not in ("dropped", "merged") and not ln.get("error")
    ]
    switches = server_metrics.get("run", {}).get("voice_switches", [])
    out = {
        "session_id": sid,
        "clip": args.clip,
        "speed": args.speed,
        "wall_s": round(wall, 1),
        "lines_in_record": len(record["lines"]),
        "lines_with_text": len(with_text),
        "line_complete_msgs": len(complete),
        "audio_ready_msgs": len(audio),
        "line_complete_coverage": round(len(complete) / len(with_text), 4) if with_text else None,
        "audio_ready_coverage": round(
            sum(1 for ln in expected_audio if ln["line_id"] in audio) / len(expected_audio), 4
        )
        if expected_audio
        else None,
        "delay_ready_from_ws": pct(
            [m["delay_ready"] for m in audio.values() if m.get("delay_ready") is not None]
        ),
        "server_delay": server_metrics.get("delay", {}).get("delay_ready"),
        "drift_slope": server_metrics.get("delay", {}).get("drift_slope_s_per_s"),
        "wer": server_metrics.get("wer", {}).get("wer"),
        "speaker_accuracy": server_metrics.get("speaker", {}).get("speaker_accuracy"),
        "crashes": server_metrics.get("run", {}).get("crashes"),
        "voice_switch": score_switches(record, switches),
        "client_switches_sent": len(sent_switches),
        "memory_mb": {
            "first": mem[0][1] if mem else None,
            "max": max(m for _, m in mem) if mem else None,
            "last": mem[-1][1] if mem else None,
            "samples": len(mem),
        },
        "message_counts": {
            t: sum(1 for m in msgs if m["type"] == t) for t in sorted({m["type"] for m in msgs})
        },
        "report": f"outputs/sessions/{sid}/report.md",
    }
    if mem:
        out["memory_mb"]["growth"] = round(max(m for _, m in mem) - mem[0][1], 1)
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default="http://localhost:8000")
    p.add_argument("--clip", default="synthetic_match.mp4")
    p.add_argument("--speakers", type=int, default=2)
    p.add_argument("--speed", type=float, default=1.0)
    p.add_argument("--enroll", action="store_true")
    p.add_argument("--switch-every", type=float, default=0.0, help="seconds between voice switches")
    p.add_argument("--out", default=None, help="directory for ws_client.json")
    p.add_argument("--voices", default=None, help="S1=cu_my-voice,S2=am_adam")
    p.add_argument("--view-delay", type=float, default=0.0, help="synced mode picture delay (s)")
    args = p.parse_args()
    res = asyncio.run(run(args))
    out_dir = Path(args.out) if args.out else ROOT / "outputs" / "sessions" / res["session_id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "ws_client.json").write_text(json.dumps(res, indent=2))
    summary = {k: v for k, v in res.items() if k not in ("voice_switch",)}
    summary["voice_switch"] = {k: v for k, v in res["voice_switch"].items() if k != "detail"}
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
