"""SessionManager: create / run / stop Pilot sessions (docs/06 §6.5).

Models are loaded once per process and shared. Only ONE active session at a time (CPU budget);
a second create while one is live raises SessionBusyError (HTTP 409). Every status change goes
through `_set_state` and the explicit state machine in app/lifecycle.py.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.lifecycle import TERMINAL, State, allowed_actions, check
from engine.config import EngineConfig, VoiceCatalog, load_engine_config, load_voice_catalog
from engine.ingest.decode import probe
from engine.metrics.compute import compute_all
from engine.metrics.export import write_lines_csv
from engine.metrics.report import write_report
from engine.orchestrator import Models, Session
from engine.speakers.enroll import EnrollFile, load_enroll

ROOT = Path(__file__).resolve().parent.parent
CLIPS_DIR = ROOT / "data" / "clips"
SESSIONS_DIR = ROOT / "outputs" / "sessions"
PREVIEWS_DIR = ROOT / "media" / "previews"
CLIP_EXT = {".mp4", ".mkv", ".mov"}


def _make_library() -> Any:
    from engine.voice_library import VoiceLibrary, backend_from_env

    try:
        return VoiceLibrary(backend_from_env())
    except Exception as e:  # e.g. bad token: run without it and say why
        lib = VoiceLibrary(None)
        lib.error = f"voice library unavailable: {type(e).__name__}: {e}"[:300]
        return lib


class SessionBusyError(RuntimeError):
    """The one-session slot is taken. Carries the blocking session so a UI or an agent can act
    on it (HTTP 409 body: code, message, session_id, state, actions)."""

    def __init__(self, message: str, session: PilotSession | None = None) -> None:
        super().__init__(message)
        self.session = session

    def detail(self) -> dict[str, Any]:
        ps = self.session
        return {
            "code": "session_busy",
            "message": str(self),
            "session_id": ps.session_id if ps else None,
            "state": str(ps.status) if ps else None,
            "actions": ps.actions() if ps else [],
        }


def enroll_path_for(clip_stem: str) -> Path:
    name = clip_stem.replace("synthetic_match", "synthetic")
    return ROOT / "config" / f"enroll.{name}.yaml"


def list_clips() -> list[dict[str, Any]]:
    out = []
    for p in sorted(CLIPS_DIR.iterdir()) if CLIPS_DIR.exists() else []:
        if p.suffix.lower() not in CLIP_EXT:
            continue
        try:
            dur = float(probe(p)["duration"])
        except Exception:
            continue
        out.append(
            {
                "clip_id": p.name,
                "name": p.stem.replace("_", " "),
                "duration": round(dur, 2),
                "url": f"/media/clips/{p.name}",
                "has_truth": p.with_suffix(".truth.json").exists(),
                "has_enroll": enroll_path_for(p.stem).exists(),
            }
        )
    return out


@dataclass
class PilotSession:
    session_id: str
    clip: Path
    cfg: EngineConfig
    engine: Session
    out_dir: Path
    use_enroll: bool
    status: State = State.READY  # change only via SessionManager._set_state (app/lifecycle.py)
    error: str | None = None
    task: asyncio.Task[None] | None = None
    report_ready: bool = False
    clients: int = 0
    metrics: dict[str, Any] = field(default_factory=dict)
    created: float = field(default_factory=time.monotonic)
    live: Any | None = None  # engine.ingest.live.LiveSource for live-input sessions
    owner: str = "viewer"  # viewer | capture | lab — who drives it (lab runs are never abandoned)

    @property
    def clip_id(self) -> str:
        return self.clip.name

    @property
    def paused(self) -> bool:
        return bool(getattr(self.engine.clock, "paused", False))

    def actions(self) -> list[str]:
        return allowed_actions(self.status, self.paused, self.report_ready)


def known_voice_clips(voice_ids: list[str]) -> list[tuple[str, list[Any]]]:
    """Voice Lab samples of known commentators → (name, [16 kHz clips]) for enrollment."""
    from engine.ingest.decode import decode_audio
    from engine.voices_custom import CUSTOM_DIR, get_meta

    out: list[tuple[str, list[Any]]] = []
    for vid in voice_ids[:8]:
        meta = get_meta(vid)  # KeyError → unknown voice (API answers 400)
        d = CUSTOM_DIR / vid[3:]
        files = [d / r["file"] for rs in (meta.get("refs") or {}).values() for r in rs] or [
            d / "ref.mp3"
        ]
        out.append((str(meta["name"]), [decode_audio(f, 16000) for f in files if f.exists()]))
    return out


def two_pass_accuracy(engine: Session, truth: dict[str, Any]) -> float | None:
    """Recorded clips: re-label every line with the whole recording known (two-pass clustering)
    and score it like the live labels — what a post-match report could show."""
    import numpy as np

    from engine.metrics.compute import speaker_metrics
    from engine.speakers.tracker import offline_labels

    rec = engine.store.record.model_copy(deep=True)
    lines = [ln for ln in rec.lines if ln.line_id in engine.line_embeddings]
    if len(lines) < 3:
        return None
    emb = np.stack([engine.line_embeddings[ln.line_id] for ln in lines])
    labels = offline_labels(emb, [ln.t_end - ln.t_start for ln in lines], 0.85)
    for ln, lb in zip(lines, labels, strict=True):
        ln.speaker_id = lb
    res = speaker_metrics(rec, truth["lines"], engine.duration)
    acc = res.get("speaker_accuracy")
    return None if acc is None else float(acc)


class SessionManager:
    def __init__(self, cfg: EngineConfig | None = None) -> None:
        self.cfg = cfg or load_engine_config()
        self.models: Models | None = None
        self.sessions: dict[str, PilotSession] = {}
        self.load_log: list[str] = []
        self.pending_reload = False  # keys were saved while a session ran: reload when it ends
        self.library = _make_library()  # permanent voice library (engine/voice_library.py)

    @property
    def catalog(self) -> VoiceCatalog:
        """Re-read on every use so custom voices added while the server runs appear at once.
        The public app (role "app") does not offer voices the owner hid in the Voice Studio."""
        return load_voice_catalog(include_hidden=self.library.role != "app")

    @property
    def cloning(self) -> bool:
        return bool(self.models and getattr(self.models.tts, "supports_cloning", False))

    def preview_name(self, voice_id: str) -> str:
        """Previews are per engine: a Fish clone sounds different from the local Kokoro voice."""
        return f"{voice_id}.{'fish' if self.cloning else 'local'}.wav"

    def make_preview(self, voice_id: str, speed: float = 1.0) -> Path:
        import soundfile as sf

        from engine.providers.base import DeliveryStyle

        assert self.models is not None and self.models.tts is not None
        PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
        path = PREVIEWS_DIR / self.preview_name(voice_id)
        res = self.models.tts.synthesize(
            self.catalog.preview_text, voice_id, DeliveryStyle(speed=speed)
        )
        sf.write(path, res.audio, res.sr, subtype="PCM_16")
        return path

    # ---- startup
    def load_models(self) -> None:
        self.models = Models.load(self.cfg, {"asr", "speaker", "tts"}, log=self._log)
        self.make_previews()

    def reload_engines(self) -> dict[str, Any]:
        """Re-check the keys and switch speech-to-text / voices without restarting (used after a
        key is entered in the app). Refused while a session is running."""
        busy = self.active()
        if busy is not None:
            raise SessionBusyError("stop the running session first", busy)
        if self.models is None:
            raise RuntimeError("models are still loading")
        fresh = load_engine_config()
        m2 = Models.load(fresh, {"asr", "tts"}, log=self._log)
        self.models.asr, self.models.tts = m2.asr, m2.tts
        self.models.engines.update(m2.engines)
        self.models.info.update(m2.info)
        self.cfg.asr, self.cfg.tts = fresh.asr, fresh.tts
        threading.Thread(target=self.make_previews, daemon=True).start()
        return dict(self.models.engines)

    def _log(self, msg: str) -> None:
        self.load_log.append(msg)
        if msg.startswith(("VOICES", "speech-to-text")):  # shown in the terminal running the app
            print(f"\n>>> {msg}\n", flush=True)

    def make_previews(self) -> None:
        """3-second preview per enabled voice (docs/08 §8.2), generated once per engine."""
        for v in self.catalog.pilot_voices():
            if v.voice_id.startswith("cu_") and not self.cloning:
                continue
            if not (PREVIEWS_DIR / self.preview_name(v.voice_id)).exists():
                self.make_preview(v.voice_id, v.base_speed)
                self.load_log.append(f"preview {v.voice_id}")

    # ---- sessions
    def _set_state(self, ps: PilotSession, dst: State) -> None:
        """The only place a session's status changes (raises on an impossible transition)."""
        if ps.status == dst:
            return
        ps.status = check(ps.status, dst)
        self.load_log.append(f"session {ps.session_id}: {dst.value}")

    def occupying(self) -> PilotSession | None:
        """The session holding the one-session slot (ready or live), stuck or not."""
        for s in self.sessions.values():
            if s.status in (State.READY, State.LIVE):
                return s
        return None

    def active(self) -> PilotSession | None:
        """The session that really blocks a new one: occupying the slot and not stuck."""
        s = self.occupying()
        return None if s is None or self._stuck(s) else s

    @staticmethod
    def _stuck(ps: PilotSession) -> bool:
        """Holds the slot but can't (or won't) finish: unstarted, already done, or paused / a
        live input with nobody connected (a viewer paused and closed the tab)."""
        if ps.status == State.READY and ps.task is None:
            # just created: give its client a moment to connect before it can be replaced
            return ps.owner != "capture" or time.monotonic() - ps.created > 10.0
        if ps.task is not None and ps.task.done():
            return True
        if ps.owner == "lab":
            return False  # a Quality Lab run plays with nobody watching on purpose
        return ps.clients == 0 and (ps.paused or ps.live is not None)

    def _replace_stuck(self) -> None:
        busy = self.occupying()
        if busy is None:
            return
        if not self._stuck(busy):
            raise SessionBusyError(
                f"session {busy.session_id} is still running; only one live session at a "
                "time on this CPU. Stop it first.",
                busy,
            )
        self.stop(busy)

    def create(
        self,
        clip_id: str,
        max_speakers: int = 2,
        voice_map: dict[str, str] | None = None,
        use_enroll: bool = False,
        speed: float = 1.0,
        view_delay_s: float = 0.0,
        known_voices: list[str] | None = None,
    ) -> PilotSession:
        self._replace_stuck()  # an abandoned or stuck session never blocks a new one
        clip = CLIPS_DIR / Path(clip_id).name
        if not clip.exists():
            raise FileNotFoundError(clip_id)
        if voice_map:
            for vid in voice_map.values():
                self.catalog.get(vid)
        assert self.models is not None
        cfg = self.cfg.model_copy(deep=True)
        cfg.mode = "pilot"
        cfg.speed = speed
        cfg.speaker.max_speakers = max_speakers
        cfg.schedule.broadcast_delay_s = view_delay_s
        sid = time.strftime("%Y%m%d-%H%M%S") + "_" + uuid.uuid4().hex[:6]
        out = SESSIONS_DIR / sid
        out.mkdir(parents=True, exist_ok=True)
        enroll: EnrollFile | None = None
        if use_enroll and enroll_path_for(clip.stem).exists():
            enroll = load_enroll(enroll_path_for(clip.stem))
        engine = Session(
            cfg, clip, self.models, out, session_id=sid, enroll=enroll, voice_map=voice_map,
            known_voices=known_voice_clips(known_voices or []),
        )  # fmt: skip
        ps = PilotSession(sid, clip, cfg, engine, out, use_enroll=enroll is not None)
        self.sessions[sid] = ps
        return ps

    def create_live(
        self,
        max_speakers: int = 2,
        voice_map: dict[str, str] | None = None,
        view_delay_s: float = 0.0,
        label: str = "live",
        known_voices: list[str] | None = None,
    ) -> PilotSession:
        """A session fed by live audio from a capture client (extension / Live capture page)."""
        from engine.ingest.live import LiveSource

        self._replace_stuck()
        if voice_map:
            for vid in voice_map.values():
                self.catalog.get(vid)
        assert self.models is not None
        cfg = self.cfg.model_copy(deep=True)
        cfg.mode = "pilot"
        cfg.speed = 1.0
        cfg.speaker.max_speakers = max_speakers
        cfg.schedule.broadcast_delay_s = view_delay_s
        sid = time.strftime("%Y%m%d-%H%M%S") + "_live_" + uuid.uuid4().hex[:6]
        out = SESSIONS_DIR / sid
        out.mkdir(parents=True, exist_ok=True)
        safe = "".join(c for c in label if c.isalnum() or c in " -_.")[:60] or "live"
        source = LiveSource(cfg.audio.analysis_sr, record_path=str(out / "live_input.wav"))
        engine = Session(cfg, Path("live") / safe, self.models, out, session_id=sid,
                         voice_map=voice_map, live=source,
                         known_voices=known_voice_clips(known_voices or []))  # fmt: skip
        ps = PilotSession(sid, Path("live") / safe, cfg, engine, out, use_enroll=False, live=source,
                          owner="capture")  # fmt: skip
        self.sessions[sid] = ps
        return ps

    def is_idle(self) -> bool:
        """Safe to restart the server (auto-update): no session is playing or still writing its
        report, no Quality Lab run is scoring and no pro voice is being built. A session that was
        opened but never started, or is stuck, does not count (it would block updates forever)."""
        for s in self.sessions.values():
            running = s.task is not None and not s.task.done()
            if s.status == State.STOPPING and running:
                return False
            if s.status == State.LIVE and running and not self._stuck(s):
                return False
        from app import lab
        from engine import voices_pro

        if lab.running_count() > 0:
            return False
        return not any(j.stage not in ("done", "error") for j in voices_pro.JOBS.values())

    def get(self, sid: str) -> PilotSession:
        return self.sessions[sid]

    def start(self, ps: PilotSession) -> bool:
        """ready → live. False when it can't start (already started, stopping or finished)."""
        if ps.task is not None or ps.status != State.READY:
            return False
        self._set_state(ps, State.LIVE)
        ps.task = asyncio.create_task(self._run(ps))
        return True

    async def _run(self, ps: PilotSession) -> None:
        crashed = None
        try:
            await ps.engine.run()
            self._set_state(ps, State.ENDED)
        except Exception as e:
            crashed = f"{type(e).__name__}: {e}"
            self._set_state(ps, State.ERROR)
            ps.error = crashed
            ps.engine.store.bus.publish("session.warning", message=f"session crashed: {crashed}")
            ps.engine.store.bus.publish("session.ended")
        finally:
            await asyncio.get_running_loop().run_in_executor(None, self._finalize, ps, crashed)
            if self.pending_reload and self.active() is None:  # keys saved during the session
                self.pending_reload = False
                with contextlib.suppress(Exception):
                    await asyncio.get_running_loop().run_in_executor(None, self.reload_engines)

    def _finalize(self, ps: PilotSession, crashed: str | None) -> None:
        rec = ps.engine.store.record
        ps.engine.store.checkpoint(ps.out_dir / "record.json")
        truth_path = ps.clip.with_suffix(".truth.json")
        truth = json.loads(truth_path.read_text()) if truth_path.exists() else None
        metrics = compute_all(rec, truth, ps.engine.duration)
        if truth is not None and ps.engine.line_embeddings and "speaker" in metrics:
            metrics["speaker"]["two_pass_accuracy"] = two_pass_accuracy(ps.engine, truth)
        assert self.models is not None
        from app.hosting import deployed_commit

        metrics["run"] = {
            "run_id": ps.session_id,
            "commit": (deployed_commit(ROOT) or "")[:8],
            "clip": str(ps.clip),
            "truth": str(truth_path) if truth else None,
            "enroll": str(enroll_path_for(ps.clip.stem)) if ps.use_enroll else None,
            "clip_duration_s": round(ps.engine.duration, 3),
            "live_wall_s": round((ps.engine.finished_wall or 0) - (ps.engine.started_wall or 0), 2),
            "wall_s": round(time.monotonic() - ps.created, 2),
            "speed": ps.cfg.speed,
            "crashes": 0 if crashed is None else 1,
            "crash": crashed,
            "models": self.models.info,
            "model_load_s": self.models.load_s,
            "cpu_count": __import__("os").cpu_count(),
            "config_hash": ps.cfg.snapshot_hash(),
            "max_speakers": ps.cfg.speaker.max_speakers,
            "voice_map": ps.engine.voice_map,
            "voice_switches": ps.engine.voice_switches,
        }
        (ps.out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2, default=str))
        write_lines_csv(rec, ps.out_dir / "lines.csv")
        write_report(ps.out_dir, metrics, rec)
        ps.metrics = metrics
        ps.report_ready = True

    def stop(self, ps: PilotSession) -> None:
        """live → stopping (the engine drains, then _run moves it to ended); a session that never
        started ends at once and tells its clients. Stopping a finished session does nothing."""
        if ps.status in TERMINAL or ps.status == State.STOPPING:
            return
        ps.engine.stop()
        if ps.status == State.READY and ps.task is None:
            self._set_state(ps, State.ENDED)
            ps.engine.store.bus.publish("session.ended")
        elif ps.task is not None and ps.task.done():
            pass  # _run already set the final state
        else:
            self._set_state(ps, State.STOPPING)
