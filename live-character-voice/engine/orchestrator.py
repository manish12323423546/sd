"""Session orchestrator: wires every stage for one session on one asyncio loop (docs/02).

feeder ─► VAD ─► segmenter ─► line ─┬─ ASR ─────────┐
                                    ├─ speaker emb ─┼─► emotion label ─► line.complete ─► TTS pool
                                    └─ prosody ─────┘                                       │
                                               scheduler (in line order, catch-up) ◄────────┘

Stage results are written to the live record ONLY on the loop thread. CPU-heavy model calls run in
thread pools (the native code releases the GIL). Every stage stamps a session-clock time.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
import time
from collections import deque
from collections.abc import AsyncIterator, Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import partial
from pathlib import Path
from typing import Any, TypeVar

import numpy as np

from engine.asr_guard import guard as asr_guard
from engine.audio import F32
from engine.config import EngineConfig, load_voice_catalog
from engine.ingest.decode import decode_audio
from engine.ingest.feeder import AudioChunk, SessionClock, feed
from engine.priority_executor import PriorityExecutor
from engine.providers.base import (
    ASRProvider,
    ASRResult,
    EmotionContext,
    EmotionProvider,
    SpeakerProvider,
    TTSProvider,
    Word,
)
from engine.record.models import Emotion, Line, SessionRecord, Speaker, line_id_for
from engine.record.store import RecordStore
from engine.runlog import RunLog
from engine.schedule.scheduler import (
    PrevPlayback,
    drift_slope,
    drift_warning,
    plan_playback,
    should_drop,
)
from engine.segment.segmenter import LineCandidate, LineSegmenter
from engine.speakers.enroll import EnrollFile
from engine.speakers.online_cluster import OnlineClusterer
from engine.speakers.tracker import SpeakerTracker
from engine.tts.style import style_for, style_hash
from engine.tts.worker import (
    TtsCache,
    estimate_duration,
    prepare_text,
    stream_line,
    stretch_file,
    synthesize_line,
)

T = TypeVar("T")
STOP_AFTER = ("segment", "understand", "tts", "all")
CHECKPOINT_EVERY_S = 30.0
DRIFT_EVERY_S = 60.0
METRICS_EVERY_S = 5.0
NOISE_NO_SPEECH = 0.6
SPLIT_MIN_LINE_S = 2.5
SPLIT_CHECK_EVERY_S = 1.0
SPLIT_WINDOW_S = 1.5
STREAM_BACKLOG_S = 1.0  # voices queued longer than this → request faster speech
STREAM_MARGIN_S = 0.15  # start a streamed line this long after its first audio arrived


def _t(**stamps: float) -> dict[str, Any]:
    """Stage time stamps as `times.<name>` update fields."""
    return {f"times.{k}": v for k, v in stamps.items()}


def load_glossary(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [ln.strip() for ln in path.read_text().splitlines() if ln.strip() and ln[0] != "#"]


@dataclass
class Models:
    """Loaded once per process and shared by sessions (docs/06 §6.6)."""

    asr: ASRProvider | None = None
    speaker: SpeakerProvider | None = None
    tts: TTSProvider | None = None
    load_s: dict[str, float] = field(default_factory=dict)
    info: dict[str, str] = field(default_factory=dict)
    engines: dict[str, dict[str, Any]] = field(default_factory=dict)  # plain-language status
    asr_backup: str = "local"  # engine for lines the main speech-to-text can't take

    @classmethod
    def load(
        cls,
        cfg: EngineConfig,
        stages: set[str],
        log: Callable[[str], None] = print,
        torch_threads: int | None = None,
    ) -> Models:
        from engine.providers import registry

        m = cls()
        threads = torch_threads or cfg.runtime.torch_threads
        if threads and stages & {"speaker", "tts"}:
            import torch

            torch.set_num_threads(threads)
            m.info["torch_threads"] = str(threads)

        def timed(name: str, fn: Callable[[], Any]) -> Any:
            t = time.monotonic()
            obj = fn()
            m.load_s[name] = round(time.monotonic() - t, 2)
            log(f"loaded {name} in {m.load_s[name]} s")
            return obj

        # "auto": use the hosted providers when their keys are configured, else the local ones
        # A key that is present but rejected is reported (not silently ignored).
        if cfg.asr.provider == "auto" and "asr" in stages and cfg.source == "asr":
            from engine.keycheck import check_deepgram, check_groq

            # choice: LCV_ASR = auto | deepgram | groq | local (set in the app's Keys dialog)
            want = os.environ.get("LCV_ASR", "auto").strip().lower() or "auto"
            d = check_deepgram() if want != "local" else None
            g = check_groq() if want != "local" else None
            d_ok, g_ok = bool(d and d.ok), bool(g and g.ok)
            # measured (BUILD_LOG V8): in the live pipeline Groq + context prompt is the most
            # accurate (WER 6.5 % vs Deepgram 10.7 %), Deepgram is faster per phrase. Auto: Groq
            # first, Deepgram for the lines Groq's free tier can't take (instead of offline).
            m.asr_backup = "deepgram" if d_ok else "local"
            if (want == "deepgram" and d_ok) or (want == "auto" and d_ok and not g_ok):
                cfg.asr.provider, name, note = (
                    "deepgram",
                    "Deepgram Nova-3",
                    "backup: " + ("Groq" if g_ok else "offline Whisper"),
                )
            elif want in ("auto", "groq", "deepgram") and g_ok:
                cfg.asr.provider = "groq"
                name = "Groq whisper-large-v3-turbo"
                note = "backup: Deepgram" if d_ok else "backup: offline Whisper"
                if want == "deepgram" and d is not None:
                    note = f"Deepgram not used: {d.message}"
            else:
                cfg.asr.provider, name = "faster_whisper", "offline Whisper"
                note = "chosen in settings" if want == "local" else (g.message if g else "")
            online = cfg.asr.provider != "faster_whisper"
            dg_note = d.message if d is not None else "not checked"
            m.engines["text"] = {"online": online, "name": name, "note": note, "choice": want,
                                 "deepgram": dg_note}  # fmt: skip
            log(f"speech-to-text: {name} ({note})")
        elif cfg.asr.provider == "auto":
            cfg.asr.provider = (
                "deepgram"
                if os.environ.get("DEEPGRAM_API_KEY")
                else "groq"
                if os.environ.get("GROQ_API_KEY")
                else "faster_whisper"
            )
        if cfg.tts.provider == "auto" and "tts" in stages:
            from engine.keycheck import check_fish

            f = check_fish()
            cfg.tts.provider = "fish" if f.ok else "kokoro"
            if f.ok:
                cfg.tts.workers = max(cfg.tts.workers, 3)
            m.engines["voices"] = {"online": f.ok, "name": "Fish Audio s2.1-pro-free"
                                   if f.ok else "offline Kokoro", "note": f.message}  # fmt: skip
            log(f"VOICES: {m.engines['voices']['name']} ({f.message})")
        elif cfg.tts.provider == "auto":
            has_fish = os.environ.get("FISH_API_KEY") or os.environ.get("FISH_API_KEY_FILE")
            cfg.tts.provider = "fish" if has_fish else "kokoro"
        if "asr" in stages and cfg.source == "asr":
            if cfg.asr.provider == "deepgram":
                m.asr = timed(
                    "asr",
                    lambda: registry.create(
                        "asr",
                        "deepgram",
                        model=cfg.asr.deepgram_model,
                        fallback_model=cfg.asr.model,
                        groq_model=cfg.asr.groq_model,
                    ),
                )
            elif cfg.asr.provider == "groq":

                def groq() -> Any:
                    fb = None
                    if m.asr_backup == "deepgram":
                        from engine.providers.free.asr_faster_whisper import FasterWhisperASR

                        fb = registry.create(
                            "asr",
                            "deepgram",
                            model=cfg.asr.deepgram_model,
                            fallback=FasterWhisperASR(cfg.asr.model),
                        )
                    return registry.create(
                        "asr",
                        "groq",
                        model=cfg.asr.groq_model,
                        fallback_model=cfg.asr.model,
                        fallback=fb,
                    )

                m.asr = timed("asr", groq)
            else:
                m.asr = timed(
                    "asr",
                    lambda: registry.create(
                        "asr",
                        cfg.asr.provider,
                        model=cfg.asr.model,
                        compute_type=cfg.asr.compute_type,
                        cpu_threads=cfg.asr.cpu_threads,
                        beam_size=cfg.asr.beam_size,
                    ),
                )
            m.info["asr"] = (
                f"deepgram:{cfg.asr.deepgram_model} (fallback groq/local)"
                if cfg.asr.provider == "deepgram"
                else f"groq:{cfg.asr.groq_model} (backup {m.asr_backup})"
                if cfg.asr.provider == "groq"
                else f"{cfg.asr.provider}:{cfg.asr.model} ({cfg.asr.compute_type}, "
                f"{cfg.asr.cpu_threads} threads)"
            )
        if "speaker" in stages:
            m.speaker = timed("speaker", lambda: registry.create("speaker", cfg.speaker.provider))
            m.info["speaker"] = cfg.speaker.provider
        if "tts" in stages:
            kwargs: dict[str, Any] = {}
            if cfg.tts.provider == "fish":
                kwargs = {"model": cfg.tts.fish_model, "latency": cfg.tts.fish_latency}
            m.tts = timed("tts", lambda: registry.create("tts", cfg.tts.provider, **kwargs))
            m.info["tts"] = cfg.tts.provider + (
                f":{cfg.tts.fish_model} ({cfg.tts.fish_latency})"
                if cfg.tts.provider == "fish"
                else ""
            )
        m.warm(log)
        return m

    def warm(self, log: Callable[[str], None] = print) -> None:
        """1 s dummy call per model so the first real line is not slow (docs/06 §6.6)."""
        from engine.providers.base import DeliveryStyle

        t = time.monotonic()
        rng = np.random.default_rng(0)
        # short AND worst-case sizes: a max-length line (6 s + padding) and a long sentence, so the
        # native libraries reach their buffer high-water mark before the first viewer (M10:
        # the first long line otherwise raised RSS by ~330 MB mid-session).
        for seconds in (1.0, 6.5):
            noise = (rng.standard_normal(int(16000 * seconds)) * 0.01).astype(np.float32)
            if self.asr is not None:
                with contextlib.suppress(Exception):
                    self.asr.transcribe(noise, 16000)
            if self.speaker is not None:
                self.speaker.embed(noise, 16000)
        if self.tts is not None:
            long_text = (
                "Okafor takes a touch on the edge of the area, shifts it onto his right foot "
                "and curls it towards the far corner, and the keeper is beaten all ends up!"
            )
            for voice in ("am_adam", "bm_george"):
                self.tts.synthesize("Warming up.", voice, DeliveryStyle())
                self.tts.synthesize(long_text, voice, DeliveryStyle())
        malloc_trim()
        self.load_s["warmup"] = round(time.monotonic() - t, 2)
        log(f"warm-up done in {self.load_s['warmup']} s")


@dataclass
class _LineWork:
    cand: LineCandidate
    asr: ASRResult | None = None
    features: dict[str, float] | None = None


class Session:
    def __init__(
        self,
        cfg: EngineConfig,
        clip_path: str | Path,
        models: Models,
        out_dir: Path,
        *,
        session_id: str | None = None,
        stop_after: str = "all",
        enroll: EnrollFile | None = None,
        voice_map: dict[str, str] | None = None,
        captions_path: str | Path | None = None,
        echo_log: bool = False,
        emotion: EmotionProvider | None = None,
        vad_factory: Callable[[], Any] | None = None,
        live: Any | None = None,
        known_voices: list[tuple[str, list[Any]]] | None = None,
    ) -> None:
        if stop_after not in STOP_AFTER:
            raise ValueError(f"stop_after must be one of {STOP_AFTER}")
        self.cfg = cfg
        self.clip_path = Path(clip_path)
        self.models = models
        self.out_dir = out_dir
        self.stop_after = stop_after
        self.enroll = enroll
        self.voice_map: dict[str, str] = dict(cfg.tts.voice_map)
        if voice_map:
            self.voice_map.update(voice_map)
        self.catalog = load_voice_catalog()
        self.glossary = load_glossary(
            Path(__file__).resolve().parent.parent / "config/glossary.txt"
        )
        self.sr = cfg.audio.analysis_sr
        self.live = live  # engine.ingest.live.LiveSource: audio pushed by a capture client
        self.clock: Any = live.clock if live is not None else SessionClock(cfg.speed)
        self.session_id = session_id or out_dir.name
        record = SessionRecord(
            session_id=self.session_id,
            clip_path=str(clip_path),
            mode=cfg.mode,
            speed=cfg.speed,
            source=cfg.source,
            started_at_iso=datetime.now(UTC).isoformat(timespec="seconds"),
            config_snapshot=cfg.snapshot(),
        )
        self.store = RecordStore(record)
        self.log = RunLog(out_dir / "run.log", echo=echo_log)
        self.tts_dir = out_dir / "tts"
        self.segmenter = LineSegmenter(cfg.segment, cfg.vad.threshold, self.sr)
        self.cluster: Any = (
            SpeakerTracker(cfg.speaker)
            if cfg.speaker.tracker == "v2"
            else OnlineClusterer(cfg.speaker)
        )
        self.known_voices = known_voices or []  # (name, [audio arrays]) — enrolled before start
        self.line_embeddings: dict[str, Any] = {}  # for the two-pass report labels
        if emotion is None:
            from engine.providers.free.emotion_prosody import ProsodyEmotion

            emotion = ProsodyEmotion(cfg.emotion)
        self.emotion = emotion
        self.vad_factory = vad_factory or _make_vad
        self.captions_asr: ASRProvider | None = None
        if cfg.source == "captions":
            from engine.providers.free.asr_captions import CaptionsASR

            if captions_path is None:
                raise ValueError("source=captions needs a captions file")
            self.captions_asr = CaptionsASR(captions_path)
        # pools: one ASR at a time (it uses all cores itself), one speaker thread keeps
        # embeddings in line order, N TTS workers, one misc thread for cheap DSP.
        self.asr_pool = ThreadPoolExecutor(1, thread_name_prefix="asr")
        self.spk_pool = ThreadPoolExecutor(1, thread_name_prefix="spk")
        self.tts_pool = ThreadPoolExecutor(cfg.tts.workers, thread_name_prefix="tts")
        # compute lane (M7): ASR + TTS one at a time with all cores, oldest line first
        self.lane = PriorityExecutor("lane") if cfg.runtime.compute_lane else None
        self.misc_pool = ThreadPoolExecutor(1, thread_name_prefix="misc")
        self.tts_cache = TtsCache()
        self._work: dict[str, _LineWork] = {}
        self._tasks: set[asyncio.Task[None]] = set()
        self._order: list[str] = []
        self._status: dict[str, str] = {}  # pending | ready | skip
        self._sched_event = asyncio.Event()
        self._tts_queue: deque[str] = deque()
        self._tts_event = asyncio.Event()
        self._tts_busy = 0
        self._prev_play: PrevPlayback | None = None
        self._prev_line: str | None = None
        self._rate: dict[str, float] = {}  # V3: seconds per character at speed 1.0, per voice
        self._stop = asyncio.Event()
        self._feed_done = False
        self._split_busy = False
        self._last_split_check = 0.0
        self._split_line: float | None = None
        self._split_windows: list[tuple[float, Any]] = []
        self._n_lines = 0
        self.duration = 0.0
        self.started_wall: float | None = None
        self.finished_wall: float | None = None
        self.voice_switches: list[dict[str, Any]] = []
        self.audio_override: F32 | None = None  # tests: skip FFmpeg decode

    # ------------------------------------------------------------------ public
    def stop(self) -> None:
        self._stop.set()
        if self.live is not None:
            self.live.close()  # wakes the feed loop even when no audio is arriving

    def set_voice(self, speaker_id: str, voice_id: str) -> None:
        """Applies to every line whose TTS has not started (docs/05 voice switch rule)."""
        self.catalog.get(voice_id)  # KeyError for unknown voices
        self.voice_map[speaker_id] = voice_id
        sp = self.store.record.speakers.get(speaker_id)
        if sp is not None:
            sp.voice_id = voice_id
            self.store.upsert_speaker(sp)
        self.voice_switches.append(
            {"t": self.clock.now(), "speaker_id": speaker_id, "voice_id": voice_id}
        )
        self.log.log("voice.switch", speaker_id=speaker_id, voice_id=voice_id, t=self.clock.now())

    def metrics_snapshot(self) -> dict[str, float | int]:
        lines = self.store.record.lines
        played = [ln for ln in lines if ln.times.play_at is not None]
        # V3 headline: FELT delay = voice start − original line start, in the viewer's timeline
        felt = [(ln.t_start, ln.times.play_at - self.view_delay - ln.t_start) for ln in played
                if ln.times.play_at is not None]  # fmt: skip
        delays = [max(0.0, d) for _, d in felt]
        slope = drift_slope([t for t, _ in felt], delays)
        return {
            "p50_delay": round(float(np.percentile(delays, 50)), 3) if delays else 0.0,
            "p95_delay": round(float(np.percentile(delays, 95)), 3) if delays else 0.0,
            "last_delay": round(delays[-1], 3) if delays else 0.0,
            "drift_slope": round(slope, 4),
            "lines": len(lines),
            "played": len(played),
            "dropped": sum(1 for ln in lines if ln.schedule_action == "dropped"),
            "view_delay": self.view_delay,
        }

    async def run(self) -> SessionRecord:
        loop = asyncio.get_running_loop()
        t_decode = time.monotonic()
        audio: F32 | None = None
        if self.live is not None:
            source: AsyncIterator[AudioChunk] = self.live.chunks(self.cfg.audio.chunk_ms)
        else:
            if self.audio_override is not None:
                audio = self.audio_override
            else:
                audio = await loop.run_in_executor(
                    self.misc_pool, decode_audio, self.clip_path, self.sr
                )
            self.duration = audio.size / self.sr
            self.log.log(
                "decode", seconds=round(time.monotonic() - t_decode, 3), duration=self.duration
            )
            if self.enroll is not None and self.models.speaker is not None:
                await self._do_enroll(audio)
            source = feed(audio, self.sr, self.cfg.audio.chunk_ms, self.clock)
        if self.known_voices and self.models.speaker is not None:
            await self._enroll_known()
        vad = await loop.run_in_executor(self.misc_pool, self.vad_factory)

        workers = []
        if self.stop_after in ("tts", "all"):
            workers = [
                asyncio.create_task(self._tts_worker(i)) for i in range(self.cfg.tts.workers)
            ]
        scheduler = asyncio.create_task(self._scheduler())

        self.clock.start()
        self.started_wall = time.monotonic()
        self.log.log("session.start", speed=self.cfg.speed, stop_after=self.stop_after)
        next_ckpt, next_drift, next_metrics = (
            CHECKPOINT_EVERY_S,
            DRIFT_EVERY_S,
            METRICS_EVERY_S,
        )
        async for chunk in source:
            if self._stop.is_set():
                break
            if self.live is not None:
                self.duration = chunk.media_end
            probs, frames = vad.process(chunk.samples)
            for cand in self.segmenter.push(probs, frames):
                self._on_line(cand)
            self._maybe_speaker_split()
            now = chunk.media_end
            if now >= next_metrics:
                next_metrics += METRICS_EVERY_S
                self.store.bus.publish("session.metrics", **self.metrics_snapshot())
            if now >= next_ckpt:
                next_ckpt += CHECKPOINT_EVERY_S
                self.store.checkpoint(self.out_dir / "record.json")
            if now >= next_drift:
                next_drift += DRIFT_EVERY_S
                self._drift_check()
        for cand in self.segmenter.flush():
            self._on_line(cand)
        self._feed_done = True
        self.log.log("feed.done", t=self.clock.now())

        # drain: understanding → TTS → scheduler
        while self._tasks:
            await asyncio.gather(*list(self._tasks), return_exceptions=True)
        self._tts_event.set()
        if workers:
            await asyncio.gather(*workers, return_exceptions=True)
        self._sched_event.set()
        await scheduler
        self.finished_wall = time.monotonic()
        self._drift_check()
        self.store.bus.publish("session.metrics", **self.metrics_snapshot())
        self.store.checkpoint(self.out_dir / "record.json")
        self.log.log("session.end", t=self.clock.now(), **self.metrics_snapshot())
        self.store.bus.publish("session.ended")
        for pool in (self.asr_pool, self.spk_pool, self.tts_pool, self.misc_pool):
            pool.shutdown(wait=False)
        if self.lane is not None:
            self.lane.shutdown()
        self.log.close()
        return self.store.record

    # ------------------------------------------------------------------ enrollment
    async def _do_enroll(self, audio: F32) -> None:
        """Enrollment spans are prior knowledge (reference recordings of each commentator),
        so they are embedded before the live clock starts."""
        assert self.enroll is not None and self.models.speaker is not None
        loop = asyncio.get_running_loop()
        spk = self.models.speaker
        for es in self.enroll.speakers:
            embs = []
            for a, b in es.spans:
                seg = audio[int(a * self.sr) : int(b * self.sr)]
                embs.append(await loop.run_in_executor(self.spk_pool, spk.embed, seg, self.sr))
            sid = self.cluster.enroll(es.name, embs)
            self.store.upsert_speaker(
                Speaker(
                    speaker_id=sid,
                    display_name=es.name,
                    color=self.cluster.color(sid),
                    centroid_n=len(embs),
                    voice_id=self.voice_map.get(sid),
                )
            )
        self.log.log("enroll", speakers=[s.name for s in self.enroll.speakers])

    async def _enroll_known(self) -> None:
        """Known commentators (voice samples from the Voice Lab): their voice-prints are learned
        before the session starts, so they are recognised from their first line."""
        loop = asyncio.get_running_loop()
        spk = self.models.speaker
        assert spk is not None
        for name, clips in self.known_voices:
            embs = [await loop.run_in_executor(self.spk_pool, spk.embed, c, self.sr) for c in clips]
            sid = self.cluster.enroll(name, embs)
            self.store.upsert_speaker(
                Speaker(speaker_id=sid, display_name=name, color=self.cluster.color(sid),
                        centroid_n=len(embs), voice_id=self.voice_map.get(sid))
            )  # fmt: skip
        self.log.log("enroll", speakers=[n for n, _ in self.known_voices], source="known voices")

    # ---- speaker corrections (automatic merges and the viewer's manual fixes)
    def _apply_merge(self, old: str, new: str, manual: bool = False) -> None:
        for ln in self.store.record.lines:
            if ln.speaker_id == old:
                self.store.update_line(ln.line_id, speaker_id=new)
        self.store.record.speakers.pop(old, None)
        self.store.bus.publish("speaker.merged", **{"from": old, "into": new})
        self.log.log("speaker.merge", **{"from": old, "into": new, "manual": manual})

    def merge_speakers(self, drop: str, keep: str) -> bool:
        if not hasattr(self.cluster, "merge") or not self.cluster.merge(drop, keep):
            return False
        for old, new in self.cluster.drain_merges():
            self._apply_merge(old, new, manual=True)
        return True

    def rename_speaker(self, sid: str, name: str) -> None:
        sp = self.store.record.speakers.get(sid)
        if sp is None:
            return
        sp.display_name = name.strip()[:40] or sp.display_name
        if hasattr(self.cluster, "names"):
            self.cluster.names[sid] = sp.display_name
        self.store.bus.publish("speaker.updated", speaker_id=sid)

    # ------------------------------------------------------------------ segmentation
    def _on_line(self, cand: LineCandidate) -> None:
        self._n_lines += 1
        lid = line_id_for(self._n_lines)
        now = self.clock.now()
        line = Line(
            line_id=lid,
            t_start=round(cand.t_start, 3),
            t_end=round(cand.t_end, 3),
            close_reason=cand.close_reason,
            features={"loudness_db": round(cand.loudness_db, 2)},
        )
        line.times.created = round(now, 3)
        self.store.add_line(line)
        self._order.append(lid)
        self._status[lid] = "pending"
        self.log.log(
            "line.created",
            line_id=lid,
            t_start=line.t_start,
            t_end=line.t_end,
            reason=cand.close_reason,
            wait_ms=round((now - cand.t_end) * 1000, 1),
        )
        if self.stop_after == "segment":
            self._finish(lid, "skip")
            return
        self._work[lid] = _LineWork(cand)
        task = asyncio.create_task(self._understand(lid))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def _maybe_speaker_split(self) -> None:
        if not self.cfg.segment.speaker_split or self.models.speaker is None:
            return
        if self.stop_after == "segment" or self._split_busy:
            return
        span = self.segmenter.open_line()
        now = self.segmenter.now
        if span is None or now - span[0] < SPLIT_MIN_LINE_S:
            return
        if now - self._last_split_check < SPLIT_CHECK_EVERY_S:
            return
        self._last_split_check = now
        self._split_busy = True
        task = asyncio.create_task(self._speaker_split_check(span[0], now))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _speaker_split_check(self, line_start: float, now: float) -> None:
        """Soft speaker-change split (docs/04 §2). Incremental: each check embeds ONLY the newest
        1.5 s window (~0.12 s CPU) and compares it with the mean of this line's earlier,
        non-overlapping windows. (M7: embedding the whole line-so-far every second cost 30–60 %
        of the CPU during long lines and slowed ASR/TTS — measured, see BUILD_LOG.)"""
        try:
            assert self.models.speaker is not None
            loop = asyncio.get_running_loop()
            if self._split_line != line_start:
                self._split_line = line_start
                self._split_windows = []
            win_start = now - SPLIT_WINDOW_S
            recent = self.segmenter.recent_audio(win_start, now)
            if recent.size < int(1.0 * self.sr):
                return
            emb = await loop.run_in_executor(
                self.spk_pool, self.models.speaker.embed, recent, self.sr
            )
            earlier = [e for t_end, e in self._split_windows if t_end <= win_start + 0.25]
            self._split_windows.append((now, emb))
            if not earlier:
                return
            mean = np.mean(np.stack(earlier), axis=0)
            mean = mean / (np.linalg.norm(mean) + 1e-9)
            sim = float(np.dot(mean, emb))
            if sim >= self.cfg.segment.split_sim:
                return
            if self.cluster.centroids:
                b1, _ = self.cluster.best_match(mean.astype(np.float32))
                b2, s2 = self.cluster.best_match(emb)
                need = getattr(self.cluster, "t_assign", self.cfg.speaker.assign_sim)
                if b1 == b2 or s2 < need:  # the new voice must clearly be another known speaker
                    return
            span = self.segmenter.open_line()
            if span is None or abs(span[0] - line_start) > 1e-6:
                return  # the line already closed on its own
            cand = self.segmenter.force_split(win_start, now - 0.2)
            if cand is not None:
                self.log.log("speaker_split", at=cand.t_end, sim=round(sim, 3))
                self._split_line = None
                self._on_line(cand)
        finally:
            self._split_busy = False

    async def _heavy(self, lid: str, fn: Callable[[], T], pool: ThreadPoolExecutor) -> T:
        """Run a heavy model call: on the priority compute lane (oldest line first) when enabled,
        else on the stage's own pool."""
        if self.lane is not None:
            return await asyncio.wrap_future(self.lane.submit(int(lid[1:]), fn))
        return await asyncio.get_running_loop().run_in_executor(pool, fn)

    # ------------------------------------------------------------------ understanding
    def _asr_prompt(self, line: Line) -> str:
        prev = self.store.last_n(None, 2, before=line.t_start)
        words: list[str] = []
        for ln in prev:
            if ln.text:
                words.extend(ln.text.split())
        context = " ".join(words[-25:])
        names = ", ".join(self.glossary)
        return f"{names}. {context}".strip() if names else context

    async def _understand(self, lid: str) -> None:
        work = self._work[lid]
        cand = work.cand
        line = self.store.get(lid)
        a = int(cand.pad_before_s * self.sr)
        core = cand.audio[a : a + int((cand.t_end - cand.t_start) * self.sr)]
        if core.size == 0:
            core = cand.audio
        try:
            asr_t = asyncio.create_task(self._run_asr(lid, line, cand, core))
            spk_t = asyncio.create_task(self._run_speaker(lid, line, core))
            emo_t = asyncio.create_task(self._run_prosody(lid, core))
            await asyncio.gather(asr_t, spk_t, emo_t)
            self._label_emotion(lid)
            line = self.store.get(lid)
            if not line.text:
                self.store.update_line(lid, schedule_action="noise")
                self._finish(lid, "skip")
                return
            now = self.clock.now()
            self.store.update_line(lid, event="line.complete", **_t(complete=round(now, 3)))
            self.log.log(
                "line.complete",
                line_id=lid,
                text=line.text,
                speaker=line.speaker_id,
                emotion=line.emotion,
                wait_s=round(now - line.t_end, 3),
            )
            if self.stop_after == "understand":
                self._finish(lid, "skip")
                return
            self._tts_queue.append(lid)
            self._tts_event.set()
        except Exception as e:
            self._line_error(lid, "understand", e)
        finally:
            self._work.pop(lid, None)

    async def _run_asr(self, lid: str, line: Line, cand: LineCandidate, core: F32) -> None:
        asyncio.get_running_loop()
        t = time.monotonic()
        audio = cand.audio
        if self.captions_asr is not None:
            fn = partial(
                self.captions_asr.transcribe, core, self.sr, None, (line.t_start, line.t_end)
            )
            offset = line.t_start
        else:
            assert self.models.asr is not None
            # no context prompt for very short lines: Whisper tends to repeat the prompt there
            prompt = self._asr_prompt(line) if line.t_end - line.t_start >= 0.6 else None
            audio = cand.audio
            offset = line.t_start - cand.pad_before_s
            ctx_s = self.cfg.asr.context_s
            if ctx_s > 0 and line.t_start - cand.pad_before_s > 0.2:
                a0 = max(0.0, offset - ctx_s)
                before = self.segmenter.recent_audio(a0, offset)
                if before.size:
                    audio = np.concatenate([before, cand.audio]).astype(np.float32)
                    offset -= before.size / self.sr
                    names = ", ".join(self.glossary)
                    prompt = f"{names}." if names else None  # the audio itself is the context
            fn = partial(self.models.asr.transcribe, audio, self.sr, prompt)
        sent_s = audio.size / self.sr
        res: ASRResult = await self._heavy(lid, fn, self.asr_pool)
        if self.captions_asr is None and offset < line.t_start - cand.pad_before_s - 0.05:
            res = keep_own_words(res, line.t_start - offset)
        res, guard_actions = asr_guard(res, sent_s)  # word times are relative to the sent audio
        if guard_actions:
            self.log.log("asr_guard", line_id=lid, actions=guard_actions)
        ms = (time.monotonic() - t) * 1000
        text = res.text.strip()
        noise = res.no_speech_prob > NOISE_NO_SPEECH and (len(text) < 2 or res.avg_logprob < -1.0)
        if noise:
            text = ""
        words = [
            (w.word, round(offset + w.start, 3), round(offset + w.end, 3), round(w.prob, 3))
            for w in res.words
        ]
        self._work[lid].asr = res
        line_now = self.store.get(lid)
        self.store.update_line(lid, features={**line_now.features, "asr_by": res.source or "local"})
        self.store.update_line(
            lid,
            event="line.asr_done",
            text=text,
            words=words,
            asr_conf=round(float(np.exp(res.avg_logprob)), 3),
            **_t(asr_done=round(self.clock.now(), 3)),
        )
        self.log.log(
            "stage",
            line_id=lid,
            stage="asr",
            duration_ms=round(ms, 1),
            no_speech=round(res.no_speech_prob, 3),
            noise=noise,
        )

    async def _run_speaker(self, lid: str, line: Line, core: F32) -> None:
        loop = asyncio.get_running_loop()
        if self.models.speaker is None:
            self.store.update_line(
                lid,
                event="line.speaker_done",
                speaker_id="S1",
                speaker_conf="low",
                **_t(speaker_done=round(self.clock.now(), 3)),
            )
            return
        t = time.monotonic()
        emb = await loop.run_in_executor(self.spk_pool, self.models.speaker.embed, core, self.sr)
        ms = (time.monotonic() - t) * 1000
        prev = self.store.previous(line)
        dur = line.t_end - line.t_start
        self.line_embeddings[lid] = emb
        if isinstance(self.cluster, SpeakerTracker):
            from engine.providers.free.emotion_prosody import loudest_window_db

            loud = loudest_window_db(core, self.sr) if core.size else None
            res = self.cluster.assign(emb, dur, prev.speaker_id if prev else None, lid, loud)
        else:
            res = self.cluster.assign(emb, dur, prev.speaker_id if prev else None)
        if res.is_new:
            self.store.upsert_speaker(
                Speaker(
                    speaker_id=res.speaker_id,
                    display_name=self.cluster.names[res.speaker_id],
                    color=self.cluster.color(res.speaker_id),
                    centroid_n=1,
                    voice_id=self.voice_map.get(res.speaker_id),
                )
            )
        else:
            sp = self.store.record.speakers.get(res.speaker_id)
            if sp is not None:
                sp.centroid_n = self.cluster.counts.get(res.speaker_id, sp.centroid_n)
        if hasattr(self.cluster, "drain_merges"):
            for old, new in self.cluster.drain_merges():
                self._apply_merge(old, new)
        self.store.update_line(
            lid,
            event="line.speaker_done",
            speaker_id=res.speaker_id,
            speaker_sim=round(res.similarity, 3),
            speaker_conf=res.confidence,
            **_t(speaker_done=round(self.clock.now(), 3)),
        )
        sims = {k: round(v, 3) for k, v in res.sims.items()}
        self.log.log(
            "stage",
            line_id=lid,
            stage="speaker",
            duration_ms=round(ms, 1),
            speaker=res.speaker_id,
            sims=sims,
        )

    async def _run_prosody(self, lid: str, core: F32) -> None:
        loop = asyncio.get_running_loop()
        t = time.monotonic()
        feats = await loop.run_in_executor(
            self.misc_pool, self.emotion.audio_features, core, self.sr
        )
        self._work[lid].features = feats
        self.log.log(
            "stage",
            line_id=lid,
            stage="prosody",
            duration_ms=round((time.monotonic() - t) * 1000, 1),
        )

    def _label_emotion(self, lid: str) -> None:
        line = self.store.get(lid)
        work = self._work[lid]
        words = [Word(word=w, start=a, end=b, prob=p) for w, a, b, p in line.words]
        ctx = EmotionContext(
            features=work.features or {},
            text=line.text or "",
            words=words,
            speaker_id=line.speaker_id,
            t_start=line.t_start,
            t_end=line.t_end,
        )
        res = self.emotion.analyze(ctx)
        feats = {k: round(float(v), 3) for k, v in res.features.items()}
        self.store.update_line(
            lid,
            event="line.emotion_done",
            emotion=res.label,
            arousal=round(res.arousal, 3),
            features={**line.features, **feats},
            **_t(emotion_done=round(self.clock.now(), 3)),
        )

    # ------------------------------------------------------------------ TTS
    async def _tts_worker(self, idx: int) -> None:
        asyncio.get_running_loop()
        assert self.models.tts is not None
        tts = self.models.tts
        while True:
            if not self._tts_queue:
                if self._feed_done and not self._tasks and self._tts_busy == 0:
                    self._tts_event.set()  # wake siblings so they can exit too
                    return
                self._tts_event.clear()
                await self._tts_event.wait()
                continue
            lid = self._tts_queue.popleft()
            line = self.store.get(lid)
            lag_now = self.clock.now() - line.t_end - self.view_delay
            if self.view_delay <= 0 and should_drop(
                lag_now, line.emotion, line.t_end - line.t_start, self.cfg.schedule
            ):
                self.store.update_line(lid, schedule_action="dropped")
                self.log.log("schedule", line_id=lid, action="dropped", lag=round(lag_now, 2))
                self._finish(lid, "skip")
                continue
            text, merged = line.text or "", list[str]()
            if lag_now > self.cfg.schedule.lag_hard_s:
                text, merged = self._merge_following(line)
            self._tts_busy += 1
            try:
                voice = self.voice_map.get(line.speaker_id or "S1") or self.cfg.tts.voice_map.get(
                    "S1", "am_adam"
                )
                entry = self.catalog.get(voice)
                style = style_for(
                    line.emotion or Emotion.neutral,
                    line.arousal,
                    self.cfg.emotion.thresholds,
                    base_speed=entry.base_speed,
                    pitch_shift=self.cfg.style.pitch_shift,
                )
                style = self._fit_style(self.store.get(lid), text, voice, style, entry)
                start = self.clock.now()
                self.store.update_line(lid, voice_id=voice, **_t(tts_start=round(start, 3)))
                t = time.monotonic()
                if self.cfg.tts.streaming and hasattr(tts, "stream"):
                    await self._tts_streamed(lid, tts, text, voice, style, idx, merged)
                    continue
                out = await self._heavy(
                    lid,
                    partial(
                        synthesize_line,
                        tts,
                        self.tts_cache,
                        self.tts_dir,
                        lid,
                        text,
                        voice,
                        style,
                        self.glossary,
                    ),
                    self.tts_pool,
                )
                ms = (time.monotonic() - t) * 1000
                self._learn_rate(voice, text, out.duration, style, entry)
                ready = self.clock.now()
                self.store.update_line(
                    lid,
                    event="tts.ready",
                    tts_path=str(out.path),
                    tts_duration=round(out.duration, 3),
                    **_t(tts_ready=round(ready, 3)),
                )
                self.log.log(
                    "stage",
                    line_id=lid,
                    stage="tts",
                    duration_ms=round(ms, 1),
                    voice=voice,
                    speed=style.speed,
                    chars=len(out.text),
                    audio_s=round(out.duration, 3),
                    worker=idx,
                )
                if merged:
                    self.store.update_line(lid, schedule_action="merged")
                self._finish(lid, "ready")
            except Exception as e:
                self._line_error(lid, "tts", e)
            finally:
                self._tts_busy -= 1

    async def _tts_streamed(
        self,
        lid: str,
        tts: Any,
        raw_text: str,
        voice: str,
        style: Any,
        idx: int,
        merged: list[str],
    ) -> None:
        """Streaming TTS: the line becomes playable on its FIRST audio chunk (the player streams the
        growing file); the final trimmed file replaces it when the stream ends."""
        loop = asyncio.get_running_loop()
        # catch-up for streams (they cannot be time-stretched): if voices are queued up behind
        # each other, ask the provider to speak this line faster (up to max_speedup).
        if not self.cfg.schedule.fit_duration:  # legacy catch-up (V2) when fitting is off
            backlog = 0.0
            if self._prev_play is not None:
                backlog = max(0.0, self._prev_play.play_end - self.clock.now())
            if backlog > STREAM_BACKLOG_S:
                factor = min(self.cfg.schedule.max_speedup + 0.1, 1.0 + 0.06 * backlog)
                style = style.model_copy(update={"speed": round(style.speed * factor, 3)})
                self.store.update_line(lid, schedule_action="speedup")
        text = prepare_text(raw_text, style, self.glossary)
        first_evt = asyncio.Event()
        t0 = time.monotonic()
        fut = loop.run_in_executor(
            self.tts_pool,
            partial(stream_line, tts.stream, 24000, self.tts_dir, lid, text, voice, style,
                    lambda: loop.call_soon_threadsafe(first_evt.set)),
        )  # fmt: skip
        waiter: asyncio.Future[Any] = asyncio.ensure_future(first_evt.wait())
        pending: set[asyncio.Future[Any]] = {fut, waiter}
        await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        streamed = first_evt.is_set()
        if streamed and self.view_delay > 0:
            # synced: if the whole file will be ready before the viewer reaches this line, play the
            # complete file (gapless, exact length) instead of the growing stream
            line0 = self.store.get(lid)
            if self.clock.now() + 2.0 < line0.t_start + self.view_delay:
                streamed = False
        if streamed:
            first_t = self.clock.now()
            est = estimate_duration(text, style.speed)
            part_path = self.tts_dir / f"{lid}_{voice}_{style_hash(text, style)}.part.wav"
            self.store.update_line(
                lid, event="tts.first", tts_duration=round(est, 3),
                tts_path=str(part_path), **_t(tts_first=round(first_t, 3)),
            )  # fmt: skip
            self._finish(lid, "ready")  # schedulable now: the player streams the growing file
        waiter.cancel()
        _part, final, duration = await fut
        entry = self.catalog.get(voice)
        self._learn_rate(voice, text, duration, style, entry)
        ready = self.clock.now()
        line = self.store.get(lid)
        fields: dict[str, Any] = {"tts_duration": round(duration, 3), "tts_path": str(final)}
        stall = None
        if line.times.play_at is not None:
            stall = (ready - duration) - line.times.play_at
            if stall > 0:
                fields["features"] = {**line.features, "stream_stall_s": round(stall, 3)}
            if self._prev_line == lid and self._prev_play is not None:
                self._prev_play = PrevPlayback(
                    line.speaker_id, line.times.play_at + duration, line.t_end + self.view_delay
                )
        self.store.update_line(lid, event="tts.ready", **fields, **_t(tts_ready=round(ready, 3)))
        first_ms = 1e3 * ((line.times.tts_first or ready) - (line.times.tts_start or ready))
        self.log.log(
            "stage", line_id=lid, stage="tts", streamed=streamed, voice=voice,
            first_ms=round(first_ms),
            duration_ms=round((time.monotonic() - t0) * 1000, 1), audio_s=round(duration, 3),
            stall_s=None if stall is None else round(stall, 3), worker=idx,
        )  # fmt: skip
        if merged:
            self.store.update_line(lid, schedule_action="merged")
        if not streamed:
            self._finish(lid, "ready")

    @property
    def view_delay(self) -> float:
        """Synced viewing: the viewer's picture runs this far behind live (0 = live mode)."""
        return float(self.cfg.schedule.broadcast_delay_s)

    def _fit_style(self, line: Line, text: str, voice: str, style: Any, entry: Any) -> Any:
        """V3 duration fit: ask the voice to speak at the pace that fits the ORIGINAL line's length
        (learned per voice from earlier lines), so voices never queue up behind each other — no
        rushing later, no dropped lines. In live mode a queue that still forms is absorbed too."""
        sc = self.cfg.schedule
        if not sc.fit_duration or not text:
            return style
        slot = max(0.6, line.t_end - line.t_start)
        merged_slot = line.features.get("merged_slot_s")
        if merged_slot:
            slot = float(merged_slot)
        backlog = 0.0
        if self._prev_play is not None:
            backlog = max(0.0, self._prev_play.play_end - max(self.clock.now(), line.t_start
                                                                  + self.view_delay))  # fmt: skip
        target = max(slot * 0.75, slot - 0.5 * backlog)
        rate = self._rate.get(voice, 0.062)  # ≈ 2.9 words/s until measured
        natural = rate * len(text)
        base = entry.base_speed or 1.0
        emotion_eff = style.speed / base
        needed = natural / target
        eff = min(sc.max_fit_speed, max(emotion_eff, needed))
        if eff <= emotion_eff + 1e-3:
            return style
        self.store.update_line(line.line_id, schedule_action="fit")
        self.log.log(
            "schedule", line_id=line.line_id, action="fit", slot=round(slot, 2),
            natural=round(natural, 2), speed=round(eff, 3), backlog=round(backlog, 2),
        )  # fmt: skip
        return style.model_copy(update={"speed": round(base * eff, 3)})

    def _learn_rate(self, voice: str, text: str, duration: float, style: Any, entry: Any) -> None:
        if not text or duration <= 0.3:
            return
        eff = style.speed / (entry.base_speed or 1.0)
        sample = duration * eff / max(1, len(text))
        old = self._rate.get(voice)
        self._rate[voice] = sample if old is None else 0.7 * old + 0.3 * sample

    def _merge_following(self, line: Line) -> tuple[str, list[str]]:
        """Catch-up: merge queued consecutive lines of the same speaker into one synth call."""
        texts = [line.text or ""]
        merged: list[str] = []
        idx = self._order.index(line.line_id)
        while self._tts_queue and len(merged) < 3:
            nxt = self._tts_queue[0]
            if (
                idx + 1 + len(merged) >= len(self._order)
                or self._order[idx + 1 + len(merged)] != nxt
            ):
                break
            other = self.store.get(nxt)
            if other.speaker_id != line.speaker_id:
                break
            self._tts_queue.popleft()
            line.features["merged_slot_s"] = round(other.t_end - line.t_start, 3)
            texts.append(other.text or "")
            merged.append(nxt)
            self.store.update_line(nxt, schedule_action="merged", voice_id=None)
            self._finish(nxt, "skip")
        if merged:
            self.log.log("schedule", line_id=line.line_id, action="merged", lines=merged)
        return " ".join(t for t in texts if t), merged

    # ------------------------------------------------------------------ scheduler
    def _finish(self, lid: str, status: str) -> None:
        self._status[lid] = status
        self._sched_event.set()

    def _line_error(self, lid: str, stage: str, e: BaseException) -> None:
        msg = f"{stage}: {type(e).__name__}: {e}"
        self.store.update_line(lid, error=msg)
        self.store.warn(f"line {lid} {msg}")
        self.log.log("error", line_id=lid, stage=stage, error=msg)
        self._finish(lid, "skip")

    async def _scheduler(self) -> None:
        loop = asyncio.get_running_loop()
        head = 0
        while True:
            while head < len(self._order) and self._status[self._order[head]] != "pending":
                lid = self._order[head]
                head += 1
                if self._status[lid] == "ready":
                    try:
                        await self._schedule_line(lid, loop)
                    except Exception as e:
                        self.store.update_line(lid, error=f"schedule: {type(e).__name__}: {e}")
                        self.store.warn(f"line {lid} schedule failed: {e}")
            done = self._feed_done and not self._tasks and head >= len(self._order)
            if done and not self._tts_queue and self._tts_busy == 0:
                return
            self._sched_event.clear()
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._sched_event.wait(), timeout=0.5)

    async def _schedule_line(self, lid: str, loop: asyncio.AbstractEventLoop) -> None:
        line = self.store.get(lid)
        streaming = line.times.tts_first is not None and line.times.tts_ready is None
        ready_at = (
            line.times.tts_first + STREAM_MARGIN_S if streaming and line.times.tts_first else
            line.times.tts_ready
        )  # fmt: skip
        if line.tts_duration is None or ready_at is None:
            return
        d = self.view_delay  # synced: the viewer reaches media time t at session time t + d
        plan = plan_playback(
            tts_ready=ready_at,
            t_start=line.t_start + d,
            t_end=line.t_end + d,
            speaker_id=line.speaker_id,
            duration=line.tts_duration,
            prev=self._prev_play,
            cfg=self.cfg.schedule,
        )
        if (
            d <= 0
            and line.schedule_action != "merged"
            and should_drop(plan.lag, line.emotion, line.t_end - line.t_start, self.cfg.schedule)
        ):
            self.store.update_line(lid, schedule_action="dropped")
            self.log.log("schedule", line_id=lid, action="dropped", lag=round(plan.lag, 2))
            return
        duration = line.tts_duration
        if line.schedule_action in ("merged", "speedup", "fit"):
            action = line.schedule_action
        else:
            action = plan.action
        if plan.speedup > 1.0 and line.tts_path and not streaming:
            new_path, duration = await loop.run_in_executor(
                self.misc_pool, stretch_file, Path(line.tts_path), plan.speedup
            )
            self.store.update_line(lid, tts_path=str(new_path), tts_duration=round(duration, 3))
            if action == "none":
                action = "speedup"
        play_at = plan.play_at
        self.store.update_line(
            lid,
            event="line.scheduled",
            schedule_action=action,
            **_t(play_at=round(play_at, 3)),
        )
        self._prev_play = PrevPlayback(line.speaker_id, play_at + duration, line.t_end + d)
        self._prev_line = lid
        self.log.log(
            "schedule",
            line_id=lid,
            action=action,
            play_at=round(play_at, 3),
            lag=round(plan.lag, 3),
            speedup=plan.speedup,
        )

    def _drift_check(self) -> None:
        malloc_trim()
        lines = [ln for ln in self.store.record.lines if ln.delay_ready is not None]
        slope = drift_slope([ln.t_end for ln in lines], [ln.delay_ready or 0.0 for ln in lines])
        self.log.log("drift", slope=round(slope, 4), n=len(lines))
        if drift_warning(slope) and len(lines) >= 10:
            self.store.warn(f"delay drift {slope:.3f} s/s at t={self.clock.now():.0f} s")


def keep_own_words(res: ASRResult, line_start: float, slack: float = 0.08) -> ASRResult:
    """Context ASR: drop the words that belong to the audio BEFORE the line (word midpoint before
    `line_start` − slack, both relative to the audio sent). Punctuation is kept from the text when
    its tokens line up with the timed words; without word timings the result is unchanged."""
    words = list(res.words)
    if not words:
        return res
    keep = [i for i, w in enumerate(words) if (w.start + w.end) / 2 >= line_start - slack]
    if len(keep) == len(words):
        return res
    tokens = res.text.split()
    if len(tokens) == len(words):
        text = " ".join(tokens[i] for i in keep)
    else:
        text = " ".join(words[i].word.strip() for i in keep)
        if text and res.text.rstrip()[-1:] in ".!?" and text[-1] not in ".!?":
            text += res.text.rstrip()[-1]
    if text:
        text = text[0].upper() + text[1:]
    kept = [words[i] for i in keep]
    return res.model_copy(update={"text": text, "words": kept})


def malloc_trim() -> None:
    """Return freed native memory to the OS (glibc only). Whisper/torch/Kokoro allocate buffers of a
    different size for every line; without trimming, RSS keeps the high-water mark (M10)."""
    import ctypes
    import sys

    if sys.platform.startswith("linux"):
        with contextlib.suppress(OSError, AttributeError):
            ctypes.CDLL("libc.so.6").malloc_trim(0)


def _make_vad() -> Any:
    from engine.segment.vad import StreamingVAD

    return StreamingVAD()
