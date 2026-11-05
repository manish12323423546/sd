"""Pre-download every model the engine uses into ~/.cache (docs/06 §6.3, docs/10 M1).

Prints size + licence for each and lists the Kokoro voices that are actually available, writing
`outputs/models.json` so other scripts (and the voice catalog check) can read it.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MODELS: list[dict[str, Any]] = [
    {"repo": "Systran/faster-whisper-small.en", "licence": "MIT", "use": "ASR (primary)"},
    {"repo": "Systran/faster-whisper-base.en", "licence": "MIT", "use": "ASR (fallback)"},
    {"repo": "speechbrain/spkrec-ecapa-voxceleb", "licence": "Apache-2.0", "use": "Speaker ID"},
    {
        "repo": "hexgrad/Kokoro-82M",
        "licence": "Apache-2.0",
        "use": "TTS",
        "allow": ["config.json", "kokoro-v1_0.pth", "voices/*.pt", "README.md"],
    },
]


def _size_mb(path: Path) -> float:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) / 1e6


def _ensure_spacy_model() -> str:
    """misaki (Kokoro's G2P) needs spaCy's small English model."""
    try:
        import en_core_web_sm  # noqa: F401

        return "already installed"
    except ImportError:
        pass
    import subprocess

    rc = subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"]).returncode
    return "installed" if rc == 0 else f"FAILED (rc={rc}) — github.com must be reachable"


def main() -> int:
    from huggingface_hub import snapshot_download

    results: list[dict[str, Any]] = []
    for m in MODELS:
        t0 = time.monotonic()
        try:
            path = Path(snapshot_download(m["repo"], allow_patterns=m.get("allow")))
        except Exception as e:
            print(f"[FAIL] {m['repo']}: {e}")
            print("Model download failed. If this is a network block, add to the environment's")
            print("Custom network list: huggingface.co, *.huggingface.co, *.hf.co")
            return 1
        entry = {
            **{k: v for k, v in m.items() if k != "allow"},
            "path": str(path),
            "size_mb": round(_size_mb(path), 1),
            "seconds": round(time.monotonic() - t0, 1),
        }
        results.append(entry)
        print(f"[OK] {m['repo']:<36} {entry['size_mb']:>8.1f} MB  {m['licence']:<10} {m['use']}")

    kokoro = next(r for r in results if r["repo"] == "hexgrad/Kokoro-82M")
    voices = sorted(p.stem for p in (Path(kokoro["path"]) / "voices").glob("*.pt"))
    print(f"\nKokoro voices available ({len(voices)}): {', '.join(voices)}")

    from engine.config import load_voice_catalog

    catalog = load_voice_catalog()
    missing = [v.voice_id for v in catalog.voices if v.voice_id not in voices]
    print("Catalog voices present:", "all" if not missing else f"MISSING {missing}")

    spacy_state = _ensure_spacy_model()
    print(f"spaCy en_core_web_sm: {spacy_state}")

    out = ROOT / "outputs" / "models.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "models": results,
                "kokoro_voices": voices,
                "catalog_missing": missing,
                "spacy_en_core_web_sm": spacy_state,
            },
            indent=2,
        )
    )
    print(f"wrote {out}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
