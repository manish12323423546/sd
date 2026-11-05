"""Fish Audio TTS provider (hosted API, model `s2.1-pro-free` = $0 by default).

- Emotion comes through Fish's inline tags: calm → [calm], excited → [excited],
  peak → [excited][shouting] (neutral: no tag).
- Characters stay our own licensed voices: each character is cloned on the fly from a ~15 s
  reference recorded with the matching Kokoro voice (Apache-2.0), sent with the request
  (`references`). The free tier cannot store voice models, so the reference travels each time.
- If Fish fails (network, 429 rate limit, 5xx, timeout) the line is synthesized locally with
  Kokoro instead, so a session never stops because of the API.

The key is read from FISH_API_KEY (or a file named by FISH_API_KEY_FILE); never commit it.
"""

from __future__ import annotations

import os
import subprocess
import threading
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np

from engine.audio import F32, as_f32, db_to_gain, fade, trim_silence
from engine.providers.base import DeliveryStyle, TTSResult, VoiceInfo
from engine.record.models import Emotion

API_URL = "https://api.fish.audio/v1/tts"
SAMPLE_RATE = 24000
EMOTION_TAGS = {
    Emotion.calm: "[calm] ",
    Emotion.neutral: "",
    Emotion.excited: "[excited] ",
    Emotion.peak: "[excited][shouting] ",
}
# A short reference (~6 s) keeps each request small: measured 0.2–0.3 s faster than ~15 s.
REFERENCE_TEXT = "Good evening and welcome to the match. What a chance! He has to score there!"
LIMIT = 0.89  # −1 dBFS soft-limit ceiling, applied identically to every streamed chunk
CACHE_DIR = Path(os.environ.get("LCV_CACHE", Path.home() / ".cache" / "live-character-voice"))


def _read_key() -> str:
    key = os.environ.get("FISH_API_KEY", "").strip()
    if not key and os.environ.get("FISH_API_KEY_FILE"):
        key = Path(os.environ["FISH_API_KEY_FILE"]).read_text().strip()
    if not key:
        raise RuntimeError("Fish Audio needs FISH_API_KEY (or FISH_API_KEY_FILE) to be set")
    return key


class FishTTS:
    def __init__(
        self,
        model: str = "s2.1-pro-free",
        latency: str = "balanced",
        timeout_s: float = 12.0,
        fallback: Any | None = None,
    ) -> None:
        import requests

        self._http = requests.Session()
        self.key = _read_key()
        self.model = model
        self.latency = latency
        self.timeout_s = timeout_s
        if fallback is None:
            from engine.providers.free.tts_kokoro import KokoroTTS

            fallback = KokoroTTS()
        self.fallback = fallback  # also records the character references
        self._refs: dict[str, bytes] = {}
        self._lock = threading.Lock()
        from engine.config import load_voice_catalog

        self._base_speed = {
            v.voice_id: v.base_speed for v in load_voice_catalog(include_custom=False).voices
        }
        self.n_fish = 0
        self.n_fallback = 0
        self.first_audio_s: list[float] = []
        self.last_error = ""

    def voices(self) -> list[VoiceInfo]:
        list_voices = self.fallback.voices
        voices: list[VoiceInfo] = list_voices()
        return voices

    # ---- character references -------------------------------------------------------------
    def _reference(self, voice_id: str) -> tuple[bytes, str]:
        """(reference audio, its transcript). Custom voices use the user's own sample; built-in
        characters use a clip recorded with the matching Kokoro voice."""
        from engine.voices_custom import is_custom, reference

        if is_custom(voice_id):
            return reference(voice_id)
        with self._lock:
            if voice_id in self._refs:
                return self._refs[voice_id], REFERENCE_TEXT
            path = CACHE_DIR / "fish_refs_v2" / f"{voice_id}.mp3"
            if not path.exists():
                import soundfile as sf

                path.parent.mkdir(parents=True, exist_ok=True)
                speed = self._base_speed.get(voice_id, 1.0)
                res = self.fallback.synthesize(REFERENCE_TEXT, voice_id, DeliveryStyle(speed=speed))
                wav = path.with_suffix(".wav")
                sf.write(wav, res.audio, res.sr)
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ac", "1", "-c:a",
                     "libmp3lame", "-b:a", "48k", str(path)],
                    check=True,
                )  # fmt: skip
                wav.unlink()
            self._refs[voice_id] = path.read_bytes()
            return self._refs[voice_id], REFERENCE_TEXT

    supports_cloning = True

    # ---- synthesis --------------------------------------------------------------------------
    def _request(self, text: str, voice_id: str, style: DeliveryStyle) -> Any:
        import msgpack

        base = self._base_speed.get(voice_id, 1.0)
        speed = float(np.clip(style.speed / base, 0.85, 1.25))
        from engine.voices_custom import fish_model_id, is_custom, references

        if is_custom(voice_id):
            refs = references(voice_id, str(style.emotion))  # mood-matched (pro voices)
        else:
            refs = [self._reference(voice_id)]
        body: dict[str, Any] = {
            "text": EMOTION_TAGS.get(style.emotion, "") + text,
            "format": "pcm",
            "sample_rate": SAMPLE_RATE,
            "latency": self.latency,
            "normalize": True,
            "prosody": {"speed": round(speed, 3), "volume": 0},
            "references": [{"audio": a, "text": t} for a, t in refs],
        }
        model_id = fish_model_id(voice_id) if is_custom(voice_id) else None
        if model_id:  # a trained Fish voice (paid accounts) replaces the references
            body["reference_id"] = model_id
            body.pop("references")
        headers = {
            "Authorization": f"Bearer {self.key}",
            "model": self.model,
            "Content-Type": "application/msgpack",
        }
        r = self._http.post(
            API_URL, data=msgpack.packb(body), headers=headers, stream=True, timeout=self.timeout_s
        )
        if r.status_code != 200:
            msg = r.text[:200]
            r.close()
            raise RuntimeError(f"Fish HTTP {r.status_code}: {msg}")
        return r

    def stream(self, text: str, voice_id: str, style: DeliveryStyle) -> Iterator[F32]:
        """Yield audio chunks (24 kHz float32) as Fish produces them: leading silence skipped,
        gain + a chunk-consistent soft limiter (−1 dBFS) applied. Falls back to Kokoro (one chunk)
        if Fish fails before any audio arrived."""
        gain = db_to_gain(style.gain_db)
        resp = None
        for attempt in range(2):
            try:
                resp = self._request(text, voice_id, style)
                break
            except Exception as e:  # any API failure → retry once on 429/503, then Kokoro
                self.last_error = str(e)
                if attempt == 0 and ("429" in str(e) or "503" in str(e)):
                    time.sleep(0.3)
                    continue
                break
        if resp is None:
            self.n_fallback += 1
            local_voice = (
                voice_id
                if voice_id in self._base_speed and not voice_id.startswith("cu_")
                else "am_adam"
            )
            yield self.fallback.synthesize(text, local_voice, style).audio
            return
        self.n_fish += 1
        started = False
        carry = b""
        pre = np.zeros(0, dtype=np.float32)
        thresh = db_to_gain(-45.0)
        with resp:
            for raw in resp.iter_content(4096):
                raw = carry + raw
                cut = len(raw) // 2 * 2
                carry = raw[cut:]
                x = np.frombuffer(raw[:cut], dtype="<i2").astype(np.float32) / 32768.0
                if not started:
                    loud = np.nonzero(np.abs(x) > thresh)[0]
                    if loud.size == 0:
                        pre = x[-int(0.03 * SAMPLE_RATE) :]
                        continue
                    started = True
                    x = np.concatenate([pre, x[max(0, int(loud[0]) - int(0.03 * SAMPLE_RATE)) :]])
                yield as_f32(LIMIT * np.tanh(x * gain / LIMIT))

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult:
        parts = list(self.stream(text, voice_id, style))
        audio = as_f32(np.concatenate(parts)) if parts else np.zeros(0, dtype=np.float32)
        audio = fade(trim_silence(audio, SAMPLE_RATE, threshold_db=-50.0, pad_s=0.03), SAMPLE_RATE)
        return TTSResult(audio=audio, sr=SAMPLE_RATE, duration_s=audio.size / SAMPLE_RATE)


def create(**kwargs: Any) -> FishTTS:
    return FishTTS(**kwargs)
