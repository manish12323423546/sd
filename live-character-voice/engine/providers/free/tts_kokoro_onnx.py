"""Kokoro-82M through ONNX Runtime (Apache-2.0 model export by onnx-community, MIT runtime).

Same voices and G2P as the torch provider (misaki via `KPipeline(model=False)`), but the acoustic
model runs in onnxruntime — faster on CPU and, as a separate native runtime, it does not compete
with torch's thread pool. `variant` picks the export: "fp32" (model.onnx) or "int8"
(model_quantized.onnx). Chosen in M7 from measurements (see BUILD_LOG).
"""

from __future__ import annotations

import json
import threading
import warnings
from pathlib import Path
from typing import Any

import numpy as np

from engine.audio import F32, as_f32, db_to_gain, fade, soft_limit, trim_silence
from engine.providers.base import DeliveryStyle, TTSResult, VoiceInfo
from engine.providers.free.tts_kokoro import REPO_ID, SAMPLE_RATE, split_for_synthesis

ONNX_REPO = "onnx-community/Kokoro-82M-v1.0-ONNX"
VARIANTS = {"fp32": "onnx/model.onnx", "int8": "onnx/model_quantized.onnx"}
MAX_TOKENS = 510


class KokoroOnnxTTS:
    def __init__(
        self,
        variant: str = "fp32",
        threads: int = 2,
        lang_codes: tuple[str, ...] = ("a", "b"),
    ) -> None:
        warnings.filterwarnings("ignore", category=UserWarning)
        warnings.filterwarnings("ignore", category=FutureWarning)
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download, snapshot_download
        from kokoro import KPipeline

        model_path = hf_hub_download(ONNX_REPO, VARIANTS[variant])
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = threads
        opts.inter_op_num_threads = 1
        self._sess = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])
        cfg_path = hf_hub_download(REPO_ID, "config.json")
        self._vocab: dict[str, int] = json.loads(Path(cfg_path).read_text())["vocab"]
        self._g2p: dict[str, Any] = {
            lc: KPipeline(lang_code=lc, repo_id=REPO_ID, model=False) for lc in lang_codes
        }
        voices_dir = Path(snapshot_download(REPO_ID, allow_patterns=["voices/*.pt"])) / "voices"
        self._voices_dir = voices_dir
        self._voice_ids = sorted(p.stem for p in voices_dir.glob("*.pt"))
        self._packs: dict[str, F32] = {}
        self._lock = threading.Lock()
        self.variant = variant

    def voices(self) -> list[VoiceInfo]:
        return [VoiceInfo(voice_id=v, lang_code=v[0]) for v in self._voice_ids]

    def _pack(self, voice_id: str) -> F32:
        with self._lock:
            if voice_id not in self._packs:
                import torch

                pack = torch.load(self._voices_dir / f"{voice_id}.pt", weights_only=True)
                self._packs[voice_id] = as_f32(pack.numpy().reshape(pack.shape[0], -1))
            return self._packs[voice_id]

    def _phoneme_chunks(self, text: str, voice_id: str) -> list[str]:
        pipe = self._g2p.get(voice_id[0])
        if pipe is None:
            raise KeyError(f"no G2P loaded for language {voice_id[0]!r}")
        return [r.phonemes for r in pipe(text, voice=None) if r.phonemes]

    def _synth_phonemes(self, phonemes: str, voice_id: str, speed: float) -> F32:
        ids = [self._vocab[p] for p in phonemes if p in self._vocab][: MAX_TOKENS - 2]
        if not ids:
            return np.zeros(0, dtype=np.float32)
        pack = self._pack(voice_id)
        style = pack[min(len(ids), pack.shape[0] - 1)][None, :]
        out = self._sess.run(
            None,
            {
                "input_ids": np.asarray([[0, *ids, 0]], dtype=np.int64),
                "style": style.astype(np.float32),
                "speed": np.asarray([speed], dtype=np.float32),
            },
        )[0]
        return as_f32(np.asarray(out).reshape(-1))

    def synthesize(self, text: str, voice_id: str, style: DeliveryStyle) -> TTSResult:
        gap = np.zeros(int(SAMPLE_RATE * 0.06), dtype=np.float32)
        pieces: list[F32] = []
        for chunk in split_for_synthesis(text):
            for ph in self._phoneme_chunks(chunk, voice_id):
                if pieces:
                    pieces.append(gap)
                pieces.append(self._synth_phonemes(ph, voice_id, style.speed))
        audio = as_f32(np.concatenate(pieces)) if pieces else np.zeros(0, dtype=np.float32)
        if style.pitch_semitones and audio.size:
            import librosa

            audio = as_f32(
                librosa.effects.pitch_shift(audio, sr=SAMPLE_RATE, n_steps=style.pitch_semitones)
            )
        if audio.size:
            audio = fade(
                trim_silence(audio, SAMPLE_RATE, threshold_db=-50.0, pad_s=0.03), SAMPLE_RATE
            )
        audio = soft_limit(audio * db_to_gain(style.gain_db), ceiling_db=-1.0)
        return TTSResult(audio=audio, sr=SAMPLE_RATE, duration_s=audio.size / SAMPLE_RATE)


def create(**kwargs: Any) -> KokoroOnnxTTS:
    return KokoroOnnxTTS(**kwargs)
