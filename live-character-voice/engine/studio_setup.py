"""Self set-up of the owner's private Voice Studio (docs/VOICE_LIBRARY.md).

The only thing the owner does by hand is add ONE secret, `HF_TOKEN` (a Hugging Face write token),
to the app's Space. On its next start the app then:
  1. creates the private voice library dataset (engine/voice_library.py), and
  2. here: creates `<owner>/altercast-voice-studio` as a PRIVATE duplicate of itself with
     `LCV_ROLE=studio` and the same keys — or, if it already exists, makes sure it is private and
     has the studio role.
Nothing is ever deleted. Other look-alike Spaces of the owner are only reported (`strays`).
"""

from __future__ import annotations

import os
from typing import Any

COPY_SECRETS = ("HF_TOKEN", "FISH_API_KEY", "GROQ_API_KEY", "DEEPGRAM_API_KEY")


def studio_id(space_id: str) -> str:
    return os.environ.get("LCV_STUDIO_SPACE", "").strip() or (
        f"{space_id.split('/')[0]}/altercast-voice-studio"
    )


def ensure_studio(api: Any = None) -> dict[str, Any]:
    """Create or repair the Voice Studio Space. Returns a plain status (never raises)."""
    space, token = os.environ.get("SPACE_ID", ""), os.environ.get("HF_TOKEN", "").strip()
    if not space or not token:
        return {"state": "skipped", "why": "not on a Space with HF_TOKEN"}
    target = studio_id(space)
    out: dict[str, Any] = {"space": target, "url": f"https://huggingface.co/spaces/{target}"}
    try:
        if api is None:
            from huggingface_hub import HfApi

            api = HfApi(token=token)
        names = {s.id for s in api.list_spaces(author=space.split("/")[0])}
        out["strays"] = sorted(
            n for n in names if n not in (space, target) and "studio" in n.lower()
        )
        if target not in names:
            api.duplicate_repo(
                space,
                target,
                repo_type="space",
                private=True,
                space_hardware="cpu-basic",
                space_secrets=[
                    {"key": k, "value": os.environ[k]} for k in COPY_SECRETS if os.environ.get(k)
                ],
                space_variables=[{"key": "LCV_ROLE", "value": "studio"}],
            )
            out["state"] = "created (first start takes about 15–20 minutes)"
            return out
        fixed = []
        if not api.space_info(target).private:
            api.update_repo_settings(target, private=True, repo_type="space")
            fixed.append("made private")
        var = api.get_space_variables(target).get("LCV_ROLE")
        if var is None or var.value != "studio":
            api.add_space_variable(target, "LCV_ROLE", "studio")
            fixed.append("set LCV_ROLE=studio")
        out["state"] = "ready" + (f" ({', '.join(fixed)})" if fixed else "")
    except Exception as e:
        out["state"] = "error"
        out["error"] = f"{type(e).__name__}: {e}"[:300]
    return out
