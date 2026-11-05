"""Pilot web API (docs/06 §6.4): `uvicorn app.main:app --port 8000`.

Set LCV_SKIP_MODELS=1 to start without loading models (API tests); sessions then cannot run.
"""

from __future__ import annotations

import asyncio
import os
import tempfile
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import markdown
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app import ws as ws_handler
from app.schemas import ClipOut, CreateSession, SessionCreated, SessionStatus, SpeakerOut, VoiceOut
from app.sessions import (
    CLIP_EXT,
    CLIPS_DIR,
    PREVIEWS_DIR,
    ROOT,
    SESSIONS_DIR,
    SessionBusyError,
    SessionManager,
    list_clips,
)
from engine.env import load_env
from engine.metrics.export import lines_csv
from engine.voices_custom import VoiceUploadError, add_custom_voice, remove_custom_voice

MAX_UPLOAD = 2 * 1024**3
manager = SessionManager()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    load_env()  # keys from live-character-voice/.env (git-ignored)
    if os.environ.get("LCV_SKIP_MODELS") != "1":
        manager.load_models()
    yield


app = FastAPI(title="Live Sports Character Voice — Pilot API", lifespan=lifespan)
for d in (CLIPS_DIR, SESSIONS_DIR, PREVIEWS_DIR):
    d.mkdir(parents=True, exist_ok=True)
app.mount("/media/clips", StaticFiles(directory=CLIPS_DIR), name="clips")
app.mount("/media/previews", StaticFiles(directory=PREVIEWS_DIR), name="previews")


@app.get("/api/health")
def health() -> dict[str, object]:
    m = manager.models
    active = manager.active()
    return {
        "ok": True,
        "models_loaded": {
            "asr": bool(m and m.asr),
            "speaker": bool(m and m.speaker),
            "tts": bool(m and m.tts),
        },
        "model_info": m.info if m else {},
        "load_s": m.load_s if m else {},
        "active_session": active.session_id if active else None,
        "rss_mb": _rss_mb(),
        "voice_cloning": manager.cloning,
        "engines": m.engines if m else {},
        "fish_fallback_lines": getattr(m.tts, "n_fallback", 0) if m and m.tts else 0,
    }


def _rss_mb() -> float | None:
    try:
        import psutil

        return round(float(psutil.Process().memory_info().rss) / 1e6, 1)
    except ImportError:
        return None


@app.get("/api/voices", response_model=list[VoiceOut])
def voices() -> list[VoiceOut]:
    return [
        VoiceOut(
            voice_id=v.voice_id,
            name=v.name,
            description=v.description,
            lang=v.lang_code,
            preview_url=f"/media/previews/{manager.preview_name(v.voice_id)}",
            custom=v.voice_id.startswith("cu_"),
        )
        for v in manager.catalog.pilot_voices()
    ]


@app.post("/api/voices/custom", response_model=VoiceOut)
async def add_voice(
    name: str = Form(...),
    consent: bool = Form(False),
    transcript: str = Form(""),
    file: UploadFile = File(...),
) -> VoiceOut:
    """Instant voice cloning: upload 6–30 s of a voice you own or may use."""
    suffix = Path(file.filename or "voice.wav").suffix.lower() or ".wav"
    if suffix not in {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".mp4", ".mov"}:
        raise HTTPException(400, "upload an audio file (wav, mp3, m4a, ogg, flac) or a video")
    data = await file.read()
    if len(data) > 50 * 1024**2:
        raise HTTPException(413, "sample larger than 50 MB")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"sample{suffix}"
        src.write_bytes(data)
        try:
            meta = await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: add_custom_voice(
                    name,
                    src,
                    consent,
                    transcript or None,
                    manager.models.asr if manager.models else None,
                ),
            )
        except VoiceUploadError as e:
            raise HTTPException(400, str(e)) from e
    vid = meta["voice_id"]
    if manager.cloning:
        await asyncio.get_running_loop().run_in_executor(None, manager.make_preview, vid, 1.0)
    return VoiceOut(
        voice_id=vid,
        name=meta["name"],
        description=f"Your cloned voice ({meta['seconds']:.0f} s sample)",
        lang="a",
        preview_url=f"/media/previews/{manager.preview_name(vid)}",
        custom=True,
    )


@app.delete("/api/voices/custom/{voice_id}")
def delete_voice(voice_id: str) -> dict[str, str]:
    try:
        remove_custom_voice(voice_id)
    except KeyError as e:
        raise HTTPException(404, "unknown custom voice") from e
    return {"deleted": voice_id}


@app.get("/api/clips", response_model=list[ClipOut])
def clips() -> list[ClipOut]:
    return [ClipOut(**c) for c in list_clips()]


@app.post("/api/clips", response_model=ClipOut)
async def upload_clip(file: UploadFile = File(...)) -> ClipOut:
    name = Path(file.filename or "upload.mp4").name
    if Path(name).suffix.lower() not in CLIP_EXT:
        raise HTTPException(400, "only .mp4, .mkv or .mov clips are accepted")
    dest = CLIPS_DIR / name
    size = 0
    with dest.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD:
                fh.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "clip larger than 2 GB")
            fh.write(chunk)
    for c in list_clips():
        if c["clip_id"] == name:
            return ClipOut(**c)
    dest.unlink(missing_ok=True)
    raise HTTPException(400, "file is not a readable video")


@app.post("/api/sessions", response_model=SessionCreated)
def create_session(body: CreateSession) -> SessionCreated:
    if manager.models is None:
        raise HTTPException(503, "models are not loaded")
    try:
        ps = manager.create(
            body.clip_id, body.max_speakers, body.voice_map, body.use_enroll, body.speed
        )
    except SessionBusyError as e:
        raise HTTPException(409, str(e)) from e
    except FileNotFoundError as e:
        raise HTTPException(404, f"clip not found: {e}") from e
    except KeyError as e:
        raise HTTPException(400, f"unknown voice {e}") from e
    return SessionCreated(session_id=ps.session_id, ws_url=f"/ws/sessions/{ps.session_id}")


def _session(sid: str):  # type: ignore[no-untyped-def]
    try:
        return manager.get(sid)
    except KeyError as e:
        raise HTTPException(404, "unknown session") from e


@app.get("/api/sessions/{sid}", response_model=SessionStatus)
def session_status(sid: str) -> SessionStatus:
    ps = _session(sid)
    rec = ps.engine.store.record
    return SessionStatus(
        session_id=sid,
        clip_id=ps.clip_id,
        status=ps.status,
        speed=ps.cfg.speed,
        max_speakers=ps.cfg.speaker.max_speakers,
        speakers=[
            SpeakerOut(
                speaker_id=s.speaker_id,
                display_name=s.display_name,
                color=s.color,
                voice_id=s.voice_id,
            )
            for s in rec.speakers.values()
        ],
        metrics=ps.engine.metrics_snapshot(),
        report_url=f"/api/sessions/{sid}/report" if ps.report_ready else None,
        error=ps.error,
    )


@app.post("/api/sessions/{sid}/stop")
def stop_session(sid: str) -> dict[str, str]:
    ps = _session(sid)
    manager.stop(ps)
    return {"status": "stopping"}


@app.get("/api/sessions/{sid}/record")
def session_record(sid: str) -> PlainTextResponse:
    ps = _session(sid)
    return PlainTextResponse(
        ps.engine.store.record.model_dump_json(indent=1), media_type="application/json"
    )


@app.get("/api/sessions/{sid}/lines.csv")
def session_csv(sid: str) -> PlainTextResponse:
    ps = _session(sid)
    return PlainTextResponse(
        lines_csv(ps.engine.store.record),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{sid}_lines.csv"'},
    )


REPORT_CSS = """
body{background:#0B0F14;color:#E6EDF5;font:14px/1.6 Sora,system-ui,sans-serif;max-width:960px;
margin:0 auto;padding:24px 16px}a{color:#4FA3FF}table{border-collapse:collapse;margin:8px 0;
font-size:13px;display:block;overflow-x:auto}td,th{border:1px solid #1E2733;padding:4px 8px}
th{background:#121821}code{background:#121821;padding:1px 4px;border-radius:4px}
img{max-width:100%;background:#fff;border-radius:8px}h1,h2{font-weight:600}
"""


@app.get("/api/sessions/{sid}/report", response_class=HTMLResponse)
def session_report(sid: str) -> HTMLResponse:
    ps = _session(sid)
    path = ps.out_dir / "report.md"
    if not path.exists():
        raise HTTPException(404, "report not ready yet")
    body = markdown.markdown(path.read_text(), extensions=["tables", "fenced_code"])
    body = body.replace(
        'src="delay_over_time.png"', f'src="/api/sessions/{sid}/files/delay_over_time.png"'
    )
    for f in ("record.json", "lines.csv", "metrics.json"):
        body = body.replace(f'href="{f}"', f'href="/api/sessions/{sid}/files/{f}"')
    html = (
        f"<!doctype html><html><head><meta charset='utf-8'><title>Session report</title>"
        f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<style>{REPORT_CSS}</style></head><body>{body}</body></html>"
    )
    return HTMLResponse(html)


@app.get("/api/sessions/{sid}/files/{name}")
def session_file(sid: str, name: str) -> FileResponse:
    ps = _session(sid)
    if name not in {"record.json", "lines.csv", "metrics.json", "delay_over_time.png", "report.md"}:
        raise HTTPException(404)
    path = ps.out_dir / name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


@app.get("/media/tts/{sid}/{name}", response_model=None)
def tts_file(sid: str, name: str) -> FileResponse | StreamingResponse:
    path = (SESSIONS_DIR / sid / "tts" / Path(name).name).resolve()
    if not path.is_relative_to(SESSIONS_DIR.resolve()) or not path.exists():
        raise HTTPException(404)
    if path.name.endswith(".part.wav"):
        final = path.with_name(path.name.replace(".part.wav", ".wav"))
        return StreamingResponse(_follow(path, final), media_type="audio/wav",
                                 headers={"Cache-Control": "no-store"})  # fmt: skip
    return FileResponse(path, media_type="audio/wav")


async def _follow(part: Path, final: Path, poll_s: float = 0.03) -> AsyncIterator[bytes]:
    """Stream a TTS file that is still being written: send what exists, then keep sending new
    bytes until the line's final file appears and everything has been read (or 30 s pass)."""
    sent = 0
    waited = 0.0
    with part.open("rb") as fh:
        while waited < 30.0:
            chunk = fh.read()
            if chunk:
                sent += len(chunk)
                yield chunk
                continue
            if final.exists() and sent >= part.stat().st_size:
                return
            await asyncio.sleep(poll_s)
            waited += poll_s


@app.websocket("/ws/sessions/{sid}")
async def session_ws(websocket: WebSocket, sid: str) -> None:
    await ws_handler.handle(websocket, manager, sid)


# Built web app (optional): `cd web && npm run build` → served at /
_dist = ROOT / "web" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        return FileResponse(_dist / "index.html")
