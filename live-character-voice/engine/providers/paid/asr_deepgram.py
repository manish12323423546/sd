"""Deepgram Nova-3 speech-to-text (paid; new accounts get free credit).

Each phrase is sent as one short request (the same shape as Groq), so it drops straight into the
existing pipeline. Player and team names from `config/glossary.txt` are sent as Nova-3
"keyterms", so they are spelled right.

If Deepgram fails on a line (network, 5xx, rate limit, no credit), that line goes to the next
engine in the chain: Groq if its key works, otherwise local faster-whisper. A session never
stops because of the API.

Key: DEEPGRAM_API_KEY (in `.env`, or as a Hugging Face Space secret).
Get a key (free credit on sign-up): https://console.deepgram.com/signup
Price (Nova-3, pay as you go): about $0.0043/min for short requests like these, so roughly
$0.26 per hour of commentary.
"""

from __future__ import annotations

import io
import math
import os
import time
from pathlib import Path
from typing import Any

import soundfile as sf

from engine.audio import F32
from engine.providers.base import ASRResult, Word

API_URL = "https://api.deepgram.com/v1/listen"
GLOSSARY = Path(__file__).resolve().parents[3] / "config/glossary.txt"


def _keyterms(path: Path = GLOSSARY) -> list[str]:
    try:
        lines = path.read_text().splitlines()
    except OSError:
        return []
    return [x.strip() for x in lines if x.strip() and not x.startswith("#")][:50]


class DeepgramASR:
    def __init__(
        self,
        model: str = "nova-3",
        timeout_s: float = 8.0,
        fallback: Any | None = None,
        fallback_model: str = "small.en",
        groq_model: str = "whisper-large-v3-turbo",
    ) -> None:
        import requests

        self._http = requests.Session()
        self.key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
        self.model = model
        self.timeout_s = timeout_s
        if fallback is None:
            fallback = _default_fallback(fallback_model, groq_model)
        self.fallback = fallback
        self.keyterms = _keyterms()
        self.n_deepgram = 0
        self.n_fallback = 0
        self.n_empty_retry = 0
        self.last_error = ""
        self._cooldown_until = 0.0

    def _deepgram(self, audio: F32, sr: int) -> ASRResult:
        buf = io.BytesIO()
        sf.write(buf, audio, sr, format="WAV", subtype="PCM_16")
        params: list[tuple[str, str]] = [
            ("model", self.model),
            ("language", "en"),
            ("smart_format", "true"),
            ("punctuate", "true"),
        ]
        params += [("keyterm", k) for k in self.keyterms]
        r = self._http.post(
            API_URL,
            params=params,
            headers={"Authorization": f"Token {self.key}", "Content-Type": "audio/wav"},
            data=buf.getvalue(),
            timeout=self.timeout_s,
        )
        if r.status_code == 429:
            self._cooldown_until = time.monotonic() + 10.0
        if r.status_code in (401, 402, 403):
            self._cooldown_until = float("inf")  # bad key / no credit: stay on the fallback
        if r.status_code != 200:
            raise RuntimeError(f"Deepgram HTTP {r.status_code}: {r.text[:200]}")
        return parse_response(r.json())

    def transcribe(
        self,
        audio: F32,
        sr: int,
        prompt: str | None = None,
        span: tuple[float, float] | None = None,
    ) -> ASRResult:
        if self.key and time.monotonic() >= self._cooldown_until:
            try:
                res = self._deepgram(audio, sr)
                self.n_deepgram += 1
                # measured: Deepgram sometimes returns nothing for short excited phrases
                # (1.4–1.6 s shouts) that Whisper hears fine — ask the backup for those
                if res.text or audio.size < 0.6 * sr:
                    return res.model_copy(update={"source": "deepgram"})
                self.n_empty_retry += 1
                back: ASRResult = self.fallback.transcribe(audio, sr, prompt, span)
                if back.text:
                    return back.model_copy(update={"source": f"{back.source or 'local'}*"})
                return res.model_copy(update={"source": "deepgram"})
            except Exception as e:  # any API failure → next engine for this line
                self.last_error = str(e)
        self.n_fallback += 1
        result: ASRResult = self.fallback.transcribe(audio, sr, prompt, span)
        if not result.source:
            result = result.model_copy(update={"source": "local"})
        return result


def parse_response(js: dict[str, Any]) -> ASRResult:
    try:
        alt = js["results"]["channels"][0]["alternatives"][0]
    except (KeyError, IndexError, TypeError):
        return ASRResult(text="", no_speech_prob=1.0)
    words = [
        Word(
            word=str(w.get("punctuated_word") or w.get("word", "")).strip(),
            start=float(w["start"]),
            end=float(w["end"]),
            prob=float(w.get("confidence", 1.0)),
        )
        for w in alt.get("words") or []
    ]
    text = " ".join(str(alt.get("transcript", "")).split())
    conf = float(alt.get("confidence", 0.0) or 0.0)
    return ASRResult(
        text=text,
        words=words,
        avg_logprob=math.log(max(conf, 1e-3)) if text else -5.0,
        no_speech_prob=0.0 if text else 1.0,
    )


def _default_fallback(fallback_model: str, groq_model: str) -> Any:
    if os.environ.get("GROQ_API_KEY"):
        from engine.providers.free.asr_groq import GroqASR

        return GroqASR(model=groq_model, fallback_model=fallback_model)
    from engine.providers.free.asr_faster_whisper import FasterWhisperASR

    return FasterWhisperASR(fallback_model)


def create(**kwargs: Any) -> DeepgramASR:
    return DeepgramASR(**kwargs)
