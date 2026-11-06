"""Promo soundtrack: original synthesized music + narration + the real before/after demo.

Everything here is generated or produced by the app itself — no third-party music or footage:
  * music: synthesized below (pad chords, bass, soft drums), ducked under speech
  * narration: the app's own voice endpoint (built-in character "Coach")
  * demo: original commentary from the synthetic test match (63.5–68.8 s), then the same moment
    re-voiced by the "Hype Host" character over the ducked original (how the app plays it)
Usage: python promo/mix.py <audio dir with vo1..vo7.wav demo_hype.wav> <out.wav>
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
DUR = 50.0
ROOT = Path(__file__).resolve().parent.parent


def load(path: Path) -> np.ndarray:
    a, sr = sf.read(path, dtype="float32", always_2d=True)
    a = a.mean(axis=1)
    if sr != SR:
        a = resample_poly(a, SR, sr).astype(np.float32)
    return a


def place(track: np.ndarray, clip: np.ndarray, t: float, gain_db: float = 0.0) -> None:
    i = int(t * SR)
    n = min(len(clip), len(track) - i)
    track[i : i + n] += clip[:n] * 10 ** (gain_db / 20)


def env(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))


def music() -> np.ndarray:
    n = int(DUR * SR)
    out = np.zeros(n, np.float32)
    t = np.arange(n) / SR
    bar = 2.4  # 100 bpm, 4 beats
    chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]  # Am F C G
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)  # noqa: E731
    lp = butter(2, 1400, "low", fs=SR, output="sos")
    pad = np.zeros(n, np.float32)
    bass = np.zeros(n, np.float32)
    for k in range(int(DUR / bar) + 1):
        ch = chords[k % 4]
        a, b = int(k * bar * SR), min(n, int((k + 1) * bar * SR) + int(0.4 * SR))
        if a >= n:
            break
        seg = t[a:b] - k * bar
        e = np.minimum(1, seg / 0.35) * np.minimum(1, np.maximum(0, (bar + 0.4 - seg) / 0.4))
        for m in ch:
            for det in (-0.06, 0.06):
                f = hz(m) * 2 ** (det / 12)
                pad[a:b] += (0.5 * np.sin(2 * np.pi * f * seg) + 0.25 * np.sin(4 * np.pi * f * seg)) * e
        f0 = hz(ch[0] - 24)
        for beat in range(4):
            s = a + int(beat * bar / 4 * SR)
            ln = min(int(0.5 * SR), n - s)
            if ln > 0:
                bass[s : s + ln] += np.sin(2 * np.pi * f0 * np.arange(ln) / SR) * env(ln, 0.01, 0.25)
    out += sosfilt(lp, pad).astype(np.float32) * 0.05 + bass * 0.18
    # drums from 6 s (kick on beats, hat on off-beats), lighter during the demo
    rng = np.random.default_rng(7)
    hp = butter(2, 7000, "high", fs=SR, output="sos")
    for i in range(int(DUR / (bar / 4))):
        tb = i * bar / 4
        if tb < 6.0 or tb > DUR - 1.5:
            continue
        g = 0.35 if 12.0 <= tb < 29.0 else 1.0
        s = int(tb * SR)
        ln = int(0.3 * SR)
        if s + ln < n:
            kt = np.arange(ln) / SR
            out[s : s + ln] += np.sin(2 * np.pi * (50 + 90 * np.exp(-kt * 35)) * kt) * env(ln, 0.002, 0.09) * 0.5 * g
        s2 = int((tb + bar / 8) * SR)
        ln2 = int(0.06 * SR)
        if s2 + ln2 < n:
            out[s2 : s2 + ln2] += sosfilt(hp, rng.standard_normal(ln2)) * env(ln2, 0.001, 0.02) * 0.12 * g
    # whooshes at scene changes
    for tw in (6.0, 12.0, 29.0, 35.0, 40.0, 44.6):
        ln = int(0.9 * SR)
        s = int((tw - 0.55) * SR)
        noise = rng.standard_normal(ln)
        bp = butter(2, [400, 5000], "band", fs=SR, output="sos")
        w = sosfilt(bp, noise) * np.sin(np.linspace(0, np.pi, ln)) ** 2 * 0.09
        out[s : s + ln] += w.astype(np.float32)
    fade = np.minimum(1, t / 1.0) * np.minimum(1, np.maximum(0, (DUR - t) / 1.5))
    return out * fade


def main() -> int:
    adir, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    n = int(DUR * SR)
    speech = np.zeros(n, np.float32)
    place(speech, load(adir / "vo1.wav"), 0.8)
    place(speech, load(adir / "vo2.wav"), 2.6)
    place(speech, load(adir / "vo3.wav"), 6.4)
    place(speech, load(adir / "vo4.wav"), 12.3)
    place(speech, load(adir / "vo5.wav"), 29.4)
    place(speech, load(adir / "vo6.wav"), 35.4)
    place(speech, load(adir / "vo7_1.wav"), 45.3)
    # demo: original 63.5–68.8 s of the test match, then the re-voiced moment over the ducked original
    from engine.ingest.decode import decode_audio

    match = decode_audio(ROOT / "data/clips/synthetic_match.mp4", sr=SR)
    orig = match[int(63.5 * SR) : int(68.8 * SR)].copy()
    orig *= np.minimum(1, np.minimum(np.arange(len(orig)), len(orig) - np.arange(len(orig))) / (0.08 * SR))
    demo = np.zeros(n, np.float32)
    place(demo, orig, 16.9, -8.0)
    place(demo, orig, 22.5, -20.0)  # the app keeps the original (ducked) under the new voice
    place(demo, load(adir / "demo_hype.wav"), 22.6, -2.0)
    # duck the music under speech and the demo
    lvl = np.abs(speech) + np.abs(demo)
    k = int(0.25 * SR)
    sm = np.convolve(lvl, np.ones(k) / k, mode="same")
    duck = 1.0 / (1.0 + 18 * sm)
    m = music() * duck * 10 ** (-7 / 20)
    mix = speech * 0.95 + demo * 0.95 + m
    mix /= max(1e-6, float(np.abs(mix).max())) / 0.89  # peak −1 dB
    sf.write(out_path, np.stack([mix, mix], axis=1), SR, subtype="PCM_16")
    print(f"wrote {out_path} ({DUR} s)")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT))
    raise SystemExit(main())
