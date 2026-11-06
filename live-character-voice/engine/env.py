"""Load API keys from a local `.env` file (git-ignored) into the environment.

Format: one KEY=value per line, e.g.
    FISH_API_KEY=sk-fish-...
    GROQ_API_KEY=gsk_...
Values already set in the environment win. Nothing is printed or logged.
"""

from __future__ import annotations

import os
from pathlib import Path

from engine.config import PROJECT_ROOT


def load_env(path: Path | None = None) -> list[str]:
    path = path or PROJECT_ROOT / ".env"
    loaded: list[str] = []
    if not path.exists():
        return loaded
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value
            loaded.append(key)
    return loaded


def save_env(key: str, value: str, path: Path | None = None) -> Path:
    """Write/replace KEY=value in the git-ignored `.env` (chmod 600) and set it for this process."""
    path = path or PROJECT_ROOT / ".env"
    lines = path.read_text().splitlines() if path.exists() else []
    lines = [ln for ln in lines if not ln.strip().startswith(f"{key}=")]
    lines.append(f"{key}={value}")
    path.write_text("\n".join(lines) + "\n")
    path.chmod(0o600)
    os.environ[key] = value
    return path
