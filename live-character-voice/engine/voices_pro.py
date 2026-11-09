"""Professional voice cloning: build an emotion-aware voice from a longer recording (1–10 min).

Instant cloning uses one 15 s clip. Professional cloning works through the whole recording:
  1. find every stretch of speech (Silero VAD) and cut it into utterances of 2.5–12 s
  2. keep only the main speaker (ECAPA voice prints; other voices, crowd or music are dropped)
  3. score each utterance (signal-to-noise, clipping, how typical of the speaker it is)
  4. sort utterances by energy into calm / neutral / excited (loudness + pitch, like the live
     emotion detector) and pick the best ~12 s for each mood
  5. export them with ONE shared gain (so excited stays louder than calm) and transcribe each
  6. test: speak a sentence in each mood and measure how close it is to the real voice
  7. if the Fish account allows trained voice models (paid API credit), also train one
Live lines use the steady neutral references for identity (measured best in every mood) and
Fish's emotion tags for the mood; the calm/excited clips are kept for listening and testing.
Stored in data/voices/custom/<slug>/ (git-ignored).
"""

from __future__ import annotations

import json
import subprocess
import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from engine.audio import frame_db, rms_db
from engine.ingest.decode import decode_audio
from engine.voices_custom import (
    PREFIX,
    VoiceUploadError,
    slugify,
)

SR = 16000
MIN_PRO_S, MAX_PRO_S = 45.0, 15 * 60.0
UTT_MIN_S, UTT_MAX_S = 2.5, 12.0
TARGET_REF_S, MAX_REF_S = 12.0, 15.0  # per mood (15 s single reference measured best)
SAME_SPEAKER = 0.45  # ECAPA cosine: same person usually 0.5–0.8, other people < 0.3
MOODS = ("calm", "neutral", "excited")
TEST_LINES = {
    "calm": "Welcome back, everyone. It is a quiet start here, both sides still settling in.",
    "neutral": "He plays it wide to the left, and they build patiently from the back.",
    "excited": "Oh what a strike! That is absolutely sensational, the crowd is on its feet!",
}
STEPS = [
    ("read", "Reading the recording"),
    ("speech", "Finding speech"),
    ("speaker", "Keeping only the main voice"),
    ("moods", "Sorting calm, neutral and excited delivery"),
    ("build", "Building and transcribing references"),
    ("test", "Quality test in every mood"),
    ("train", "Trying a trained Fish voice model"),
]


@dataclass
class Utterance:
    start: float
    end: float
    snr_db: float = 0.0
    clip_frac: float = 0.0
    sim: float = 0.0
    loud_db: float = 0.0
    pitch: float = 0.0
    arousal: float = 0.0
    mood: str = "neutral"
    emb: Any = None

    @property
    def dur(self) -> float:
        return self.end - self.start

    @property
    def quality(self) -> float:
        snr = float(np.clip(self.snr_db / 30.0, 0.0, 1.0))
        return (
            0.45 * snr
            + 0.45 * float(np.clip(self.sim, 0.0, 1.0))
            - 5.0 * self.clip_frac
            + (0.1 if 3.0 <= self.dur <= 10.0 else 0.0)
        )


# ---- jobs (cloning takes 30–120 s, so it runs in the background with progress) ----------------
@dataclass
class Job:
    job_id: str
    name: str
    stage: str = "queued"
    progress: float = 0.0
    log: list[str] = field(default_factory=list)
    error: str | None = None
    result: dict[str, Any] | None = None
    started: float = field(default_factory=time.time)

    def public(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "name": self.name,
            "stage": self.stage,
            "progress": round(self.progress, 3),
            "steps": [{"key": k, "label": lbl} for k, lbl in STEPS],
            "log": self.log[-30:],
            "error": self.error,
            "result": self.result,
            "elapsed_s": round(time.time() - self.started, 1),
        }


JOBS: dict[str, Job] = {}
# called with the voice id after a voice is built (the server saves it to the voice library)
ON_SAVED: list[Callable[[str], None]] = []


def start_job(name: str, source: Path, consent: bool, models: Any) -> Job:
    if not consent:
        raise VoiceUploadError(
            "Confirm that you own this voice or have permission to clone it. "
            "Voices of real people or known characters need their consent or a licence."
        )
    if not name.strip():
        raise VoiceUploadError("Give the voice a name.")
    if models is None or models.asr is None or models.speaker is None:
        raise VoiceUploadError("The models are still loading — try again in a moment.")
    job = Job(job_id=uuid.uuid4().hex[:10], name=name.strip()[:40])
    JOBS[job.job_id] = job

    def run() -> None:
        try:
            job.result = build_pro_voice(job.name, source, models, job_progress(job))
            for cb in ON_SAVED:
                try:
                    cb(str(job.result["voice_id"]))
                except Exception as e:  # the voice works here; say it isn't saved permanently
                    job.log.append(f"not saved to the voice library: {type(e).__name__}: {e}")
            job.stage, job.progress = "done", 1.0
        except VoiceUploadError as e:
            job.stage, job.error = "error", str(e)
        except Exception as e:  # report, never crash the server
            job.stage, job.error = "error", f"{type(e).__name__}: {e}"
        finally:
            source.unlink(missing_ok=True)

    threading.Thread(target=run, name=f"pro-clone-{job.job_id}", daemon=True).start()
    return job


def job_progress(job: Job) -> Callable[[str, float, str], None]:
    def report(stage: str, frac: float, msg: str) -> None:
        job.stage = stage
        idx = [k for k, _ in STEPS].index(stage) if stage in dict(STEPS) else 0
        job.progress = min(0.99, (idx + max(0.0, min(1.0, frac))) / len(STEPS))
        if msg:
            job.log.append(msg)

    return report


# ---- analysis ---------------------------------------------------------------------------------
def speech_utterances(audio: np.ndarray) -> list[Utterance]:
    """Silero VAD speech regions, merged across short pauses and cut to 2.5–12 s utterances."""
    import torch
    from silero_vad import get_speech_timestamps, load_silero_vad

    model = load_silero_vad(onnx=True)
    ts = get_speech_timestamps(
        torch.from_numpy(audio), model, sampling_rate=SR, min_silence_duration_ms=250,
        speech_pad_ms=60, threshold=0.5,
    )  # fmt: skip
    regions = [(t["start"] / SR, t["end"] / SR) for t in ts]
    out: list[Utterance] = []
    cur: list[float] | None = None
    for s, e in regions:
        if cur and s - cur[1] < 0.35 and e - cur[0] <= UTT_MAX_S:
            cur[1] = e
            continue
        if cur:
            out.append(Utterance(cur[0], cur[1]))
        cur = [s, e]
    if cur:
        out.append(Utterance(cur[0], cur[1]))
    final: list[Utterance] = []
    for u in out:  # long regions → equal pieces under the max
        n = int(np.ceil(u.dur / UTT_MAX_S))
        step = u.dur / n
        for i in range(n):
            final.append(Utterance(u.start + i * step, u.start + (i + 1) * step))
    return [u for u in final if u.dur >= UTT_MIN_S]


def noise_floor_db(audio: np.ndarray, utts: list[Utterance]) -> float:
    mask = np.ones(audio.size, dtype=bool)
    for u in utts:
        mask[int(u.start * SR) : int(u.end * SR)] = False
    rest = audio[mask]
    if rest.size < SR // 2:
        lv = frame_db(audio, SR // 20)
        return float(np.percentile(lv, 5))
    lv = frame_db(rest, SR // 20)
    return float(np.percentile(lv, 50))


def keep_main_speaker(utts: list[Utterance], speaker: Any, audio: np.ndarray) -> np.ndarray:
    """Embed every utterance, find the dominant voice (medoid of the largest similar group,
    weighted by duration) and set `sim` to each utterance's similarity with it."""
    for u in utts:
        u.emb = np.asarray(speaker.embed(audio[int(u.start * SR) : int(u.end * SR)], SR))
        u.emb = u.emb / (np.linalg.norm(u.emb) + 1e-9)
    e = np.stack([u.emb for u in utts])
    w = np.array([u.dur for u in utts])
    sims = e @ e.T
    support = ((sims > SAME_SPEAKER) * w[None, :]).sum(axis=1)
    medoid = int(np.argmax(support))
    group = sims[medoid] > SAME_SPEAKER
    centroid = (e[group] * w[group, None]).sum(axis=0)
    centroid = centroid / (np.linalg.norm(centroid) + 1e-9)
    for u in utts:
        u.sim = float(u.emb @ centroid)
    return np.asarray(centroid)


def sort_moods(utts: list[Utterance], audio: np.ndarray) -> None:
    """Arousal = 0.6·z(loudness) + 0.4·z(pitch), robust z within this speaker (the live emotion
    detector uses the same two cues). Lowest quarter → calm, top quarter → excited."""
    from engine.providers.free.emotion_prosody import ProsodyEmotion

    feat = ProsodyEmotion()
    for u in utts:
        f = feat.audio_features(audio[int(u.start * SR) : int(u.end * SR)], SR)
        u.loud_db = f["loudness_db"]
        u.pitch = f.get("pitch_hz_p75", float("nan"))

    def z(xs: np.ndarray, floor: float) -> np.ndarray:
        ok = np.isfinite(xs)
        if ok.sum() < 3:
            return np.zeros_like(xs)
        med = np.median(xs[ok])
        mad = max(1.4826 * float(np.median(np.abs(xs[ok] - med))), floor)
        return np.where(ok, (xs - med) / mad, 0.0)

    # floors as in the live detector: 1.5 dB loudness, 10 Hz pitch → small wobbles stay neutral
    ar = 0.6 * z(np.array([u.loud_db for u in utts]), 1.5) + 0.4 * z(
        np.array([u.pitch for u in utts]), 10.0
    )
    for u, a in zip(utts, ar, strict=True):
        u.arousal = float(a)
        u.mood = "calm" if a <= -0.7 else "excited" if a >= 0.7 else "neutral"


def pick(utts: list[Utterance], mood: str) -> list[Utterance]:
    pool = sorted((u for u in utts if u.mood == mood), key=lambda u: -u.quality)
    chosen: list[Utterance] = []
    total = 0.0
    for u in pool:
        if total >= TARGET_REF_S or len(chosen) >= 3:
            break
        if total + u.dur > MAX_REF_S:
            continue
        chosen.append(u)
        total += u.dur
    return sorted(chosen, key=lambda u: u.start)


# ---- build ------------------------------------------------------------------------------------
def build_pro_voice(
    name: str, source: Path, models: Any, report: Callable[[str, float, str], None]
) -> dict[str, Any]:
    from engine.voices_custom import CUSTOM_DIR

    report("read", 0.0, "Reading the recording…")
    try:
        audio = decode_audio(source, SR)
    except Exception as e:
        raise VoiceUploadError(f"Could not read the file: {e}") from e
    seconds = audio.size / SR
    if seconds < MIN_PRO_S:
        raise VoiceUploadError(
            f"Professional cloning needs at least {MIN_PRO_S:.0f} s (this is {seconds:.0f} s). "
            "Use Instant cloning for short samples."
        )
    if seconds > MAX_PRO_S:
        audio = audio[: int(MAX_PRO_S * SR)]
        report("read", 1.0, f"Using the first {MAX_PRO_S / 60:.0f} minutes.")
    report("read", 1.0, f"{seconds:.0f} s of audio.")

    report("speech", 0.0, "Detecting speech…")
    utts = speech_utterances(audio)
    speech_s = sum(u.dur for u in utts)
    if speech_s < 20:
        raise VoiceUploadError(f"Only {speech_s:.0f} s of clear speech found; need at least 20 s.")
    noise = noise_floor_db(audio, utts)
    for u in utts:
        seg = audio[int(u.start * SR) : int(u.end * SR)]
        u.snr_db = rms_db(seg) - noise
        u.clip_frac = float(np.mean(np.abs(seg) > 0.98))
    report("speech", 1.0, f"{len(utts)} utterances, {speech_s:.0f} s of speech.")

    report("speaker", 0.0, "Comparing voice prints…")
    keep_main_speaker(utts, models.speaker, audio)
    main = [u for u in utts if u.sim >= SAME_SPEAKER and u.snr_db > 3 and u.clip_frac < 0.01]
    dropped = len(utts) - len(main)
    main_s = sum(u.dur for u in main)
    if main_s < 20:
        raise VoiceUploadError(
            f"Only {main_s:.0f} s belongs clearly to one speaker. Use a recording with one person "
            "talking, without music or other voices."
        )
    report(
        "speaker", 1.0,
        f"Main voice: {main_s:.0f} s kept; {dropped} parts dropped (other voices, noise, music).",
    )  # fmt: skip

    report("moods", 0.0, "Measuring loudness and pitch…")
    sort_moods(main, audio)
    counts = {m: sum(u.mood == m for u in main) for m in MOODS}
    report("moods", 1.0, f"calm {counts['calm']}, neutral {counts['neutral']}, "
                         f"excited {counts['excited']} utterances.")  # fmt: skip

    slug = slugify(name)
    voice_id = PREFIX + slug
    d = CUSTOM_DIR / slug
    if d.exists():
        for f in d.iterdir():
            f.unlink()
    d.mkdir(parents=True, exist_ok=True)
    chosen = {m: pick(main, m) for m in MOODS}
    if not chosen["neutral"]:
        chosen["neutral"] = pick([*main], "calm") or pick([*main], "excited")
    # one shared gain for all moods, from the neutral set → calm stays soft, excited stays loud
    ref_db = float(np.mean([u.loud_db for u in chosen["neutral"]]))
    gain_db = float(np.clip(-16.0 - ref_db, -20.0, 20.0))
    refs: dict[str, list[dict[str, Any]]] = {}
    n_total = sum(len(v) for v in chosen.values())
    done = 0
    for mood in MOODS:
        refs[mood] = []
        for i, u in enumerate(chosen[mood]):
            out = d / f"{mood}_{i}.mp3"
            # light FFT noise reduction for noisy sources (crowd, room); clean audio untouched
            denoise = "afftdn=nr=10:nf=-30," if u.snr_db < 15 else ""
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-ss", f"{u.start:.2f}", "-t", f"{u.dur:.2f}",
                 "-i", str(source), "-vn", "-ac", "1", "-ar", "24000",
                 "-af", f"highpass=f=60,{denoise}volume={gain_db:.1f}dB,alimiter=limit=0.9",
                 "-c:a", "libmp3lame", "-b:a", "64k", str(out)],
                check=True,
            )  # fmt: skip
            text = models.asr.transcribe(decode_audio(out, SR), SR).text.strip()
            refs[mood].append(
                {"file": out.name, "text": text, "seconds": round(u.dur, 1),
                 "source_start_s": round(u.start, 1), "snr_db": round(u.snr_db, 1),
                 "similarity": round(u.sim, 3), "arousal": round(u.arousal, 2)}
            )  # fmt: skip
            done += 1
            report("build", done / max(1, n_total), f"{mood}: “{text[:70]}”")
    # neutral reference doubles as the instant-style single reference
    first = refs["neutral"][0]
    (d / "ref.mp3").write_bytes((d / first["file"]).read_bytes())

    meta: dict[str, Any] = {
        "voice_id": voice_id,
        "name": name,
        "tier": "pro",
        "transcript": first["text"],
        "seconds": round(sum(r["seconds"] for rs in refs.values() for r in rs), 1),
        "source_seconds": round(seconds, 1),
        "speech_seconds": round(speech_s, 1),
        "main_speaker_seconds": round(main_s, 1),
        "dropped_parts": dropped,
        "refs": refs,
        "consent": True,
        "created": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    (d / "meta.json").write_text(json.dumps(meta, indent=2))

    meta["quality"] = quality_test(voice_id, models, report, d)
    meta["fish_model"] = try_train_fish_model(name, d, refs, report)
    (d / "meta.json").write_text(json.dumps(meta, indent=2))
    return meta


def quality_test(
    voice_id: str, models: Any, report: Callable[[str, float, str], None], d: Path
) -> dict[str, Any]:
    """Speak one sentence per mood and compare it (ECAPA) with the speaker's own references."""
    from engine.audio import resample
    from engine.providers.base import DeliveryStyle
    from engine.record.models import Emotion

    tts = models.tts
    if tts is None or not getattr(tts, "supports_cloning", False):
        report("test", 1.0, "Skipped: voice cloning needs a Fish Audio key.")
        return {"tested": False, "reason": "no cloning engine"}
    real = []
    for f in sorted(d.glob("*_*.mp3")):
        x = decode_audio(f, SR)
        v = np.asarray(models.speaker.embed(x, SR))
        real.append(v / (np.linalg.norm(v) + 1e-9))
    centroid = np.mean(real, axis=0)
    centroid /= np.linalg.norm(centroid) + 1e-9
    out: dict[str, Any] = {"tested": True, "moods": {}}
    for i, mood in enumerate(MOODS):
        t = time.monotonic()
        style = DeliveryStyle(emotion=Emotion(mood))
        res = tts.synthesize(TEST_LINES[mood], voice_id, style)
        x = resample(res.audio, res.sr, SR)
        v = np.asarray(models.speaker.embed(x, SR))
        sim = float((v / (np.linalg.norm(v) + 1e-9)) @ centroid)
        import soundfile as sf

        sf.write(d / f"test_{mood}.wav", res.audio, res.sr)
        out["moods"][mood] = {
            "similarity": round(sim, 3),
            "seconds": round(res.duration_s, 2),
            "loudness_db": round(rms_db(res.audio), 1),
            "made_in_s": round(time.monotonic() - t, 2),
        }
        report("test", (i + 1) / len(MOODS), f"{mood}: similarity {sim:.2f}")
    sims = [m["similarity"] for m in out["moods"].values()]
    out["similarity"] = round(float(np.mean(sims)), 3)
    # ECAPA cosine → friendly 0–100 score (0.25 ≈ different person, 0.75 ≈ same recording)
    out["score"] = int(np.clip((out["similarity"] - 0.25) / 0.5 * 100, 0, 100))
    return out


def try_train_fish_model(
    name: str, d: Path, refs: dict[str, list[dict[str, Any]]], report: Callable[..., None]
) -> dict[str, Any]:
    """Fish 'professional' trained voices need paid API credit. Try once; keep the free
    emotion-matched references when the account does not allow it."""
    import os

    import requests

    key = os.environ.get("FISH_API_KEY", "").strip()
    if not key:
        report("train", 1.0, "Skipped (no Fish key).")
        return {"trained": False, "reason": "no Fish key"}
    files = []
    texts = []
    for mood in MOODS:
        for r in refs[mood]:
            files.append(("voices", (r["file"], (d / r["file"]).read_bytes(), "audio/mpeg")))
            texts.append(("texts", r["text"]))
    try:
        resp = requests.post(
            "https://api.fish.audio/model",
            headers={"Authorization": f"Bearer {key}"},
            data=[("type", "tts"), ("train_mode", "fast"), ("title", f"lcv-{name}"),
                  ("visibility", "private"), ("enhance_audio_quality", "true"), *texts],
            files=files,
            timeout=60,
        )  # fmt: skip
    except Exception as e:
        report("train", 1.0, f"Fish not reachable ({type(e).__name__}); using references.")
        return {"trained": False, "reason": "network"}
    if resp.status_code in (200, 201):
        model_id = resp.json().get("_id")
        report("train", 1.0, f"Trained Fish voice model created ({model_id}).")
        return {"trained": True, "model_id": model_id}
    reason = (
        "needs Fish API credit" if resp.status_code in (402, 403) else f"HTTP {resp.status_code}"
    )
    report("train", 1.0, f"Trained Fish model not available ({reason}); "
                         "using emotion-matched references — free and live-ready.")  # fmt: skip
    return {"trained": False, "reason": reason}
