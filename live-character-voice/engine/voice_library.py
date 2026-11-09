"""Permanent voice library: cloned voices survive restarts, and only the owner manages them.

Why: a Hugging Face Space's disk is wiped on every restart, and custom voices were plain files on
that disk (data/voices/custom/<slug>/). Now the source of truth is a library outside the app:

* **Storage** — a private Hugging Face *dataset* (default `<space owner>/altercast-voices`), one
  folder per voice: `voices/<slug>/meta.json` + its reference recordings. Free, versioned, private.
  `LCV_VOICE_LIBRARY` can point elsewhere: `owner/name` (HF dataset) or `dir:/path` (any folder or
  mounted disk — used by tests and for hosting outside Hugging Face later).
* **Roles** (`LCV_ROLE`):
    - `studio` — the owner's private Voice Studio: clone, keep/hide, delete; every change is
      saved to the library immediately.
    - `app`    — the public app: voices are read-only and come only from the library (hidden ones
      are not offered); it re-syncs every minute, so a change in the Studio appears by itself.
    - `all`    — local development: everything on one machine, library optional.
  On a Hugging Face Space with a library configured and no `LCV_ROLE`, the role is `app`.
* **Rescue** — on start, voices on disk that were never in the library (made before it existed)
  are uploaded once, so nothing that still exists is lost.

meta.json gains two fields: `enabled` (offered in the app; default true) and `library` (came from /
was saved to the library — used to tell "deleted in the Studio" from "never uploaded").
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Protocol

from engine.voices_custom import CUSTOM_DIR, PREFIX

ROLES = ("all", "app", "studio")


# ---------------------------------------------------------------- where the library lives
class Backend(Protocol):
    name: str

    def head(self) -> str: ...  # version id; changes on every write

    def slugs(self) -> set[str]: ...

    def download(self) -> Path: ...  # a folder containing voices/<slug>/...

    def upload_voice(self, slug: str, src: Path) -> None: ...

    def upload_meta(self, slug: str, src: Path) -> None: ...

    def delete_voice(self, slug: str) -> None: ...


class DirBackend:
    """A plain folder (tests, a mounted persistent disk, or any server's filesystem)."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.name = f"dir:{root}"
        (root / "voices").mkdir(parents=True, exist_ok=True)

    def head(self) -> str:
        stamps = [p.stat().st_mtime_ns for p in (self.root / "voices").rglob("*") if p.is_file()]
        return f"{len(stamps)}-{max(stamps, default=0)}"

    def slugs(self) -> set[str]:
        return {p.parent.name for p in (self.root / "voices").glob("*/meta.json")}

    def download(self) -> Path:
        return self.root

    def upload_voice(self, slug: str, src: Path) -> None:
        dst = self.root / "voices" / slug
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)

    def upload_meta(self, slug: str, src: Path) -> None:
        shutil.copy2(src, self.root / "voices" / slug / "meta.json")

    def delete_voice(self, slug: str) -> None:
        shutil.rmtree(self.root / "voices" / slug, ignore_errors=True)


class HubBackend:
    """A private Hugging Face dataset (created on first use)."""

    def __init__(self, repo_id: str, token: str) -> None:
        from huggingface_hub import HfApi

        self.repo_id, self.token = repo_id, token
        self.name = f"hf:{repo_id}"
        self.api = HfApi(token=token)
        self._cache = Path(tempfile.gettempdir()) / "lcv-voice-library"
        self.api.create_repo(repo_id, repo_type="dataset", private=True, exist_ok=True)

    def head(self) -> str:
        return str(self.api.repo_info(self.repo_id, repo_type="dataset").sha)

    def slugs(self) -> set[str]:
        files = self.api.list_repo_files(self.repo_id, repo_type="dataset")
        return {
            f.split("/")[1] for f in files if f.startswith("voices/") and f.endswith("/meta.json")
        }

    def download(self) -> Path:
        from huggingface_hub import snapshot_download

        if self._cache.exists():
            shutil.rmtree(self._cache)  # a clean copy: deleted voices must disappear too
        snapshot_download(self.repo_id, repo_type="dataset", local_dir=self._cache,
                          token=self.token, allow_patterns=["voices/**"])  # fmt: skip
        (self._cache / "voices").mkdir(parents=True, exist_ok=True)
        return self._cache

    def upload_voice(self, slug: str, src: Path) -> None:
        self.api.upload_folder(repo_id=self.repo_id, repo_type="dataset", folder_path=str(src),
                               path_in_repo=f"voices/{slug}", delete_patterns=["*"],
                               commit_message=f"voice {slug}: save")  # fmt: skip

    def upload_meta(self, slug: str, src: Path) -> None:
        self.api.upload_file(repo_id=self.repo_id, repo_type="dataset", path_or_fileobj=str(src),
                             path_in_repo=f"voices/{slug}/meta.json",
                             commit_message=f"voice {slug}: settings")  # fmt: skip

    def delete_voice(self, slug: str) -> None:
        self.api.delete_folder(f"voices/{slug}", repo_id=self.repo_id, repo_type="dataset",
                               commit_message=f"voice {slug}: delete")  # fmt: skip


def backend_from_env() -> Backend | None:
    spec = os.environ.get("LCV_VOICE_LIBRARY", "").strip()
    if spec.startswith("dir:"):
        return DirBackend(Path(spec[4:]).expanduser())
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        return None
    if not spec:
        owner = os.environ.get("SPACE_ID", "").split("/")[0] or os.environ.get(
            "SPACE_AUTHOR_NAME", ""
        )
        if not owner:
            return None
        spec = f"{owner}/altercast-voices"
    return HubBackend(spec, token)


def role(configured: bool | None = None) -> str:
    r = os.environ.get("LCV_ROLE", "").strip().lower()
    if r in ROLES:
        return r
    if configured is None:
        configured = bool(os.environ.get("LCV_VOICE_LIBRARY") or os.environ.get("HF_TOKEN"))
    return "app" if os.environ.get("SPACE_ID") and configured else "all"


# ---------------------------------------------------------------- the library
class VoiceLibrary:
    def __init__(self, backend: Backend | None, custom_dir: Path = CUSTOM_DIR,
                 role_: str | None = None) -> None:  # fmt: skip
        self.backend = backend
        self.dir = custom_dir
        self.role = role_ or role(backend is not None)
        self.head: str | None = None
        self.last_sync: float | None = None
        self.error: str | None = None
        self.rescued: list[str] = []
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return self.backend is not None

    @property
    def can_edit(self) -> bool:
        """Can voices be added / changed here? (Never in the public app when a library exists.)"""
        return not (self.enabled and self.role == "app")

    # ---- local helpers
    def _meta_path(self, slug: str) -> Path:
        return self.dir / slug / "meta.json"

    def _read(self, slug: str) -> dict[str, Any]:
        return dict(json.loads(self._meta_path(slug).read_text()))

    def _write(self, slug: str, meta: dict[str, Any]) -> None:
        self._meta_path(slug).write_text(json.dumps(meta, indent=2))

    def _local_slugs(self) -> set[str]:
        return {p.parent.name for p in self.dir.glob("*/meta.json")} if self.dir.exists() else set()

    # ---- sync
    def sync(self, rescue: bool = False) -> bool:
        """Bring the local voices in line with the library. Returns True if anything changed."""
        if self.backend is None:
            return False
        with self._lock:
            try:
                if rescue:
                    self._rescue()
                head = self.backend.head()
                if head == self.head:
                    self.last_sync, self.error = time.time(), None
                    return False
                changed = self._mirror(self.backend.download())
                self.head = self.backend.head()
                self.last_sync, self.error = time.time(), None
                return changed
            except Exception as e:  # keep serving the voices we have; report the problem
                self.error = f"{type(e).__name__}: {e}"[:300]
                return False

    def _rescue(self) -> None:
        assert self.backend is not None
        remote = self.backend.slugs()
        for slug in sorted(self._local_slugs() - remote):
            meta = self._read(slug)
            if meta.get("library"):
                continue  # it WAS in the library and was deleted there: don't bring it back
            meta["library"] = True
            meta.setdefault("enabled", True)
            self._write(slug, meta)
            self.backend.upload_voice(slug, self.dir / slug)
            self.rescued.append(slug)

    def _mirror(self, root: Path) -> bool:
        src = root / "voices"
        remote = {p.parent.name for p in src.glob("*/meta.json")}
        changed = False
        self.dir.mkdir(parents=True, exist_ok=True)
        for slug in remote:
            dst = self.dir / slug
            if dst.exists() and _same(src / slug, dst):
                continue
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src / slug, dst)
            meta = self._read(slug)
            if not meta.get("library"):
                meta["library"] = True
                self._write(slug, meta)
            changed = True
        for slug in self._local_slugs() - remote:
            if self._read(slug).get("library"):  # deleted in the library → delete here
                shutil.rmtree(self.dir / slug, ignore_errors=True)
                changed = True
        return changed

    # ---- owner actions (Studio / local)
    def publish(self, voice_id: str) -> None:
        """Save a new or rebuilt voice to the library (no-op without a library)."""
        slug = _slug(voice_id)
        meta = self._read(slug)
        meta["library"] = True
        meta.setdefault("enabled", True)
        self._write(slug, meta)
        if self.backend is not None:
            with self._lock:
                self.backend.upload_voice(slug, self.dir / slug)
                self.head = self.backend.head()

    def set_enabled(self, voice_id: str, on: bool) -> dict[str, Any]:
        slug = _slug(voice_id)
        meta = self._read(slug)
        meta["enabled"] = bool(on)
        self._write(slug, meta)
        if self.backend is not None:
            with self._lock:
                if slug in self.backend.slugs():
                    self.backend.upload_meta(slug, self._meta_path(slug))
                else:
                    meta["library"] = True
                    self._write(slug, meta)
                    self.backend.upload_voice(slug, self.dir / slug)
                self.head = self.backend.head()
        return meta

    def remove(self, voice_id: str) -> None:
        slug = _slug(voice_id)
        if self.backend is not None:
            with self._lock:
                self.backend.delete_voice(slug)
                self.head = self.backend.head()
        shutil.rmtree(self.dir / slug, ignore_errors=True)

    # ---- what the owner sees
    def listing(self) -> list[dict[str, Any]]:
        out = []
        for slug in sorted(self._local_slugs()):
            m = self._read(slug)
            out.append(
                {
                    "voice_id": m.get("voice_id", PREFIX + slug),
                    "name": m.get("name", slug),
                    "tier": m.get("tier", "instant"),
                    "enabled": m.get("enabled", True) is not False,
                    "saved": bool(m.get("library")) and self.enabled,
                    "created": m.get("created"),
                    "seconds": m.get("seconds"),
                }
            )
        return out

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "where": self.backend.name if self.backend else None,
            "role": self.role,
            "can_edit": self.can_edit,
            "head": self.head,
            "last_sync": self.last_sync,
            "error": self.error,
            "rescued": self.rescued,
        }


def _slug(voice_id: str) -> str:
    if not voice_id.startswith(PREFIX):
        raise KeyError(voice_id)
    return voice_id[len(PREFIX) :]


def _same(a: Path, b: Path) -> bool:
    fa = {p.relative_to(a): p.stat().st_size for p in a.rglob("*") if p.is_file()}
    fb = {p.relative_to(b): p.stat().st_size for p in b.rglob("*") if p.is_file()}
    if fa != fb:
        return False
    return (a / "meta.json").read_bytes() == (b / "meta.json").read_bytes()
