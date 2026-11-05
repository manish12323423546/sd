"""Pilot API without models (LCV_SKIP_MODELS=1): routes, errors, protocol translation."""

from __future__ import annotations

import os

import pytest

os.environ["LCV_SKIP_MODELS"] = "1"
pytest.importorskip("fastapi")

from fastapi.testclient import TestClient

from app import main
from app.ws import line_msg, speaker_msg
from engine.record.models import Emotion, Line, Speaker


@pytest.fixture()
def client() -> TestClient:
    with TestClient(main.app) as c:
        yield c  # type: ignore[misc]


def test_health_and_voices(client: TestClient) -> None:
    h = client.get("/api/health").json()
    assert h["ok"] is True and h["models_loaded"] == {"asr": False, "speaker": False, "tts": False}
    voices = [v for v in client.get("/api/voices").json() if not v["custom"]]
    assert [v["name"] for v in voices] == ["The Veteran", "Hype Host", "Spark", "Coach"]
    assert voices[0]["preview_url"] == "/media/previews/bm_george.local.wav"
    assert h["voice_cloning"] is False


def test_clips_list_is_a_list(client: TestClient) -> None:
    clips = client.get("/api/clips").json()
    assert isinstance(clips, list)
    for c in clips:
        assert c["url"].startswith("/media/clips/") and c["duration"] > 0


def test_session_errors(client: TestClient) -> None:
    r = client.post("/api/sessions", json={"clip_id": "x.mp4"})
    assert r.status_code == 503  # models not loaded in this test
    assert client.get("/api/sessions/nope").status_code == 404
    assert client.get("/api/sessions/nope/report").status_code == 404
    bad = client.post("/api/sessions", json={"clip_id": "x.mp4", "max_speakers": 9})
    assert bad.status_code == 422


def test_upload_rejects_wrong_type(client: TestClient) -> None:
    r = client.post("/api/clips", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_ws_unknown_session(client: TestClient) -> None:
    with client.websocket_connect("/ws/sessions/nope") as ws:
        assert ws.receive_json()["type"] == "error"


def test_protocol_shapes_match_docs() -> None:
    sp = Speaker(
        speaker_id="S1", display_name="Commentator 1", color="#4FA3FF", voice_id="bm_george"
    )
    assert speaker_msg(sp) == {
        "speaker_id": "S1",
        "display_name": "Commentator 1",
        "color": "#4FA3FF",
        "voice_id": "bm_george",
    }
    ln = Line(
        line_id="L000042",
        t_start=61.2,
        t_end=64.0,
        close_reason="pause",
        text="And he's through on goal!",
        speaker_id="S1",
        emotion=Emotion.peak,
        arousal=2.1,
    )
    assert line_msg(ln) == {
        "line_id": "L000042",
        "t_start": 61.2,
        "t_end": 64.0,
        "text": "And he's through on goal!",
        "speaker_id": "S1",
        "emotion": "peak",
        "arousal": 2.1,
    }


def test_custom_voice_upload_needs_consent_and_enough_audio(
    client: TestClient,
    tmp_path,
    monkeypatch,  # type: ignore[no-untyped-def]
) -> None:
    import io

    import numpy as np
    import soundfile as sf

    import engine.voices_custom as vc

    monkeypatch.setattr(vc, "CUSTOM_DIR", tmp_path / "custom")
    sr = 16000
    t = np.arange(sr * 8) / sr
    voice = (0.2 * np.sin(2 * np.pi * 180 * t) * (1 + np.sin(2 * np.pi * 3 * t))).astype("float32")

    def wav(x):  # type: ignore[no-untyped-def]
        buf = io.BytesIO()
        sf.write(buf, x, sr, format="WAV")
        return ("me.wav", buf.getvalue(), "audio/wav")

    no_consent = client.post("/api/voices/custom", data={"name": "Me"}, files={"file": wav(voice)})
    assert no_consent.status_code == 400 and "permission" in no_consent.json()["detail"]
    short = client.post("/api/voices/custom", data={"name": "Me", "consent": "true"},
                        files={"file": wav(voice[: sr * 3])})  # fmt: skip
    assert short.status_code == 400 and "at least" in short.json()["detail"]
    ok = client.post("/api/voices/custom", data={"name": "My Voice", "consent": "true",
                     "transcript": "hello"}, files={"file": wav(voice)})  # fmt: skip
    assert ok.status_code == 200, ok.text
    assert ok.json()["voice_id"] == "cu_my-voice" and ok.json()["custom"] is True
    assert (tmp_path / "custom" / "my-voice" / "ref.mp3").exists()
    listed = client.get("/api/voices").json()
    assert any(v["voice_id"] == "cu_my-voice" for v in listed)
    assert vc.reference("cu_my-voice")[1] == "hello"
    assert client.delete("/api/voices/custom/cu_my-voice").status_code == 200
    assert client.delete("/api/voices/custom/cu_my-voice").status_code == 404
