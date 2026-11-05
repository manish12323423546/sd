"""faster-whisper ASR provider (MIT). int8 on CPU, word timestamps (docs/04 §3)."""

from __future__ import annotations

import re
from typing import Any

import numpy as np

from engine.audio import F32
from engine.providers.base import ASRResult, Word

_SPACES = re.compile(r"\s+")


class FasterWhisperASR:
    def __init__(
        self,
        model: str = "small.en",
        compute_type: str = "int8",
        cpu_threads: int = 4,
        beam_size: int = 1,
    ) -> None:
        from faster_whisper import WhisperModel

        self.model_name = model
        self.beam_size = beam_size
        self._model = WhisperModel(
            model, device="cpu", compute_type=compute_type, cpu_threads=cpu_threads, num_workers=1
        )

    def transcribe(
        self,
        audio: F32,
        sr: int,
        prompt: str | None = None,
        span: tuple[float, float] | None = None,
    ) -> ASRResult:
        if sr != 16000:
            raise ValueError("faster-whisper expects 16 kHz audio")
        segments, _info = self._model.transcribe(
            audio.astype(np.float32),
            language="en",
            beam_size=self.beam_size,
            vad_filter=False,
            word_timestamps=True,
            condition_on_previous_text=False,
            initial_prompt=prompt or None,
            without_timestamps=False,
            temperature=0.0,
        )
        texts: list[str] = []
        words: list[Word] = []
        logprobs: list[float] = []
        no_speech: list[float] = []
        for seg in segments:
            texts.append(seg.text)
            logprobs.append(float(seg.avg_logprob))
            no_speech.append(float(seg.no_speech_prob))
            for w in seg.words or []:
                words.append(
                    Word(
                        word=w.word.strip(),
                        start=float(w.start),
                        end=float(w.end),
                        prob=float(w.probability),
                    )
                )
        text = _SPACES.sub(" ", " ".join(texts)).strip()
        return ASRResult(
            text=text,
            words=words,
            avg_logprob=float(np.mean(logprobs)) if logprobs else -10.0,
            no_speech_prob=float(np.max(no_speech)) if no_speech else 1.0,
        )


def create(**kwargs: Any) -> FasterWhisperASR:
    return FasterWhisperASR(**kwargs)
