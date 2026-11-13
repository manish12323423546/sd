"""Hosting helpers (V5): access code, allowed origins, automatic self-update.

Environment (all optional):
  LCV_ACCESS_CODE   when set, every /api, /media and /ws request needs this code — header
                    `X-Access-Code` or query `?code=` — except /api/health. Protects your Fish /
                    Groq credit on a public server.
  LCV_CORS_ORIGINS  extra allowed browser origins, comma separated (e.g. a custom domain).
                    *.vercel.app, localhost and the Chrome extension are always allowed.
  LCV_AUTO_UPDATE   "1": every LCV_UPDATE_EVERY_S (default 300) compare the deployed commit with
                    the branch on GitHub; when it changed and no session is running, exit so the
                    start script pulls the new code and starts again (deploy/huggingface/start.sh).
"""

from __future__ import annotations

import asyncio
import hmac
import os
import subprocess
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs

ORIGIN_REGEX = (
    r"^(chrome-extension://[a-p]{32}"
    r"|https?://(localhost|127\.0\.0\.1)(:\d+)?"
    r"|https://[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app"
    r"|https://[a-z0-9-]+\.hf\.space"
    r"|https://[a-z0-9-]+\.github\.io)$"
)
OPEN_PATHS = ("/api/health",)
PROTECTED = ("/api/", "/media/", "/ws/")


def extra_origins() -> list[str]:
    return [
        o.strip().rstrip("/")
        for o in os.environ.get("LCV_CORS_ORIGINS", "").split(",")
        if o.strip()
    ]


def access_code() -> str:
    return os.environ.get("LCV_ACCESS_CODE", "").strip()


ASGIApp = Callable[[dict[str, Any], Callable[..., Awaitable[Any]], Callable[..., Awaitable[Any]]],
                   Awaitable[None]]  # fmt: skip


class AccessCodeMiddleware:
    """Pure ASGI (covers WebSockets too). Inactive when LCV_ACCESS_CODE is not set."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        code = access_code()
        path = scope.get("path", "")
        if (
            not code
            or scope["type"] not in ("http", "websocket")
            or scope.get("method") == "OPTIONS"
            or path in OPEN_PATHS
            or not path.startswith(PROTECTED)
        ):
            await self.app(scope, receive, send)
            return
        given = ""
        for k, v in scope.get("headers", []):
            if k == b"x-access-code":
                given = v.decode("latin-1")
        if not given:
            q = parse_qs(scope.get("query_string", b"").decode("latin-1"))
            given = (q.get("code") or [""])[0]
        if hmac.compare_digest(given.encode(), code.encode()):
            await self.app(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 4401})
            return
        body = b'{"detail":"access code required"}'
        origin = dict(scope.get("headers", [])).get(b"origin")
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
        ]
        if origin:
            headers += [(b"access-control-allow-origin", origin), (b"vary", b"Origin")]
        await send({"type": "http.response.start", "status": 401, "headers": headers})
        await send({"type": "http.response.body", "body": body})


# ---------------------------------------------------------------- self-update
def _git(*args: str, cwd: Path) -> str:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=30,
                          check=True).stdout.strip()  # fmt: skip


def _current_branch(root: Path) -> str:
    return _git("rev-parse", "--abbrev-ref", "HEAD", cwd=root)


def _remote_head(root: Path, branch: str) -> str:
    return _git("ls-remote", "origin", f"refs/heads/{branch}", cwd=root)


def deployed_commit(root: Path) -> str | None:
    try:
        return _git("rev-parse", "HEAD", cwd=root)
    except Exception:
        return None


async def update_watcher(
    root: Path, is_idle: Callable[[], bool], log: Callable[[str], None]
) -> None:
    if os.environ.get("LCV_AUTO_UPDATE") != "1":
        return
    every = float(os.environ.get("LCV_UPDATE_EVERY_S", "300"))
    head = deployed_commit(root)
    if not head:
        return
    loop = asyncio.get_running_loop()
    while True:
        await asyncio.sleep(every)
        try:
            branch = await loop.run_in_executor(None, _current_branch, root)
            out = await loop.run_in_executor(None, _remote_head, root, branch)
        except Exception as e:  # network hiccup: try again later
            log(f"update check failed: {e}")
            continue
        remote = out.split()[0] if out else ""
        if remote and remote != head:
            if not is_idle():
                log("update available — waiting for the running session to finish")
                continue
            log(f"update {head[:8]} → {remote[:8]}: restarting to deploy it")
            os._exit(3)  # start.sh pulls the new commit and starts the app again


# ---------------------------------------------------------------- settings from the app (V8)
# LCV_ADMIN_CODE  when set, the app's Keys & engines dialog also works on a hosted engine for
#                 whoever knows this code (keep it different from LCV_ACCESS_CODE, which you give
#                 to viewers). Without it, keys can only be set on the computer running the engine.
# HF_TOKEN        optional, on a Hugging Face Space: a write token. Keys set in the app are then
#                 also saved as Space secrets, so they survive restarts (the Space restarts once).
def admin_code() -> str:
    return os.environ.get("LCV_ADMIN_CODE", "").strip()


def admin_ok(given: str | None) -> bool:
    code = admin_code()
    return bool(code) and hmac.compare_digest((given or "").strip().encode(), code.encode())


def persist_to_space(name: str, value: str, secret: bool = True) -> str:
    """Save a setting on the Hugging Face Space itself (needs SPACE_ID + HF_TOKEN). Returns a
    plain-language result; never raises and never logs the value."""
    space, token = os.environ.get("SPACE_ID", ""), os.environ.get("HF_TOKEN", "").strip()
    if not space or not token:
        return "saved until the next restart (add HF_TOKEN to keep keys after restarts)"
    try:
        import requests

        kind = "secrets" if secret else "variables"
        r = requests.post(
            f"https://huggingface.co/api/spaces/{space}/{kind}",
            headers={"Authorization": f"Bearer {token}"},
            json={"key": name, "value": value},
            timeout=15,
        )
    except Exception as e:
        return f"could not save on the Space ({type(e).__name__}); works until the next restart"
    if r.status_code in (200, 201):
        return "saved on the Space for good (it restarts once in about a minute)"
    return f"the Space refused to save it (HTTP {r.status_code}); works until the next restart"
