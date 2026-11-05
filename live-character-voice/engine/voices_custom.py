"""Custom ("bring your own") voices for instant cloning.

A custom voice is a 6–30 s recording the user OWNS or has PERMISSION to use, plus its transcript.
It is stored under data/voices/custom/<slug>/ (git-ignored, never committed):
  ref.mp3     mono 24 kHz reference clip (cleaned and trimmed)
  meta.json   {voice_id, name, transcript, seconds, consent, created}
Voice ids are "cu_<slug>". Voice generation with a custom voice needs a cloning-capable provider
(Fish Audio); with the local Kokoro provider a default voice is used instead.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import numpy as np

from engine.config import PROJECT_ROOT, VoiceEntry
from engine.ingest.decode import decode_audio

CUSTOM_DIR = PROJECT_ROOT / "data" / "voices" / "custom"
MIN_S, MAX_S = 6.0, 15.0  # measured: ~15 s clones closest; 29 s was less similar and slower
PREFIX = "cu_"


class VoiceUploadError(ValueError):
    pass


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:32]
    return slug or "voice"


def _dir(voice_id: str) -> Path:
    if not voice_id.startswith(PREFIX):
        raise KeyError(voice_id)
    d = CUSTOM_DIR / voice_id[len(PREFIX) :]
    if not (d / "meta.json").exists():
        raise KeyError(voice_id)
    return d


def is_custom(voice_id: str) -> bool:
    return voice_id.startswith(PREFIX)


def list_custom() -> list[dict[str, Any]]:
    if not CUSTOM_DIR.exists():
        return []
    out = []
    for meta in sorted(CUSTOM_DIR.glob("*/meta.json")):
        try:
            out.append(json.loads(meta.read_text()))
        except (OSError, json.JSONDecodeError):
            continue
    return out


def catalog_entries() -> list[VoiceEntry]:
    return [
        VoiceEntry(
            voice_id=m["voice_id"],
            name=m["name"],
            description=(
                f"Pro clone · {len([r for rs in m['refs'].values() for r in rs])} "
                f"references across calm, neutral and excited"
                if m.get("tier") == "pro"
                else f"Instant clone · {m['seconds']:.0f} s sample"
            ),
            lang_code="a",
            base_speed=1.0,
            enabled_in_pilot=True,
        )
        for m in list_custom()
    ]


def reference(voice_id: str) -> tuple[bytes, str]:
    d = _dir(voice_id)
    meta = json.loads((d / "meta.json").read_text())
    return (d / "ref.mp3").read_bytes(), str(meta["transcript"])


def references(voice_id: str, emotion: str = "neutral") -> list[tuple[bytes, str]]:
    """Reference clips for one line. Pro voices return the references recorded in the matching
    mood (peak → excited; missing moods → neutral); instant voices return their single clip."""
    d = _dir(voice_id)
    meta = json.loads((d / "meta.json").read_text())
    refs = meta.get("refs")
    if not refs:
        return [((d / "ref.mp3").read_bytes(), str(meta["transcript"]))]
    # Measured (BUILD_LOG V2.3): the steady "neutral" references keep the voice most like the
    # speaker in EVERY mood (excited line 0.69 vs 0.33 with excited references, which made the
    # identity drift); the mood itself comes from Fish's emotion tags. Mood references are used
    # only if a voice opts in with "mood_refs": true.
    mood = {"peak": "excited"}.get(emotion, emotion) if meta.get("mood_refs") else "neutral"
    chosen = refs.get(mood) or refs.get("neutral") or next(v for v in refs.values() if v)
    return [((d / r["file"]).read_bytes(), str(r["text"])) for r in chosen]


def fish_model_id(voice_id: str) -> str | None:
    try:
        meta = json.loads((_dir(voice_id) / "meta.json").read_text())
    except KeyError:
        return None
    fm = meta.get("fish_model") or {}
    return str(fm["model_id"]) if fm.get("trained") and fm.get("model_id") else None


def get_meta(voice_id: str) -> dict[str, Any]:
    return dict(json.loads((_dir(voice_id) / "meta.json").read_text()))


def best_window(audio: np.ndarray, sr: int, length_s: float = MAX_S) -> float:
    """Start (s) of the most useful `length_s` stretch: most speech, steadiest level (avoids long
    silences and extreme shouting, which made clones less similar in our tests)."""
    from engine.audio import frame_db

    if audio.size <= int(length_s * sr):
        return 0.0
    lv = frame_db(audio, int(0.1 * sr))  # 100 ms frames
    win = int(length_s * 10)
    best, best_score = 0, -1e9
    for i in range(0, max(1, lv.size - win), 5):
        seg = lv[i : i + win]
        speech = seg > (np.max(lv) - 35)
        score = float(speech.mean()) - 0.01 * float(np.std(seg[speech])) if speech.any() else -1e9
        if score > best_score:
            best, best_score = i, score
    return best / 10.0


def add_custom_voice(
    name: str,
    source: Path,
    consent: bool,
    transcript: str | None = None,
    asr: Any | None = None,
) -> dict[str, Any]:
    """Validate, clean and store a reference clip. `asr` (an ASRProvider) transcribes it when no
    transcript is given — cloning quality is best when the text matches the audio."""
    if not consent:
        raise VoiceUploadError(
            "Confirm that you own this voice or have permission to clone it. "
            "Voices of real people or known characters need their consent or a licence."
        )
    name = name.strip()[:40]
    if not name:
        raise VoiceUploadError("Give the voice a name.")
    try:
        audio = decode_audio(source, 16000)
    except Exception as e:
        raise VoiceUploadError(f"Could not read the audio file: {e}") from e
    seconds = audio.size / 16000
    if seconds < MIN_S:
        raise VoiceUploadError(
            f"The sample is {seconds:.1f} s; use at least {MIN_S:.0f} s of speech."
        )
    if float(np.sqrt(np.mean(audio**2))) < 1e-3:
        raise VoiceUploadError("The sample is silent.")
    start = best_window(audio, 16000)
    slug = slugify(name)
    voice_id = PREFIX + slug
    d = CUSTOM_DIR / slug
    d.mkdir(parents=True, exist_ok=True)
    # mono 24 kHz MP3, loudness-normalised, silence trimmed at both ends, max 30 s
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(source), "-vn", "-ac", "1", "-ar", "24000",
            "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                   "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                   "loudnorm=I=-18:TP=-2",
            "-ss", f"{start:.2f}", "-t", str(MAX_S), "-c:a", "libmp3lame", "-b:a", "64k",
            str(d / "ref.mp3"),
        ],
        check=True,
    )  # fmt: skip
    used = min(seconds, MAX_S)
    if not transcript and asr is not None:
        clip = decode_audio(d / "ref.mp3", 16000)
        transcript = asr.transcribe(clip, 16000).text
    meta = {
        "voice_id": voice_id,
        "name": name,
        "transcript": (transcript or "").strip(),
        "seconds": round(used, 1),
        "source_start_s": round(start, 1),
        "source_seconds": round(seconds, 1),
        "consent": True,
        "created": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    (d / "meta.json").write_text(json.dumps(meta, indent=2))
    return meta


def remove_custom_voice(voice_id: str) -> None:
    d = _dir(voice_id)
    for f in d.iterdir():
        f.unlink()
    d.rmdir()
