"""Permanent voice library (engine/voice_library.py): survives restarts, owner-controlled.

A DirBackend folder stands in for the private Hugging Face dataset; two "servers" (a Studio and the
public app) each have their own voice folder, like two Spaces whose disks are wiped on restart.
"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

import pytest

from engine.voice_library import DirBackend, VoiceLibrary, role


def _voice(folder: Path, slug: str, **meta: object) -> None:
    d = folder / slug
    d.mkdir(parents=True)
    (d / "ref.mp3").write_bytes(b"audio-" + slug.encode())
    m = {"voice_id": f"cu_{slug}", "name": slug.title(), "seconds": 12.0, "consent": True, **meta}
    (d / "meta.json").write_text(json.dumps(m))


def test_rescue_then_survives_a_restart(tmp_path: Path) -> None:
    store = DirBackend(tmp_path / "library")
    disk = tmp_path / "app_disk"
    _voice(disk, "ace")  # made before the library existed
    lib = VoiceLibrary(store, disk, "app")
    lib.sync(rescue=True)
    assert lib.rescued == ["ace"] and store.slugs() == {"ace"}
    shutil.rmtree(disk)  # the Space restarts: its disk is wiped
    fresh = VoiceLibrary(store, disk, "app")
    assert fresh.sync(rescue=True) is True
    assert (disk / "ace" / "ref.mp3").read_bytes() == b"audio-ace"


def test_studio_changes_reach_the_app(tmp_path: Path) -> None:
    store = DirBackend(tmp_path / "library")
    studio_disk, app_disk = tmp_path / "studio", tmp_path / "app"
    studio = VoiceLibrary(store, studio_disk, "studio")
    app = VoiceLibrary(store, app_disk, "app")
    _voice(studio_disk, "mickey")
    studio.publish("cu_mickey")  # cloned in the Studio
    assert app.sync() is True and (app_disk / "mickey").exists()
    studio.set_enabled("cu_mickey", False)  # hidden: still kept, not offered in the app
    app.sync()
    assert json.loads((app_disk / "mickey" / "meta.json").read_text())["enabled"] is False
    assert app.listing()[0]["enabled"] is False
    studio.remove("cu_mickey")  # deleted in the Studio → gone everywhere
    app.sync()
    assert not (app_disk / "mickey").exists() and store.slugs() == set()


def test_deleted_voice_is_not_rescued_back(tmp_path: Path) -> None:
    store = DirBackend(tmp_path / "library")
    disk = tmp_path / "app"
    _voice(disk, "old", library=True)  # came from the library, later deleted there
    lib = VoiceLibrary(store, disk, "app")
    lib.sync(rescue=True)
    assert store.slugs() == set() and not (disk / "old").exists()


def test_roles_and_editing(tmp_path: Path) -> None:
    assert VoiceLibrary(None, Path("/nope"), "app").can_edit  # no library: nothing to protect
    assert not VoiceLibrary(DirBackend(tmp_path), Path("/nope"), "app").can_edit
    assert VoiceLibrary(None, Path("/nope"), "studio").can_edit


def test_role_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LCV_ROLE", raising=False)
    monkeypatch.delenv("SPACE_ID", raising=False)
    assert role(True) == "all"  # local development
    monkeypatch.setenv("SPACE_ID", "me/app")
    assert role(True) == "app" and role(False) == "all"
    monkeypatch.setenv("LCV_ROLE", "studio")
    assert role(True) == "studio"


def test_hidden_voices_left_out_of_the_app_catalog(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from engine import voices_custom

    monkeypatch.setattr(voices_custom, "CUSTOM_DIR", tmp_path)
    _voice(tmp_path, "shown")
    _voice(tmp_path, "hidden", enabled=False)
    names = {v.voice_id for v in voices_custom.catalog_entries(include_hidden=False)}
    assert names == {"cu_shown"}
    assert len(voices_custom.catalog_entries(include_hidden=True)) == 2


def test_api_app_is_read_only_studio_edits(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ["LCV_SKIP_MODELS"] = "1"
    from fastapi.testclient import TestClient

    from app import main
    from engine import voices_custom

    store = DirBackend(tmp_path / "library")
    disk = tmp_path / "disk"
    _voice(disk, "ace")
    monkeypatch.setattr(voices_custom, "CUSTOM_DIR", disk)
    with TestClient(main.app) as c:
        main.manager.library = VoiceLibrary(store, disk, "app")
        assert c.get("/api/health").json()["voice_library"]["can_edit"] is False
        r = c.post("/api/voices/library/cu_ace", json={"enabled": False})
        assert r.status_code == 403 and r.json()["detail"]["code"] == "voices_read_only"
        assert c.delete("/api/voices/custom/cu_ace").status_code == 403
        main.manager.library = VoiceLibrary(store, disk, "studio")
        assert (
            c.post("/api/voices/library/cu_ace", json={"enabled": False}).json()["enabled"] is False
        )
        assert store.slugs() == {"ace"}  # saved permanently on the first change
        lib = c.get("/api/voices/library").json()
        assert lib["role"] == "studio" and lib["voices"][0]["enabled"] is False
        assert c.post("/api/voices/library/sync").status_code == 200
        assert c.delete("/api/voices/custom/cu_ace").json() == {"deleted": "cu_ace"}
        assert store.slugs() == set()


def test_start_library_rescues_without_restart(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Pasting the token in the app starts the library and saves the voices still on disk."""
    os.environ["LCV_SKIP_MODELS"] = "1"
    from app import main
    from engine import voice_library, voices_custom

    disk = tmp_path / "disk"
    _voice(disk, "ace")
    monkeypatch.setattr(voices_custom, "CUSTOM_DIR", disk)
    monkeypatch.setattr(voice_library, "CUSTOM_DIR", disk)
    monkeypatch.setenv("LCV_VOICE_LIBRARY", f"dir:{tmp_path / 'library'}")
    monkeypatch.setattr(VoiceLibrary.__init__, "__defaults__", (disk, None))
    msg = main._start_library()
    assert "ace" in msg and DirBackend(tmp_path / "library").slugs() == {"ace"}
