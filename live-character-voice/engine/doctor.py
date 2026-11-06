"""`make doctor`: one screen that says what works and what to fix (safe to share: keys masked)."""

from __future__ import annotations

import importlib.util
import os
import shutil
import socket
import sys

from engine.config import PROJECT_ROOT

OK, BAD = "  OK ", "  !! "


def _mask(v: str) -> str:
    return f"{v[:8]}…{v[-4:]} ({len(v)} chars)" if len(v) > 14 else "(too short — pasted wrong?)"


def main() -> int:
    from engine.env import load_env

    load_env()
    problems = 0
    print(f"\nApp folder: {PROJECT_ROOT}")
    print(f"Python: {sys.version.split()[0]} ({sys.executable})")
    print("\nPython packages:")
    for mod in (
        "msgpack",
        "requests",
        "fastapi",
        "multipart",
        "silero_vad",
        "kokoro",
        "speechbrain",
    ):
        found = importlib.util.find_spec(mod) is not None
        problems += not found
        print(f"{OK if found else BAD}{mod}" + ("" if found else "  → run: make setup-python"))
    print("\nTools:")
    for tool in ("ffmpeg", "node"):
        found = shutil.which(tool) is not None
        problems += not found
        print(f"{OK if found else BAD}{tool}" + ("" if found else "  → run: brew install " + tool))
    dist = (PROJECT_ROOT / "web" / "dist" / "index.html").exists()
    print(f"{OK if dist else BAD}web app built" + ("" if dist else "  → run: make setup-web"))
    env = PROJECT_ROOT / ".env"
    print(f"\nKeys file: {env} — {'found' if env.exists() else 'MISSING → run: make keys'}")
    for k in ("FISH_API_KEY", "GROQ_API_KEY"):
        v = os.environ.get(k, "").strip()
        print(f"{OK if v else BAD}{k} = {_mask(v) if v else 'not set → run: make keys'}")
    from engine.keycheck import check_fish, check_groq

    print("\nLive key test:")
    for st in (check_fish(), check_groq()):
        problems += not st.ok
        print(f"{OK if st.ok else BAD}{st.name}: {st.message}")
    with socket.socket() as s:
        busy = s.connect_ex(("127.0.0.1", 8000)) == 0
    print(f"\nPort 8000: {'in use (the app is probably running already)' if busy else 'free'}")
    print("\n" + ("Everything looks good. Start with: make serve" if problems == 0
                  else f"{problems} problem(s) above — fix the lines marked !!"))  # fmt: skip
    return 0 if problems == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
