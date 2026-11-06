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
import threading
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
        # free tier: ~20 requests/min. Stay under it ourselves (GROQ_RPM; raise it on a paid
        # plan) instead of collecting 429s: wait ≤ GROQ_MAX_WAIT_S for a free slot, else local.
        self.rpm = int(os.environ.get("GROQ_RPM", "19"))
        self.max_wait_s = float(os.environ.get("GROQ_MAX_WAIT_S", "1.5"))
        self._sent: list[float] = []
        self._lock = threading.Lock()
        self.n_waited = 0

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
            try:
                retry = float(r.headers.get("retry-after", "10"))
            except ValueError:
                retry = 10.0
            self._cooldown_until = time.monotonic() + min(30.0, max(1.0, retry))
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
        if time.monotonic() >= self._cooldown_until and self._take_slot():
            try:
                res = self._groq(audio, sr, prompt)
                self.n_groq += 1
                return res.model_copy(update={"source": "groq"})
            except Exception as e:  # any API failure → local model for this line
                self.last_error = str(e)
        self.n_fallback += 1
        result: ASRResult = self.fallback.transcribe(audio, sr, prompt, span)
        return result.model_copy(update={"source": result.source or "local"})

    def _take_slot(self) -> bool:
        """Sliding 60 s window under the requests-per-minute limit; waits briefly for a slot."""
        deadline = time.monotonic() + self.max_wait_s
        waited = False
        while True:
            with self._lock:
                now = time.monotonic()
                self._sent = [t for t in self._sent if now - t < 60.0]
                if len(self._sent) < self.rpm:
                    self._sent.append(now)
                    if waited:
                        self.n_waited += 1
                    return True
                free_at = self._sent[0] + 60.0
            if free_at > deadline:
                return False
            waited = True
            time.sleep(max(0.01, free_at - time.monotonic()))


def create(**kwargs: Any) -> GroqASR:
    return GroqASR(**kwargs)
