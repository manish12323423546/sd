"""Offline renderer (docs/04 §9a): numpy mixing at 48 kHz + FFmpeg mux.

demo_live.mp4    original video; original audio ducked to duck_gain while a voice plays (ramps);
                 voices placed at their measured live `play_at` positions.
demo_synced.mp4  "synced mode" preview: video + original delayed by D, each voice at t_start + D.
                 D = p95 of (tts_ready − t_start): the smallest delay at which 95 % of lines would
                 have been ready in time if the product held the picture back by D.
voices_only.wav  just the generated voices on the timeline.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from engine.audio import F32, as_f32, db_to_gain, resample, rms_db, soft_limit
from engine.config import EngineConfig
from engine.ingest.decode import decode_audio
from engine.record.models import Line, SessionRecord
from engine.render.mux import mux

RELEASE_S = 0.15  # ducking holds 150 ms after a line ends (docs/07 §7.4)


@dataclass
class Placement:
    line_id: str
    start: float  # seconds on the output timeline
    audio: F32  # at out_sr


def duck_envelope(
    n: int, sr: int, intervals: list[tuple[float, float]], duck_gain: float, ramp_ms: float
) -> F32:
    """Gain curve: 1.0 normally, `duck_gain` inside voice intervals (+150 ms release), with linear
    ramps of `ramp_ms` that START at the interval edges (duck reached ramp_ms after a voice starts,
    full level ramp_ms after the release)."""
    mask = np.zeros(n, dtype=np.float32)
    for a, b in intervals:
        i0, i1 = max(0, int(a * sr)), min(n, int((b + RELEASE_S) * sr))
        if i1 > i0:
            mask[i0:i1] = 1.0
    ramp = max(1, int(ramp_ms / 1000 * sr))
    # causal moving average = linear ramp that begins at each edge
    kernel = np.ones(ramp, dtype=np.float32) / ramp
    smooth = np.convolve(mask, kernel, mode="full")[:n]
    return as_f32(1.0 - (1.0 - duck_gain) * np.clip(smooth, 0.0, 1.0))


def _load_tts(path: str, out_sr: int) -> F32:
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return resample(as_f32(audio), int(sr), out_sr)


def placements(rec: SessionRecord, out_sr: int, mode: str, delay_d: float = 0.0) -> list[Placement]:
    out: list[Placement] = []
    prev_end: dict[str, float] = {}
    for ln in rec.lines:
        if not ln.tts_path or ln.times.play_at is None or ln.schedule_action == "dropped":
            continue
        if not Path(ln.tts_path).exists():
            continue
        audio = _load_tts(ln.tts_path, out_sr)
        if mode == "live":
            start = ln.times.play_at
        else:  # synced: original timing shifted by D; never overlap the same speaker
            start = ln.t_start + delay_d
            spk = ln.speaker_id or "?"
            start = max(start, prev_end.get(spk, 0.0) + 0.05)
            prev_end[spk] = start + audio.size / out_sr
        out.append(Placement(ln.line_id, start, audio))
    return out


def mix(
    original: F32, sr: int, voices: list[Placement], cfg: EngineConfig, offset: float = 0.0
) -> tuple[F32, F32, dict[str, float]]:
    """Returns (mix, voices_track, duck stats). `offset` delays the original (synced mode)."""
    off = int(offset * sr)
    end = max([off + original.size] + [int(p.start * sr) + p.audio.size for p in voices])
    orig = np.zeros(end, dtype=np.float32)
    orig[off : off + original.size] = original
    track = np.zeros(end, dtype=np.float32)
    intervals = []
    g = db_to_gain(cfg.render.voice_gain_db)
    for p in voices:
        a = int(p.start * sr)
        track[a : a + p.audio.size] += p.audio * g
        intervals.append((p.start, p.start + p.audio.size / sr))
    env = duck_envelope(end, sr, intervals, cfg.render.duck_gain, cfg.render.duck_ramp_ms)
    ducked = orig * env
    out = soft_limit(ducked + track, -1.0)
    # ducking verification: level change of the original inside vs outside voice lines
    inside = np.zeros(end, dtype=bool)
    for s0, s1 in intervals:
        # measure only the settled part (after the ramp, before the release)
        inside[int((s0 + 0.1) * sr) : int(s1 * sr)] = True
    outside = np.ones(end, dtype=bool)
    for s0, s1 in intervals:
        outside[max(0, int((s0 - 0.2) * sr)) : int((s1 + 0.5) * sr)] = False
    outside[:off] = False
    stats: dict[str, float] = {}
    if inside.any() and outside.any():
        change_in = rms_db(ducked[inside]) - rms_db(orig[inside])
        change_out = rms_db(ducked[outside]) - rms_db(orig[outside])
        stats = {
            "orig_change_inside_db": round(change_in, 2),
            "orig_change_outside_db": round(change_out, 2),
            "duck_depth_db": round(change_out - change_in, 2),
            "mix_peak_dbfs": round(20 * float(np.log10(np.max(np.abs(out)) + 1e-12)), 2),
        }
    return out, track, stats


def p95_ready_from_start(lines: list[Line]) -> float:
    vals = [
        ln.times.tts_ready - ln.t_start
        for ln in lines
        if ln.times.tts_ready is not None and ln.schedule_action != "dropped"
    ]
    return float(np.percentile(vals, 95)) if vals else 0.0


def render_all(
    rec: SessionRecord, clip: Path, out_dir: Path, cfg: EngineConfig, separate: bool = False
) -> dict[str, Any]:
    sr = cfg.render.out_sr
    original = decode_audio(clip, sr)
    stats: dict[str, Any] = {}

    live_voices = placements(rec, sr, "live")
    live_mix, live_track, stats["live"] = mix(original, sr, live_voices, cfg)
    sf.write(out_dir / "voices_only.wav", soft_limit(live_track, -1.0), sr, subtype="PCM_16")
    wav = out_dir / "_mix_live.wav"
    sf.write(wav, live_mix, sr, subtype="PCM_16")
    stats["demo_live"] = mux(clip, wav, out_dir / "demo_live.mp4")
    wav.unlink()

    d = round(p95_ready_from_start(rec.lines), 2)
    synced_voices = placements(rec, sr, "synced", d)
    synced_mix, _, stats["synced"] = mix(original, sr, synced_voices, cfg, offset=d)
    wav = out_dir / "_mix_synced.wav"
    sf.write(wav, synced_mix, sr, subtype="PCM_16")
    stats["demo_synced"] = mux(clip, wav, out_dir / "demo_synced.mp4", video_delay=d)
    wav.unlink()
    stats["synced_delay_D_s"] = d
    stats["voices_placed"] = len(live_voices)

    if separate:
        stats["separate"] = render_separated(rec, clip, out_dir, cfg, original, live_voices)
    (out_dir / "render.json").write_text(json.dumps(stats, indent=2))
    return stats


def render_separated(
    rec: SessionRecord,
    clip: Path,
    out_dir: Path,
    cfg: EngineConfig,
    original: F32,
    voices: list[Placement],
) -> dict[str, Any]:
    """Optional, offline only: Demucs 'no vocals' stem instead of ducking → demo_live_clean.mp4."""
    try:
        import torch
        from demucs.apply import apply_model
        from demucs.pretrained import get_model
    except ImportError:
        return {"skipped": "demucs not installed (pip install demucs); not part of the live path"}
    sr = cfg.render.out_sr
    model = get_model("htdemucs")
    stereo = resample(original, sr, model.samplerate)
    wav = torch.from_numpy(np.stack([stereo, stereo]))[None]
    with torch.inference_mode():
        sources = apply_model(model, wav, device="cpu", progress=False)[0]
    vocals_idx = model.sources.index("vocals")
    rest = sum(sources[i] for i in range(len(model.sources)) if i != vocals_idx)
    bed = resample(as_f32(rest.mean(0).numpy()), model.samplerate, sr)
    end = max([bed.size] + [int(p.start * sr) + p.audio.size for p in voices])
    out = np.zeros(end, dtype=np.float32)
    out[: bed.size] += bed
    for p in voices:
        a = int(p.start * sr)
        out[a : a + p.audio.size] += p.audio
    path = out_dir / "_mix_clean.wav"
    sf.write(path, soft_limit(out, -1.0), sr, subtype="PCM_16")
    res = mux(clip, path, out_dir / "demo_live_clean.mp4")
    path.unlink()
    return res
