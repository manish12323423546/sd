"""Groq-hosted Whisper ASR (free tier: whisper-large-v3-turbo).

Bigger model than the local small.en and runs on Groq's hardware, so it is both more accurate and
faster per line (measured 0.6–0.9 s including the network) — and it frees the local CPU.
On any failure (429 free-tier limit, network, 5xx) the line falls back to local faster-whisper,
so a session never stops because of the API.

Key: read from GROQ_API_KEY. In the Claude Code cloud environment the key is injected by the
network proxy, so the variable can hold a placeholder.
Get a free key: https://console.groq.com/keys
"""

from __future__ import annotations

import io
import os
import time
from typing import Any

import numpy as np
import soundfile as sf

from engine.audio import F32
from engine.providers.base import ASRResult, Word

API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


class GroqASR:
    def __init__(
        self,
        model: str = "whisper-large-v3-turbo",
        timeout_s: float = 8.0,
        fallback: Any | None = None,
        fallback_model: str = "small.en",
    ) -> None:
        import requests

        self._http = requests.Session()
        self.key = os.environ.get("GROQ_API_KEY", "proxy-injected")
        self.model = model
        self.timeout_s = timeout_s
        if fallback is None:
            from engine.providers.free.asr_faster_whisper import FasterWhisperASR

            fallback = FasterWhisperASR(fallback_model)
        self.fallback = fallback
        self.n_groq = 0
        self.n_fallback = 0
        self.last_error = ""
        self._cooldown_until = 0.0  # after a 429, use the local model for a while

    def _groq(self, audio: F32, sr: int, prompt: str | None) -> ASRResult:
        buf = io.BytesIO()
        sf.write(buf, audio, sr, format="FLAC")
        data = {
            "model": self.model,
            "language": "en",
            "response_format": "verbose_json",
            "timestamp_granularities[]": ["word", "segment"],
            "temperature": "0",
        }
        if prompt:
            data["prompt"] = prompt[-800:]
        r = self._http.post(
            API_URL,
            headers={"Authorization": f"Bearer {self.key}"},
            files={"file": ("line.flac", buf.getvalue(), "audio/flac")},
            data=data,
            timeout=self.timeout_s,
        )
        if r.status_code == 429:
            self._cooldown_until = time.monotonic() + 20.0
        if r.status_code in (401, 403):
            self._cooldown_until = float("inf")  # bad/missing key: stay on the local model
        if r.status_code != 200:
            raise RuntimeError(f"Groq HTTP {r.status_code}: {r.text[:200]}")
        js = r.json()
        words = [
            Word(
                word=str(w["word"]).strip(), start=float(w["start"]), end=float(w["end"]), prob=1.0
            )
            for w in js.get("words") or []
        ]
        segs = js.get("segments") or []
        avg_logprob = float(np.mean([s.get("avg_logprob", 0.0) for s in segs])) if segs else 0.0
        no_speech = float(max((s.get("no_speech_prob", 0.0) for s in segs), default=0.0))
        return ASRResult(
            text=" ".join(str(js.get("text", "")).split()),
            words=words,
            avg_logprob=avg_logprob,
            no_speech_prob=no_speech,
        )

    def transcribe(
        self,
        audio: F32,
        sr: int,
        prompt: str | None = None,
        span: tuple[float, float] | None = None,
    ) -> ASRResult:
        if time.monotonic() >= self._cooldown_until:
            try:
                res = self._groq(audio, sr, prompt)
                self.n_groq += 1
                return res
            except Exception as e:  # any API failure → local model for this line
                self.last_error = str(e)
        self.n_fallback += 1
        result: ASRResult = self.fallback.transcribe(audio, sr, prompt, span)
        return result


def create(**kwargs: Any) -> GroqASR:
    return GroqASR(**kwargs)
