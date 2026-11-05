"""SpeechBrain ECAPA-TDNN speaker embeddings (Apache-2.0), 192-dim, L2-normalised (docs/04 §4)."""

from __future__ import annotations

import warnings
from typing import Any

import numpy as np
import numpy.typing as npt

from engine.audio import F32

SOURCE = "speechbrain/spkrec-ecapa-voxceleb"


class EcapaSpeaker:
    window_s = 1.5
    hop_s = 0.75

    def __init__(self, torch_threads: int | None = None) -> None:
        warnings.filterwarnings("ignore")
        import torch
        from speechbrain.inference.speaker import EncoderClassifier

        if torch_threads:
            torch.set_num_threads(torch_threads)
        self._enc = EncoderClassifier.from_hparams(source=SOURCE, run_opts={"device": "cpu"})

    def _embed_batch(self, windows: list[F32]) -> npt.NDArray[np.float32]:
        import torch

        n = max(w.size for w in windows)
        batch = np.zeros((len(windows), n), dtype=np.float32)
        lens = np.zeros(len(windows), dtype=np.float32)
        for i, w in enumerate(windows):
            batch[i, : w.size] = w
            lens[i] = w.size / n
        with torch.inference_mode():
            emb = self._enc.encode_batch(torch.from_numpy(batch), torch.from_numpy(lens))
        return np.asarray(emb.squeeze(1).numpy(), dtype=np.float32)

    def embed(self, audio: F32, sr: int) -> npt.NDArray[np.float32]:
        if sr != 16000:
            raise ValueError("ECAPA expects 16 kHz audio")
        if audio.size < int(0.3 * sr):  # too short: pad by repetition so the model sees speech
            reps = int(np.ceil(0.3 * sr / max(1, audio.size)))
            audio = np.tile(audio, reps)[: int(0.3 * sr)]
        win, hop = int(self.window_s * sr), int(self.hop_s * sr)
        if audio.size > 2 * win:  # long line: average embeddings of 1.5 s windows, 0.75 s hop
            windows = [audio[i : i + win] for i in range(0, audio.size - win + 1, hop)]
        else:
            windows = [audio]
        emb = self._embed_batch(windows).mean(axis=0)
        return np.asarray(emb / (np.linalg.norm(emb) + 1e-9), dtype=np.float32)


def create(**kwargs: Any) -> EcapaSpeaker:
    return EcapaSpeaker(**kwargs)
