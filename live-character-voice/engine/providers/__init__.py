"""AI stage providers. Free ones register themselves here; paid ones go in providers/paid/."""

from engine.providers.registry import register

register("asr", "faster_whisper", "engine.providers.free.asr_faster_whisper:create")
register("asr", "captions", "engine.providers.free.asr_captions:create")
register("speaker", "ecapa", "engine.providers.free.speaker_ecapa:create")
register("emotion", "prosody", "engine.providers.free.emotion_prosody:create")
register("tts", "kokoro", "engine.providers.free.tts_kokoro:create")
register("tts", "kokoro_onnx", "engine.providers.free.tts_kokoro_onnx:create")
