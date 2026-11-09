"""Check the free hosted API keys (Fish Audio, Groq) with one tiny request each.

`python -m engine.keycheck` prints a plain-language status. The server runs the same check at
startup, so a wrong or missing key is shown on the home page instead of failing silently.
Keys are never printed.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from engine.config import PROJECT_ROOT

FISH_URL = "https://api.fish.audio/v1/tts"
GROQ_URL = "https://api.groq.com/openai/v1/models"
DEEPGRAM_URL = "https://api.deepgram.com/v1/projects"
DEEPGRAM_KEYS_PAGE = "https://console.deepgram.com/signup"
FISH_KEYS_PAGE = "https://fish.audio/app/api-keys"
GROQ_KEYS_PAGE = "https://console.groq.com/keys"


@dataclass
class KeyStatus:
    name: str  # "fish" | "groq" | "deepgram"
    present: bool
    ok: bool
    message: str


def _explain(code: int, page: str) -> str:
    if code in (401, 403):
        return f"the key was rejected (HTTP {code}) — make a new one at {page}"
    if code == 402:
        return "the account has no free credit left (HTTP 402)"
    if code == 429:
        return "rate limited right now (HTTP 429) — it will still be used and retried"
    return f"unexpected answer HTTP {code}"


def check_fish(timeout_s: float = 15.0) -> KeyStatus:
    key = os.environ.get("FISH_API_KEY", "").strip()
    if not key and os.environ.get("FISH_API_KEY_FILE"):
        try:
            with open(os.environ["FISH_API_KEY_FILE"]) as fh:
                key = fh.read().strip()
        except OSError:
            key = ""
    if not key:
        return KeyStatus("fish", False, False, f"no FISH_API_KEY in {PROJECT_ROOT / '.env'}")
    try:
        import msgpack
        import requests
    except ImportError as e:
        return KeyStatus("fish", True, False, f"a Python package is missing ({e.name}) — run "
                         "`make setup-python` once, then start the app again")  # fmt: skip
    try:
        r = requests.post(
            FISH_URL,
            data=msgpack.packb({"text": "OK.", "format": "mp3", "latency": "balanced"}),
            headers={
                "Authorization": f"Bearer {key}",
                "model": "s2.1-pro-free",
                "Content-Type": "application/msgpack",
            },
            timeout=timeout_s,
        )
    except Exception as e:  # network down, DNS, proxy …
        return KeyStatus(
            "fish", True, False, f"could not reach api.fish.audio ({type(e).__name__})"
        )
    if r.status_code == 200:
        return KeyStatus("fish", True, True, "Fish Audio key works")
    return KeyStatus("fish", True, r.status_code == 429, _explain(r.status_code, FISH_KEYS_PAGE))


def check_groq(timeout_s: float = 10.0) -> KeyStatus:
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key:
        return KeyStatus("groq", False, False, f"no GROQ_API_KEY in {PROJECT_ROOT / '.env'}")
    try:
        import requests
    except ImportError as e:
        return KeyStatus("groq", True, False, f"a Python package is missing ({e.name}) — run "
                         "`make setup-python` once, then start the app again")  # fmt: skip
    try:
        r = requests.get(GROQ_URL, headers={"Authorization": f"Bearer {key}"}, timeout=timeout_s)
    except Exception as e:
        return KeyStatus("groq", True, False, f"could not reach api.groq.com ({type(e).__name__})")
    if r.status_code == 200:
        return KeyStatus("groq", True, True, "Groq key works")
    return KeyStatus("groq", True, r.status_code == 429, _explain(r.status_code, GROQ_KEYS_PAGE))


def check_deepgram(timeout_s: float = 10.0) -> KeyStatus:
    key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if not key:
        return KeyStatus("deepgram", False, False, "no DEEPGRAM_API_KEY set")
    try:
        import requests

        r = requests.get(DEEPGRAM_URL, headers={"Authorization": f"Token {key}"}, timeout=timeout_s)
    except ImportError as e:
        return KeyStatus("deepgram", True, False, f"a Python package is missing ({e.name})")
    except Exception as e:
        return KeyStatus(
            "deepgram", True, False, f"could not reach api.deepgram.com ({type(e).__name__})"
        )
    if r.status_code == 200:
        return KeyStatus("deepgram", True, True, "Deepgram key works")
    return KeyStatus(
        "deepgram", True, r.status_code == 429, _explain(r.status_code, DEEPGRAM_KEYS_PAGE)
    )


HF_TOKENS_PAGE = "https://huggingface.co/settings/tokens"


def check_hf(timeout_s: float = 15.0) -> KeyStatus:
    """A Hugging Face token that can WRITE (it stores the private voice library)."""
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        return KeyStatus("hf", False, False, "no HF_TOKEN set")
    try:
        from huggingface_hub import HfApi

        who = HfApi().whoami(token=token)
    except ImportError as e:
        return KeyStatus("hf", True, False, f"a Python package is missing ({e.name})")
    except Exception as e:
        bad = "401" in str(e) or "Invalid" in str(e)
        why = (
            f"the token was rejected — make a new one at {HF_TOKENS_PAGE}"
            if bad
            else (f"could not reach huggingface.co ({type(e).__name__})")
        )
        return KeyStatus("hf", True, False, why)
    role = str(((who.get("auth") or {}).get("accessToken") or {}).get("role", ""))
    if role == "read":
        return KeyStatus("hf", True, False, "this token is read-only — create one with type "
                         f"\"Write\" at {HF_TOKENS_PAGE}")  # fmt: skip
    return KeyStatus("hf", True, True, f"Hugging Face token works (account {who.get('name')})")


def main() -> int:
    from engine.env import load_env

    load_env()
    fish, groq = check_fish(), check_groq()
    print()
    print("Voices (text-to-speech):")
    if fish.ok:
        print("  OK  Fish Audio s2.1-pro-free — emotional voices + voice cloning")
    else:
        print(f"  --  Fish Audio not used: {fish.message}")
        print("      → offline Kokoro voices instead (flat, no emotion, no cloning).")
        print(f"      Free key: {FISH_KEYS_PAGE}")
    print("Speech-to-text:")
    dg = check_deepgram()
    if dg.ok:
        print("  OK  Deepgram Nova-3 — used first (Groq / offline Whisper as backup)")
    elif dg.present:
        print(f"  --  Deepgram not used: {dg.message}")
    if groq.ok:
        print("  OK  Groq whisper-large-v3-turbo — fast and accurate")
    else:
        print(f"  --  Groq not used: {groq.message}")
        print("      → offline Whisper instead (slower).")
        print(f"      Free key: {GROQ_KEYS_PAGE}")
    print()
    return 0 if fish.ok and groq.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
