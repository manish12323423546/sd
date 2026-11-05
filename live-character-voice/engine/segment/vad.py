"""Streaming Silero VAD wrapper (MIT; the ONNX model ships inside the pip package).

Speech probability per 512-sample frame (32 ms at 16 kHz). Keeps the recurrent state between calls
and buffers leftover samples, so it can be fed 0.5 s chunks that are not frame-aligned.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from engine.audio import F32

FRAME = 512
SR = 16000


class StreamingVAD:
    def __init__(self) -> None:
        import torch
        from silero_vad import load_silero_vad

        self._torch = torch
        self._model: Any = load_silero_vad(onnx=True)
        self._buf = np.zeros(0, dtype=np.float32)

    def reset(self) -> None:
        self._model.reset_states()
        self._buf = np.zeros(0, dtype=np.float32)

    def process(self, samples: F32) -> tuple[F32, F32]:
        """Returns (probs, frames) for every complete frame now available.
        `frames` has shape (n, 512) so the segmenter can compute energy per frame."""
        buf = np.concatenate([self._buf, samples.astype(np.float32)])
        n = buf.size // FRAME
        frames = buf[: n * FRAME].reshape(n, FRAME) if n else np.zeros((0, FRAME), np.float32)
        self._buf = buf[n * FRAME :]
        probs = np.empty(n, dtype=np.float32)
        for i in range(n):
            probs[i] = float(self._model(self._torch.from_numpy(frames[i].copy()), SR).item())
        return probs, frames
