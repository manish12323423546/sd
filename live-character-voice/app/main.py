"""Pilot web API (docs/06 §6.4): `uvicorn app.main:app --port 8000`.

Set LCV_SKIP_MODELS=1 to start without loading models (API tests); sessions then cannot run.
"""

from __future__ import annotations

import asyncio
import os
import tempfile
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import partial
from pathlib import Path
from urllib.parse import quote

import markdown
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import lab
from app import ws as ws_handler
from app.hosting import (
    ORIGIN_REGEX,
    AccessCodeMiddleware,
    access_code,
    deployed_commit,
    extra_origins,
    update_watcher,
)
from app.schemas import (
    ClipOut,
    CreateSession,
    LiveSessionCreate,
    SayRequest,
    SessionCreated,
    SessionStatus,
    SpeakerOut,
    VoiceOut,
)
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
from engine import voices_pro
from engine.env import load_env
from engine.metrics.export import lines_csv
from engine.voices_custom import (
    CUSTOM_DIR,
    VoiceUploadError,
    add_custom_voice,
    get_meta,
    remove_custom_voice,
)

MAX_UPLOAD = 2 * 1024**3
manager = SessionManager()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    load_env()  # keys from live-character-voice/.env (git-ignored)
    from app.sessions import _make_library

    manager.library = _make_library()  # after load_env: HF_TOKEN may come from .env
    voices_pro.ON_SAVED[:] = [manager.library.publish]
    if manager.library.enabled:  # get the voices before previews are made
        await asyncio.get_running_loop().run_in_executor(None, manager.library.sync, True)
        print(f">>> voice library {manager.library.status()}", flush=True)
    if os.environ.get("LCV_SKIP_MODELS") != "1":
        manager.load_models()
    watcher = asyncio.create_task(
        update_watcher(ROOT, manager.is_idle, lambda m: print(f">>> {m}", flush=True))
    )
    lib_watch = asyncio.create_task(_library_watcher())
    yield
    watcher.cancel()
    lib_watch.cancel()


async def _library_watcher(every_s: float = 60.0) -> None:
    """Pick up changes made in the Voice Studio (or another server) within a minute."""
    while True:
        await asyncio.sleep(every_s)
        lib = manager.library
        if not lib.enabled:
            continue
        changed = await asyncio.get_running_loop().run_in_executor(None, lib.sync, False)
        if changed and manager.models is not None:
            threading.Thread(target=manager.make_previews, daemon=True).start()


def _start_library() -> str:
    from app.sessions import _make_library

    manager.library = _make_library()
    voices_pro.ON_SAVED[:] = [manager.library.publish]
    if not manager.library.enabled:
        return manager.library.error or "voice library not started"
    manager.library.sync(True)
    lib = manager.library
    if lib.error:
        return f"voice library problem: {lib.error}"
    saved = (
        f"saved {len(lib.rescued)} voice(s) from this server: {', '.join(lib.rescued)}"
        if (lib.rescued)
        else "no voices on this server needed saving"
    )
    return f"voice library ready ({lib.backend.name if lib.backend else ''}); {saved}"


def _library_brief() -> dict[str, object]:
    st = manager.library.status()
    return {k: st[k] for k in ("enabled", "role", "can_edit", "error")}


def _voices_editable() -> None:
    if not manager.library.can_edit:
        raise HTTPException(
            403,
            {
                "code": "voices_read_only",
                "message": "Voices are managed in your private Voice Studio; this app only uses "
                "the voices you keep there.",
            },
        )


app = FastAPI(title="Live Sports Character Voice — Pilot API", lifespan=lifespan)
# the Chrome extension (chrome-extension://…) and local dev servers call the engine directly
lab.bind(manager)
app.include_router(lab.router)
app.add_middleware(AccessCodeMiddleware)  # LCV_ACCESS_CODE (hosted); inner, so CORS wraps it
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ORIGIN_REGEX,
    allow_origins=extra_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)
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
        "voice_library": _library_brief(),
        "active_session": active.session_id if active else None,
        "active_state": str(active.status) if active else None,
        "active_actions": active.actions() if active else [],
        "rss_mb": _rss_mb(),
        "voice_cloning": manager.cloning,
        "access_code_required": bool(access_code()),
        "hosted": os.environ.get("LCV_HOSTED") == "1",
        "commit": (deployed_commit(ROOT) or "")[:8],
        "engines": m.engines if m else {},
        "fish_fallback_lines": getattr(m.tts, "n_fallback", 0) if m and m.tts else 0,
    }


def _rss_mb() -> float | None:
    try:
        import psutil

        return round(float(psutil.Process().memory_info().rss) / 1e6, 1)
    except ImportError:
        return None


def _tier_score(voice_id: str) -> tuple[str, int | None]:
    if not voice_id.startswith("cu_"):
        return "builtin", None
    try:
        meta = get_meta(voice_id)
    except KeyError:
        return "instant", None
    return str(meta.get("tier", "instant")), (meta.get("quality") or {}).get("score")


class KeysIn(BaseModel):
    fish: str | None = None
    groq: str | None = None
    deepgram: str | None = None
    hf: str | None = None  # Hugging Face write token: the permanent voice library
    asr: str | None = None  # speech-to-text choice: auto | deepgram | groq | local
    admin_code: str | None = None


ASR_CHOICES = ("auto", "deepgram", "groq", "local")


def _can_set_keys(request: Request, given: str | None) -> bool:
    from app.hosting import admin_ok

    host = request.client.host if request.client else ""
    if host in {"127.0.0.1", "::1", "localhost", "testclient"} and not os.environ.get("SPACE_ID"):
        return True
    return admin_ok(given or request.headers.get("x-admin-code"))


@app.get("/api/keys")
async def keys_status(request: Request) -> dict[str, object]:
    """Which keys are connected (never the keys themselves) and the speech-to-text choice."""
    from app.hosting import admin_code

    m = manager.models
    return {
        "connected": {
            "fish": bool(os.environ.get("FISH_API_KEY") or os.environ.get("FISH_API_KEY_FILE")),
            "groq": bool(os.environ.get("GROQ_API_KEY")),
            "deepgram": bool(os.environ.get("DEEPGRAM_API_KEY")),
            "hf": manager.library.enabled,
        },
        "asr": os.environ.get("LCV_ASR", "auto") or "auto",
        "asr_choices": list(ASR_CHOICES),
        "engines": m.engines if m else {},
        "needs_admin_code": not _can_set_keys(request, None),
        "admin_enabled": bool(admin_code()),
    }


@app.post("/api/keys")
async def set_keys(body: KeysIn, request: Request) -> dict[str, object]:
    """Paste API keys in the app: each key is tested, saved (git-ignored `.env`; on a Hugging Face
    Space also as a Space secret when HF_TOKEN is set) only if it works, then the engines switch
    over without a restart. Allowed on this computer, or with LCV_ADMIN_CODE on a hosted engine.
    Keys are never sent back."""
    from app.hosting import persist_to_space
    from engine.env import save_env
    from engine.keycheck import check_deepgram, check_fish, check_groq, check_hf

    if not _can_set_keys(request, body.admin_code):
        raise HTTPException(
            403,
            "enter the admin code to change keys on this hosted engine (set LCV_ADMIN_CODE as a "
            "Space secret once), or add the keys as Space secrets: "
            "Settings → Variables and secrets",
        )
    results: dict[str, dict[str, object]] = {}
    for name, value, env, check in (
        ("fish", body.fish, "FISH_API_KEY", check_fish),
        ("groq", body.groq, "GROQ_API_KEY", check_groq),
        ("deepgram", body.deepgram, "DEEPGRAM_API_KEY", check_deepgram),
        ("hf", body.hf, "HF_TOKEN", check_hf),
    ):
        value = (value or "").strip().strip('"').strip("'")
        if not value:
            continue
        old = os.environ.get(env)
        os.environ[env] = value
        st = await asyncio.get_running_loop().run_in_executor(None, check)
        msg = st.message
        if st.ok:
            save_env(env, value)
            if name == "hf":  # start the voice library now and rescue the voices on this disk
                msg += "; " + await asyncio.get_running_loop().run_in_executor(None, _start_library)
            if os.environ.get("SPACE_ID"):  # (saving a secret restarts the Space — rescue first)
                msg += "; " + await asyncio.get_running_loop().run_in_executor(
                    None, persist_to_space, env, value
                )
        elif old is not None:
            os.environ[env] = old
        else:
            os.environ.pop(env, None)
        results[name] = {"ok": st.ok, "message": msg}
    choice = (body.asr or "").strip().lower()
    if choice:
        if choice not in ASR_CHOICES:
            raise HTTPException(400, f"speech-to-text must be one of {', '.join(ASR_CHOICES)}")
        save_env("LCV_ASR", choice)
        msg = f"speech-to-text set to {choice}"
        if os.environ.get("SPACE_ID"):
            msg += "; " + await asyncio.get_running_loop().run_in_executor(
                None, partial(persist_to_space, "LCV_ASR", choice, secret=False)
            )
        results["asr"] = {"ok": True, "message": msg}
    if not results:
        raise HTTPException(400, "paste at least one key or choose a speech-to-text engine")
    engines: dict[str, object] = {}
    if any(r["ok"] for r in results.values()) and manager.models is not None:
        try:
            engines = await asyncio.get_running_loop().run_in_executor(None, manager.reload_engines)
        except SessionBusyError:
            # the keys are saved; the engines switch as soon as the running session ends
            manager.pending_reload = True
            pending = "saved — the engines switch when the running session ends"
            return {"results": results, "engines": {}, "voice_cloning": manager.cloning,
                    "pending": pending}  # fmt: skip
    return {"results": results, "engines": engines, "voice_cloning": manager.cloning}


@app.get("/api/voices", response_model=list[VoiceOut])
def voices() -> list[VoiceOut]:
    out = []
    for v in manager.catalog.pilot_voices():
        tier, score = _tier_score(v.voice_id)
        out.append(
            VoiceOut(
                voice_id=v.voice_id,
                name=v.name,
                description=v.description,
                lang=v.lang_code,
                preview_url=f"/media/previews/{manager.preview_name(v.voice_id)}",
                custom=v.voice_id.startswith("cu_"),
                tier=tier,
                score=score,
            )
        )
    return out


@app.post("/api/voices/pro")
async def add_pro_voice(
    name: str = Form(...),
    consent: bool = Form(False),
    file: UploadFile = File(...),
) -> dict[str, object]:
    """Professional cloning from a 1–10 min recording; runs in the background (poll the job)."""
    _voices_editable()
    suffix = Path(file.filename or "voice.wav").suffix.lower() or ".wav"
    if suffix not in {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".mp4", ".mov"}:
        raise HTTPException(400, "upload an audio file (wav, mp3, m4a, ogg, flac) or a video")
    tmp = Path(tempfile.mkstemp(suffix=suffix, prefix="pro_voice_")[1])
    size = 0
    with tmp.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > 500 * 1024**2:
                tmp.unlink(missing_ok=True)
                raise HTTPException(413, "recording larger than 500 MB")
            fh.write(chunk)
    try:
        job = voices_pro.start_job(name, tmp, consent, manager.models)
    except VoiceUploadError as e:
        tmp.unlink(missing_ok=True)
        raise HTTPException(400, str(e)) from e
    return job.public()


@app.get("/api/voices/jobs/{job_id}")
def voice_job(job_id: str) -> dict[str, object]:
    job = voices_pro.JOBS.get(job_id)
    if job is None:
        raise HTTPException(404, "unknown job")
    if job.stage == "done" and job.result and manager.cloning:
        vid = job.result["voice_id"]
        if not (PREVIEWS_DIR / manager.preview_name(vid)).exists():
            manager.make_preview(vid, 1.0)
    return job.public()


@app.get("/api/voices/custom/{voice_id}")
def voice_detail(voice_id: str) -> dict[str, object]:
    try:
        meta = get_meta(voice_id)
    except KeyError as e:
        raise HTTPException(404, "unknown custom voice") from e
    slug = voice_id[3:]
    base = f"/media/voices/{slug}"
    for rs in (meta.get("refs") or {}).values():
        for r in rs:
            r["url"] = f"{base}/{r['file']}"
    q = meta.get("quality") or {}
    for mood, m in (q.get("moods") or {}).items():
        m["url"] = f"{base}/test_{mood}.wav"
    meta["ref_url"] = f"{base}/ref.mp3"
    meta.setdefault("tier", "instant")
    return meta


@app.get("/media/voices/{slug}/{name}")
def voice_file(slug: str, name: str) -> FileResponse:
    path = (CUSTOM_DIR / Path(slug).name / Path(name).name).resolve()
    if not path.is_relative_to(CUSTOM_DIR.resolve()) or not path.exists():
        raise HTTPException(404)
    if path.suffix not in {".mp3", ".wav"}:
        raise HTTPException(404)
    return FileResponse(path, media_type="audio/mpeg" if path.suffix == ".mp3" else "audio/wav")


@app.post("/api/voices/{voice_id}/say")
async def say(voice_id: str, body: SayRequest) -> StreamingResponse:
    """Voice playground: speak any line with any voice in a chosen mood."""
    import io

    import soundfile as sf

    from engine.providers.base import DeliveryStyle
    from engine.record.models import Emotion

    m = manager.models
    if m is None or m.tts is None:
        raise HTTPException(503, "models are not loaded")
    if voice_id not in {v.voice_id for v in manager.catalog.voices}:
        raise HTTPException(404, "unknown voice")
    try:
        emotion = Emotion(body.emotion)
    except ValueError as e:
        raise HTTPException(400, "emotion must be calm, neutral, excited or peak") from e
    style = DeliveryStyle(emotion=emotion, gain_db={"peak": 2.0, "excited": 1.0}.get(emotion, 0.0))
    res = await asyncio.get_running_loop().run_in_executor(
        None,
        lambda: m.tts.synthesize(body.text, voice_id, style),  # type: ignore[union-attr]
    )
    buf = io.BytesIO()
    sf.write(buf, res.audio, res.sr, format="WAV")
    buf.seek(0)
    return StreamingResponse(buf, media_type="audio/wav", headers={"Cache-Control": "no-store"})


@app.post("/api/voices/custom", response_model=VoiceOut)
async def add_voice(
    name: str = Form(...),
    consent: bool = Form(False),
    transcript: str = Form(""),
    file: UploadFile = File(...),
) -> VoiceOut:
    """Instant voice cloning: upload 6–30 s of a voice you own or may use."""
    _voices_editable()
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
    saved = "saved to your voice library"
    try:  # permanent: survives restarts (no-op without a library)
        await asyncio.get_running_loop().run_in_executor(None, manager.library.publish, vid)
    except Exception as e:
        saved = f"NOT saved to the voice library ({type(e).__name__}); it works until a restart"
    if manager.cloning:
        await asyncio.get_running_loop().run_in_executor(None, manager.make_preview, vid, 1.0)
    return VoiceOut(
        voice_id=vid,
        name=meta["name"],
        description=f"Your cloned voice ({meta['seconds']:.0f} s sample) · "
        + (saved if manager.library.enabled else "stored on this server"),
        lang="a",
        preview_url=f"/media/previews/{manager.preview_name(vid)}",
        custom=True,
    )


@app.delete("/api/voices/custom/{voice_id}")
def delete_voice(voice_id: str) -> dict[str, str]:
    _voices_editable()
    try:
        if manager.library.enabled:
            manager.library.remove(voice_id)  # from the library too (everywhere)
        else:
            remove_custom_voice(voice_id)
    except KeyError as e:
        raise HTTPException(404, "unknown custom voice") from e
    return {"deleted": voice_id}


class VoiceSettingsIn(BaseModel):
    enabled: bool


@app.get("/api/voices/library")
def voice_library() -> dict[str, object]:
    """Where voices are kept, this server's role, and every custom voice with keep/hide state."""
    return {**manager.library.status(), "voices": manager.library.listing()}


@app.post("/api/voices/library/sync")
def voice_library_sync() -> dict[str, object]:
    """Fetch the latest library now (instead of waiting up to a minute)."""
    changed = manager.library.sync(False)
    if changed and manager.models is not None:
        threading.Thread(target=manager.make_previews, daemon=True).start()
    return {"changed": changed, **manager.library.status()}


@app.post("/api/voices/library/{voice_id}")
def voice_library_set(voice_id: str, body: VoiceSettingsIn) -> dict[str, object]:
    """Keep a voice in the app (enabled) or hide it. Owner only (Voice Studio / local)."""
    _voices_editable()
    try:
        meta = manager.library.set_enabled(voice_id, body.enabled)
    except (KeyError, FileNotFoundError) as e:
        raise HTTPException(404, "unknown custom voice") from e
    return {"voice_id": voice_id, "enabled": meta.get("enabled", True)}


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
            body.clip_id,
            body.max_speakers,
            body.voice_map,
            body.use_enroll,
            body.speed,
            body.view_delay_s,
            body.known_voices,
        )
    except SessionBusyError as e:
        raise HTTPException(409, e.detail()) from e
    except FileNotFoundError as e:
        raise HTTPException(404, f"clip not found: {e}") from e
    except KeyError as e:
        raise HTTPException(400, f"unknown voice {e}") from e
    return SessionCreated(session_id=ps.session_id, ws_url=f"/ws/sessions/{ps.session_id}")


@app.post("/api/live/sessions", response_model=SessionCreated)
def create_live_session(body: LiveSessionCreate) -> SessionCreated:
    """Live input: after `start`, the client streams mono 16 kHz PCM16 as binary WebSocket frames
    (the Chrome extension and the Live capture page do this for any tab or live stream)."""
    if manager.models is None:
        raise HTTPException(503, "models are not loaded")
    try:
        ps = manager.create_live(
            body.max_speakers, body.voice_map, body.view_delay_s, body.label, body.known_voices
        )
    except SessionBusyError as e:
        raise HTTPException(409, e.detail()) from e
    except KeyError as e:
        raise HTTPException(400, f"unknown voice {e}") from e
    return SessionCreated(session_id=ps.session_id, ws_url=f"/ws/sessions/{ps.session_id}")


def _session(sid: str):  # type: ignore[no-untyped-def]
    try:
        return manager.get(sid)
    except KeyError as e:
        raise HTTPException(404, "unknown session") from e


def _status_of(ps) -> SessionStatus:  # type: ignore[no-untyped-def]
    rec = ps.engine.store.record
    return SessionStatus(
        session_id=ps.session_id,
        clip_id=ps.clip_id,
        status=str(ps.status),
        paused=ps.paused,
        actions=ps.actions(),
        owner=ps.owner,
        live_input=ps.live is not None,
        clients=ps.clients,
        view_delay_s=ps.engine.view_delay,
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
        report_url=f"/api/sessions/{ps.session_id}/report" if ps.report_ready else None,
        error=ps.error,
    )


@app.get("/api/sessions", response_model=list[SessionStatus])
def list_sessions() -> list[SessionStatus]:
    """Sessions this server process knows (newest first), each with its state and next actions."""
    return [_status_of(ps) for ps in reversed(list(manager.sessions.values()))][:20]


@app.get("/api/sessions/{sid}", response_model=SessionStatus)
def session_status(sid: str) -> SessionStatus:
    return _status_of(_session(sid))


@app.post("/api/sessions/{sid}/stop", response_model=SessionStatus)
def stop_session(sid: str) -> SessionStatus:
    """Idempotent: stopping a stopping/finished session just returns its state."""
    ps = _session(sid)
    manager.stop(ps)
    return _status_of(ps)


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
def session_report(sid: str, code: str = "") -> HTMLResponse:
    ps = _session(sid)
    path = ps.out_dir / "report.md"
    if not path.exists():
        raise HTTPException(404, "report not ready yet")
    body = markdown.markdown(path.read_text(), extensions=["tables", "fenced_code"])
    q = (
        f"?code={quote(code, safe='')}" if code else ""
    )  # hosted: links inside the report carry the access code
    body = body.replace(
        'src="delay_over_time.png"', f'src="/api/sessions/{sid}/files/delay_over_time.png{q}"'
    )
    for f in ("record.json", "lines.csv", "metrics.json"):
        body = body.replace(f'href="{f}"', f'href="/api/sessions/{sid}/files/{f}{q}"')
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
        f = (_dist / path).resolve()
        if path and f.is_file() and f.is_relative_to(_dist.resolve()):  # e.g. /pcm-worklet.js
            return FileResponse(f)
        return FileResponse(_dist / "index.html")
