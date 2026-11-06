"""SessionManager: create / run / stop Pilot sessions (docs/06 §6.5).

Models are loaded once per process and shared. Only ONE active session at a time (CPU budget);
a second create while one is live raises SessionBusyError (HTTP 409).
"""

from __future__ import annotations

import asyncio
import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

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


class SessionBusyError(RuntimeError):
    pass


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
    status: str = "ready"  # ready | live | ended | error
    error: str | None = None
    task: asyncio.Task[None] | None = None
    report_ready: bool = False
    clients: int = 0
    metrics: dict[str, Any] = field(default_factory=dict)
    created: float = field(default_factory=time.monotonic)
    live: Any | None = None  # engine.ingest.live.LiveSource for live-input sessions

    @property
    def clip_id(self) -> str:
        return self.clip.name


class SessionManager:
    def __init__(self, cfg: EngineConfig | None = None) -> None:
        self.cfg = cfg or load_engine_config()
        self.models: Models | None = None
        self.sessions: dict[str, PilotSession] = {}
        self.load_log: list[str] = []

    @property
    def catalog(self) -> VoiceCatalog:
        """Re-read on every use so custom voices added while the server runs appear at once."""
        return load_voice_catalog()

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
        if self.active() is not None:
            raise SessionBusyError("stop the running session first")
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
    def active(self) -> PilotSession | None:
        for s in self.sessions.values():
            if s.status in ("ready", "live"):
                return s
        return None

    def create(
        self,
        clip_id: str,
        max_speakers: int = 2,
        voice_map: dict[str, str] | None = None,
        use_enroll: bool = False,
        speed: float = 1.0,
        view_delay_s: float = 0.0,
    ) -> PilotSession:
        busy = self.active()
        if busy is not None:
            if busy.status == "ready" and busy.task is None:
                # an unstarted session is replaced, so an abandoned tab never blocks the pilot
                busy.status = "ended"
            else:
                raise SessionBusyError(
                    f"session {busy.session_id} is still running; only one live session at a "
                    "time on this CPU. Stop it first."
                )
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
            cfg, clip, self.models, out, session_id=sid, enroll=enroll, voice_map=voice_map
        )
        ps = PilotSession(sid, clip, cfg, engine, out, use_enroll=enroll is not None)
        self.sessions[sid] = ps
        return ps

    def create_live(
        self,
        max_speakers: int = 2,
        voice_map: dict[str, str] | None = None,
        view_delay_s: float = 0.0,
        label: str = "live",
    ) -> PilotSession:
        """A session fed by live audio from a capture client (extension / Live capture page)."""
        from engine.ingest.live import LiveSource

        busy = self.active()
        if busy is not None:
            if (busy.status == "ready" and busy.task is None) or (
                busy.live is not None and busy.clients == 0
            ):
                busy.engine.stop()
                busy.status = "ended"
            else:
                raise SessionBusyError(
                    f"session {busy.session_id} is still running; stop it first (one at a time)."
                )
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
                         voice_map=voice_map, live=source)  # fmt: skip
        ps = PilotSession(sid, Path("live") / safe, cfg, engine, out, use_enroll=False, live=source)
        self.sessions[sid] = ps
        return ps

    def get(self, sid: str) -> PilotSession:
        return self.sessions[sid]

    def start(self, ps: PilotSession) -> None:
        if ps.task is not None:
            return
        ps.status = "live"
        ps.task = asyncio.create_task(self._run(ps))

    async def _run(self, ps: PilotSession) -> None:
        crashed = None
        try:
            await ps.engine.run()
            ps.status = "ended"
        except Exception as e:
            crashed = f"{type(e).__name__}: {e}"
            ps.status = "error"
            ps.error = crashed
            ps.engine.store.bus.publish("session.warning", message=f"session crashed: {crashed}")
            ps.engine.store.bus.publish("session.ended")
        finally:
            await asyncio.get_running_loop().run_in_executor(None, self._finalize, ps, crashed)

    def _finalize(self, ps: PilotSession, crashed: str | None) -> None:
        rec = ps.engine.store.record
        ps.engine.store.checkpoint(ps.out_dir / "record.json")
        truth_path = ps.clip.with_suffix(".truth.json")
        truth = json.loads(truth_path.read_text()) if truth_path.exists() else None
        metrics = compute_all(rec, truth, ps.engine.duration)
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
        ps.engine.stop()
