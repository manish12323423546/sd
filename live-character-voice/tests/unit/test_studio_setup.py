"""Voice Studio self set-up (engine/studio_setup.py) with a fake Hugging Face API."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from engine.studio_setup import ensure_studio


class FakeApi:
    def __init__(self, spaces: list[str], private: bool = False, role: str | None = None) -> None:
        self.spaces, self.private, self.role = spaces, private, role
        self.calls: list[tuple[str, Any]] = []

    def list_spaces(self, author: str) -> list[Any]:
        return [SimpleNamespace(id=s) for s in self.spaces]

    def duplicate_repo(self, src: str, dst: str, **kw: Any) -> None:
        self.calls.append(("duplicate", (src, dst, kw)))

    def space_info(self, repo: str) -> Any:
        return SimpleNamespace(private=self.private)

    def update_repo_settings(self, repo: str, **kw: Any) -> None:
        self.calls.append(("settings", kw))

    def get_space_variables(self, repo: str) -> dict[str, Any]:
        return {} if self.role is None else {"LCV_ROLE": SimpleNamespace(value=self.role)}

    def add_space_variable(self, repo: str, key: str, value: str) -> None:
        self.calls.append(("variable", (key, value)))


@pytest.fixture()
def env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SPACE_ID", "me/app")
    monkeypatch.setenv("HF_TOKEN", "hf_x")
    monkeypatch.setenv("FISH_API_KEY", "fish")
    monkeypatch.delenv("LCV_STUDIO_SPACE", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)


def test_creates_private_studio_with_role_and_keys(env: None) -> None:
    api = FakeApi(["me/app", "me/Altercast-oice-studio"])
    out = ensure_studio(api)
    ((kind, (src, dst, kw)),) = api.calls
    assert kind == "duplicate" and (src, dst) == ("me/app", "me/altercast-voice-studio")
    assert kw["private"] is True and kw["space_variables"] == [
        {"key": "LCV_ROLE", "value": "studio"}
    ]
    assert {s["key"] for s in kw["space_secrets"]} == {"HF_TOKEN", "FISH_API_KEY"}
    assert out["state"].startswith("created") and out["strays"] == ["me/Altercast-oice-studio"]


def test_repairs_existing_public_studio(env: None) -> None:
    api = FakeApi(["me/app", "me/altercast-voice-studio"], private=False, role=None)
    out = ensure_studio(api)
    assert [c[0] for c in api.calls] == ["settings", "variable"] and "made private" in out["state"]
    ok = FakeApi(["me/app", "me/altercast-voice-studio"], private=True, role="studio")
    assert ensure_studio(ok)["state"] == "ready" and ok.calls == []


def test_skipped_without_token_and_never_raises(env: None, monkeypatch: pytest.MonkeyPatch) -> None:
    class Boom(FakeApi):
        def list_spaces(self, author: str) -> list[Any]:
            raise RuntimeError("403 Forbidden")

    assert ensure_studio(Boom([]))["state"] == "error"
    monkeypatch.delenv("HF_TOKEN")
    assert ensure_studio(FakeApi([]))["state"] == "skipped"
