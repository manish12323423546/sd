"""Kokoro-82M TTS provider (Apache-2.0). One KPipeline per language, 24 kHz output."""

from __future__ import annotations

import re
import threading
import warnings
from pathlib import Path
from typing import Any

import numpy as np

from engine.audio import F32, as_f32, db_to_gain, fade, soft_limit, trim_silence
from engine.providers.base import DeliveryStyle, TTSResult, VoiceInfo

REPO_ID = "hexgrad/Kokoro-82M"
SAMPLE_RATE = 24000
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def split_for_synthesis(text: str, max_sentences: int = 2) -> list[str]:
    """Long lines are split on sentence punctuation into chunks of ≤ `max_sentences`."""
    sentences = [s for s in _SENT_SPLIT.split(text.strip()) if s]
    if len(sentences) <= max_sentences:
        return [text.strip()] if text.strip() else []
    return [
        " ".join(sentences[i : i + max_sentences]) for i in range(0, len(sentences), max_sentences)
    ]


class KokoroTTS:
    def __init__(self, lang_codes: tuple[str, ...] = ("a", "b"), torch_threads: int | None = None):
        warnings.filterwarnings("ignore", category=UserWarning)
        warnings.filterwarnings("ignore", category=FutureWarning)
        import torch
        from kokoro import KModel, KPipeline

        if torch_threads:
            torch.set_num_threads(torch_threads)
        self._model = KModel(repo_id=REPO_ID).eval()
        self._pipelines: dict[str, Any] = {
            lc: KPipeline(lang_code=lc, repo_id=REPO_ID, model=self._model) for lc in lang_codes
        }
        self._voice_lock = threading.Lock()
        from huggingface_hub import snapshot_download

        voices_dir = Path(snapshot_download(REPO_ID, allow_patterns=["voices/*.pt"])) / "voices"
        self._voice_ids = sorted(p.stem for p in voices_dir.glob("*.pt"))

    def voices(self) -> list[VoiceInfo]:
        return [VoiceInfo(voice_id=v, lang_code=v[0]) for v in self._voice_ids]

    def _pipeline_for(self, voice_id: str) -> Any:
        lc = voice_id[0]
        if lc not in self._pipelines:
            raise KeyError(f"no Kokoro pipeline loaded for language {lc!r} (voice {voice_id})")
        return self._pipelines[lc]

    def _synth_raw(self, text: str, voice_id: str, speed: float) -> F32:
        import torch

        pipe = self._pipeline_for(voice_id)
        with self._voice_lock:  # voice tensors are cached in a dict inside KPipeline
            pipe.load_voice(voice_id)
        parts: list[F32] = []
        with torch.inference_mode():
            for result in pipe(text, voice=voice_id, speed=speed):
                if result.audio is not None:
                    parts.append(as_f32(result.audio.numpy()))
        return as_f32(np.concatenate(parts)) if parts else np.zeros(0, dtype=np.float32)

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult:
        chunks = split_for_synthesis(text)
        gap = np.zeros(int(SAMPLE_RATE * 0.06), dtype=np.float32)
        pieces: list[F32] = []
        for i, chunk in enumerate(chunks):
            if i:
                pieces.append(gap)
            pieces.append(self._synth_raw(chunk, voice_id, style.speed))
        audio = as_f32(np.concatenate(pieces)) if pieces else np.zeros(0, dtype=np.float32)
        if style.pitch_semitones:
            import librosa

            audio = as_f32(
                librosa.effects.pitch_shift(audio, sr=SAMPLE_RATE, n_steps=style.pitch_semitones)
            )
        # Kokoro adds ~0.2–0.3 s of silence at each end; trim it (keep 30 ms) so the voice starts
        # sooner and its length is comparable with the original line (M5, see BUILD_LOG).
        if audio.size:
            audio = fade(
                trim_silence(audio, SAMPLE_RATE, threshold_db=-50.0, pad_s=0.03), SAMPLE_RATE
            )
        audio = soft_limit(audio * db_to_gain(style.gain_db), ceiling_db=-1.0)
        return TTSResult(audio=audio, sr=SAMPLE_RATE, duration_s=audio.size / SAMPLE_RATE)


def create(**kwargs: Any) -> KokoroTTS:
    return KokoroTTS(**kwargs)
