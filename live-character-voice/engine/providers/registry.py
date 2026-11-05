"""Pick the active provider for each stage by name from config (docs/02).

Providers are registered as zero-argument-after-config factories and imported lazily, so the
core package (and CI) never imports torch or any model library.
"""

from __future__ import annotations

import importlib
from collections.abc import Callable
from typing import Any

# stage -> provider name -> "module:factory"
_REGISTRY: dict[str, dict[str, str]] = {
    "asr": {},
    "speaker": {},
    "emotion": {},
    "tts": {},
}


def register(stage: str, name: str, target: str) -> None:
    if stage not in _REGISTRY:
        raise KeyError(f"unknown stage {stage!r}")
    _REGISTRY[stage][name] = target


def available(stage: str) -> list[str]:
    return sorted(_REGISTRY[stage])


def create(stage: str, name: str, **kwargs: Any) -> Any:
    try:
        target = _REGISTRY[stage][name]
    except KeyError as e:
        raise KeyError(f"no {stage} provider named {name!r}; available: {available(stage)}") from e
    module_name, factory_name = target.split(":")
    factory: Callable[..., Any] = getattr(importlib.import_module(module_name), factory_name)
    return factory(**kwargs)
