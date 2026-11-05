"""Generate the synthetic match clip + exact ground truth (docs/09 §9.1).

Outputs (for --name synthetic_match):
  data/clips/synthetic_match.mp4         1280x720 test pattern, burned-in clock + speaker letter
  data/clips/synthetic_match.truth.json  every line: speaker, text, emotion, t_start, t_end
  data/clips/synthetic_match.vtt         captions sidecar (for `--source captions` testing)
  config/enroll.synthetic.yaml           first ~8 s of each speaker's speech (enrollment)

Source commentators use Kokoro voices that are NOT in config/voices.yaml, so speaker ID is never
tested on the same voices the engine generates. Emotion is shaped into the source (speed, level,
pitch) so the prosody stage has real variation to detect. Crowd bed: generated brown noise with
swells and roar bursts after `peak` lines (or a user-supplied CC0 file in data/sfx/crowd*.wav).
"""

from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.audio import (  # noqa: E402
    F32,
    as_f32,
    db_to_gain,
    resample,
    rms,
    rms_db,
    soft_limit,
    trim_silence,
)
from engine.config import load_voice_catalog  # noqa: E402
from engine.providers.base import DeliveryStyle  # noqa: E402

SR = 24000  # Kokoro native
OUT_SR = 48000
SOURCE_VOICES = {"A": "am_fenrir", "B": "bf_isabella", "C": "bm_fable"}
# (speed, gain_db, pitch_semitones) shaping of the *source* commentary per emotion.
SOURCE_STYLE = {
    "calm": (0.92, -3.0, -0.5),
    "neutral": (1.00, 0.0, 0.0),
    "excited": (1.10, 4.0, 1.0),
    "peak": (1.18, 9.0, 2.5),
}
SPEECH_RMS_DB = -21.0
BED_RMS_DB = -28.0
PLAYERS = ["Okafor", "Lindqvist", "Moreau", "Tanaka", "Delgado", "Brennan"]


def load_script(path: Path) -> dict[str, Any]:
    data: dict[str, Any] = yaml.safe_load(path.read_text())
    for i, ln in enumerate(data["lines"]):
        if ln["speaker"] not in SOURCE_VOICES or ln["emotion"] not in SOURCE_STYLE:
            raise ValueError(f"bad line {i}: {ln}")
    return data


def expand_lines(script: dict[str, Any], target_s: float | None, seed: int) -> list[dict[str, Any]]:
    """One pass of the script, or loop it with variations until `target_s` of audio."""
    base = list(script["lines"])
    if not target_s:
        return [dict(x) for x in base]
    rng = random.Random(seed)
    out: list[dict[str, Any]] = []
    loop = 0
    est = 0.0
    while est < target_s:
        rot = PLAYERS[loop % len(PLAYERS) :] + PLAYERS[: loop % len(PLAYERS)]
        mapping = dict(zip(PLAYERS, rot, strict=True))
        for ln in base:
            text = ln["text"]
            if loop:
                for a, b in mapping.items():
                    text = text.replace(a, f"\0{b}\0")
                text = text.replace("\0", "")
            gap = int(ln["gap_after_ms"])
            if loop and gap > 0:
                gap = max(150, gap + rng.randint(-150, 150))
            out.append({**ln, "text": text, "gap_after_ms": gap})
            est += len(text.split()) / 2.6 + gap / 1000
        loop += 1
    return out


def make_bed(n: int, sr: int, rng: np.random.Generator) -> F32:
    white = rng.standard_normal(n).astype(np.float64)
    brown = np.cumsum(white)
    # remove drift (leaky integrator ~ high-pass at ~20 Hz)
    from scipy.signal import butter, sosfilt

    brown = sosfilt(butter(2, 20, "highpass", fs=sr, output="sos"), brown)
    pink_ish = sosfilt(butter(2, [150, 4000], "bandpass", fs=sr, output="sos"), white) * 0.6
    bed = brown / (np.std(brown) + 1e-9) + pink_ish / (np.std(pink_ish) + 1e-9) * 0.5
    # slow swells: smoothed random envelope between 0.6x and 1.5x
    k = max(1, int(sr * 4))
    env = np.repeat(rng.uniform(0.6, 1.5, n // k + 2), k)[:n]
    env = np.convolve(env, np.ones(k) / k, mode="same")
    bed = bed * env
    return as_f32(bed / (rms(as_f32(bed)) + 1e-9) * db_to_gain(BED_RMS_DB))


def make_roar(seconds: float, sr: int, rng: np.random.Generator) -> F32:
    from scipy.signal import butter, sosfilt

    n = int(seconds * sr)
    noise = rng.standard_normal(n)
    roar = sosfilt(butter(4, [250, 3500], "bandpass", fs=sr, output="sos"), noise)
    t = np.arange(n) / sr
    env = np.minimum(1.0, t / 0.35) * np.exp(-np.maximum(0, t - 0.6) / (seconds * 0.45))
    roar = roar * env
    return as_f32(roar / (rms(as_f32(roar)) + 1e-9) * db_to_gain(BED_RMS_DB + 10))


def load_user_bed(n: int, sr: int) -> F32 | None:
    files = sorted((ROOT / "data" / "sfx").glob("crowd*.wav"))
    if not files:
        return None
    audio, file_sr = sf.read(files[0], dtype="float32", always_2d=True)
    mono = resample(as_f32(audio.mean(axis=1)), int(file_sr), sr)
    reps = int(np.ceil(n / max(1, mono.size)))
    bed = np.tile(mono, reps)[:n]
    print(f"using crowd bed from {files[0].name}")
    return as_f32(bed / (rms(bed) + 1e-9) * db_to_gain(BED_RMS_DB))


_CACHE: dict[tuple[str, str, str], F32] = {}
_TTS: list[Any] = []


def synth_lines(lines: list[dict[str, Any]]) -> list[F32]:
    from engine.providers.free.tts_kokoro import KokoroTTS

    if not _TTS:
        _TTS.append(KokoroTTS(lang_codes=tuple(sorted({v[0] for v in SOURCE_VOICES.values()}))))
    tts = _TTS[0]
    cache = _CACHE
    out: list[F32] = []
    t0 = time.monotonic()
    for i, ln in enumerate(lines):
        key = (ln["text"], ln["speaker"], ln["emotion"])
        if key not in cache:
            speed, gain_db, pitch = SOURCE_STYLE[ln["emotion"]]
            res = tts.synthesize(
                ln["text"], SOURCE_VOICES[ln["speaker"]], DeliveryStyle(speed=speed)
            )
            audio = trim_silence(res.audio, SR, threshold_db=-40.0)
            if pitch:
                import librosa

                audio = as_f32(librosa.effects.pitch_shift(audio, sr=SR, n_steps=pitch))
            audio = audio / (rms(audio) + 1e-9) * db_to_gain(SPEECH_RMS_DB + gain_db)
            cache[key] = as_f32(audio)
        out.append(cache[key])
        if (i + 1) % 25 == 0:
            print(f"  synthesized {i + 1}/{len(lines)} lines ({time.monotonic() - t0:.0f} s)")
    return out


def ass_time(t: float) -> str:
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def write_ass(path: Path, truth: list[dict[str, Any]]) -> None:
    head = (
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour,"
        " Bold, Alignment, MarginL, MarginR, MarginV, BorderStyle, Outline, Shadow\n"
        "Style: Spk,DejaVu Sans,120,&H00FFFFFF,&H00000000,&H80000000,1,9,40,60,40,1,6,0\n"
        "Style: Txt,DejaVu Sans,30,&H00FFFFFF,&H00000000,&H80000000,0,2,60,60,40,3,2,0\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Text\n"
    )
    rows = []
    for ln in truth:
        a, b = ass_time(ln["t_start"]), ass_time(ln["t_end"])
        rows.append(f"Dialogue: 0,{a},{b},Spk,{ln['speaker']}")
        txt = ln["text"].replace("\n", " ")
        rows.append(f"Dialogue: 0,{a},{b},Txt,[{ln['speaker']} · {ln['emotion']}] {txt}")
    path.write_text(head + "\n".join(rows) + "\n", encoding="utf-8")


def vtt_time(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def write_vtt(path: Path, truth: list[dict[str, Any]]) -> None:
    rows = ["WEBVTT", ""]
    for ln in truth:
        rows += [f"{vtt_time(ln['t_start'])} --> {vtt_time(ln['t_end'])}", ln["text"], ""]
    path.write_text("\n".join(rows), encoding="utf-8")


def enroll_spans(truth: list[dict[str, Any]], need_s: float = 8.0) -> dict[str, Any]:
    """First ≈8 s of each speaker's solo speech (lines that overlap nobody else)."""
    speakers: dict[str, list[list[float]]] = {}
    total: dict[str, float] = {}
    for i, ln in enumerate(truth):
        spk = ln["speaker"]
        if total.get(spk, 0.0) >= need_s:
            continue
        others = [o for j, o in enumerate(truth) if j != i and o["speaker"] != spk]
        a, b = ln["t_start"], ln["t_end"]
        if any(o["t_start"] < b and o["t_end"] > a for o in others):
            continue
        speakers.setdefault(spk, []).append([round(a, 3), round(b, 3)])
        total[spk] = total.get(spk, 0.0) + (b - a)
    return {
        "speakers": [
            {"name": f"Commentator {spk}", "truth_speaker": spk, "spans": spans}
            for spk, spans in sorted(speakers.items())
        ]
    }


def render_video(audio_wav: Path, ass: Path, duration: float, out: Path) -> None:
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
    clock = (
        f"drawtext=fontfile={font}:text='%{{pts\\:hms}}':x=40:y=40:fontsize=44:"
        "fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=12"
    )
    vf = f"{clock},subtitles={ass.as_posix()}"
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        f"testsrc2=size=1280x720:rate=25:duration={duration:.3f}",
        "-i",
        str(audio_wav),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-ar",
        str(OUT_SR),
        "-shortest",
        "-movflags",
        "+faststart",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def build(args: argparse.Namespace) -> dict[str, Any]:
    t_begin = time.monotonic()
    script = load_script(Path(args.script))
    catalog_ids = {v.voice_id for v in load_voice_catalog().voices}
    clash = catalog_ids & set(SOURCE_VOICES.values())
    if clash:
        raise SystemExit(f"source voices must not be output voices: {clash}")

    target = args.minutes * 60 if args.minutes else None
    est_target = target
    while True:
        lines = expand_lines(script, est_target, args.seed)
        print(f"{len(lines)} lines → synthesizing source commentary with Kokoro")
        audios = synth_lines(lines)
        actual = sum(a.size / SR for a in audios) + sum(ln["gap_after_ms"] for ln in lines) / 1000
        if target is None or est_target is None or actual >= target:
            break
        est_target *= target / actual * 1.03  # the words/s estimate was off; measure and extend
        print(f"  measured {actual:.0f} s < target {target:.0f} s → extending")

    # place on the timeline
    t = script.get("lead_in_ms", 1500) / 1000
    truth: list[dict[str, Any]] = []
    for i, (ln, audio) in enumerate(zip(lines, audios, strict=True)):
        dur = audio.size / SR
        truth.append(
            {
                "line_id": f"T{i + 1:04d}",
                "speaker": ln["speaker"],
                "text": ln["text"],
                "emotion": ln["emotion"],
                "t_start": round(t, 3),
                "t_end": round(t + dur, 3),
            }
        )
        t = max(t + 0.05, t + dur + ln["gap_after_ms"] / 1000)
    duration = truth[-1]["t_end"] + script.get("tail_ms", 2500) / 1000
    n = int(np.ceil(duration * SR))

    rng = np.random.default_rng(args.seed)
    speech = np.zeros(n, dtype=np.float32)
    for ln, audio in zip(truth, audios, strict=True):
        a = round(ln["t_start"] * SR)
        speech[a : a + audio.size] += audio[: n - a]
    bed = load_user_bed(n, SR)
    if bed is None:
        bed = make_bed(n, SR, rng)
    for ln in truth:
        if ln["emotion"] == "peak":
            roar = make_roar(float(rng.uniform(2.0, 4.0)), SR, rng)
            a = int(ln["t_end"] * SR)
            bed[a : a + roar.size] += roar[: max(0, n - a)]
    mix = soft_limit(speech + bed, ceiling_db=-1.0)
    mix48 = resample(mix, SR, OUT_SR)

    clips = ROOT / "data" / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    name = args.name
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "mix.wav"
        sf.write(wav, mix48, OUT_SR, subtype="PCM_16")
        ass = Path(tmp) / "speakers.ass"
        write_ass(ass, truth)
        render_video(wav, ass, duration, clips / f"{name}.mp4")

    meta = {
        "clip": f"data/clips/{name}.mp4",
        "script": str(Path(args.script)),
        "duration": round(duration, 3),
        "sample_rate": OUT_SR,
        "source_voices": {
            k: v for k, v in SOURCE_VOICES.items() if any(x["speaker"] == k for x in truth)
        },
        "source_style": SOURCE_STYLE,
        "speech_rms_db": SPEECH_RMS_DB,
        "bed_rms_db": BED_RMS_DB,
        "seed": args.seed,
        "speech_level_db": rms_db(speech[speech != 0]) if np.any(speech) else -100.0,
        "lines": truth,
    }
    (clips / f"{name}.truth.json").write_text(json.dumps(meta, indent=2))
    write_vtt(clips / f"{name}.vtt", truth)
    enroll_name = args.enroll_name or name.replace("synthetic_match", "synthetic")
    enroll_path = ROOT / "config" / f"enroll.{enroll_name}.yaml"
    enroll_path.write_text(
        "# Generated by scripts/make_synthetic_clip.py — enrollment spans for "
        f"data/clips/{name}.mp4\n" + yaml.safe_dump(enroll_spans(truth), sort_keys=False)
    )
    print(
        f"wrote data/clips/{name}.mp4 ({duration:.1f} s, {len(truth)} lines), truth, vtt, "
        f"{enroll_path.relative_to(ROOT)} in {time.monotonic() - t_begin:.0f} s"
    )
    return meta


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--script", default=str(ROOT / "data/scripts/synthetic_match.yaml"))
    p.add_argument("--name", default="synthetic_match")
    p.add_argument("--enroll-name", default=None, help="config/enroll.<name>.yaml")
    p.add_argument("--minutes", type=float, default=0.0, help="loop the script to this length")
    p.add_argument("--seed", type=int, default=7)
    build(p.parse_args())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
