# Live Sports Character Voice — common commands (see CLAUDE.md).
SHELL := /bin/bash
PY_VERSION ?= 3.12
VENV := .venv
PY := $(VENV)/bin/python
TORCH_INDEX := https://download.pytorch.org/whl/cpu
CLIP ?= data/clips/synthetic_match.mp4
SYS_PKGS := ffmpeg espeak-ng libsndfile1 sox


.PHONY: synth-pilot download-models bench
.PHONY: setup setup-system setup-python setup-ci setup-web test test-py test-web test-slow \
        lint lint-py lint-web check synth poc dev

setup: setup-system setup-python setup-web

setup-system:
	@missing=""; for p in $(SYS_PKGS); do dpkg -s $$p >/dev/null 2>&1 || missing="$$missing $$p"; done; \
	if [ -n "$$missing" ]; then \
	  echo "Installing:$$missing"; \
	  SUDO=$$( [ "$$(id -u)" = 0 ] || echo sudo ); \
	  $$SUDO apt-get update -y && $$SUDO apt-get install -y $$missing; \
	else echo "System packages OK"; fi

$(PY):
	uv venv --python $(PY_VERSION) $(VENV)

# CPU torch first (so nothing pulls the CUDA build), then the project with all extras.
setup-python: $(PY)
	uv pip install --python $(PY) --index-url $(TORCH_INDEX) torch torchaudio
	uv pip install --python $(PY) --extra-index-url $(TORCH_INDEX) --index-strategy unsafe-best-match \
	  -e ".[models,api,dev]"

# Light install for CI: no torch, no model libraries.
setup-ci: $(PY)
	uv pip install --python $(PY) -e ".[api,dev]"

setup-web:
	cd web && npm install --no-audit --no-fund

# Unit tests (pytest, no models) + frontend tests (vitest).
test: test-py test-web

test-py:
	$(PY) -m pytest -q

# Integration tests with real models.
test-slow:
	$(PY) -m pytest -q -m slow

test-web:
	cd web && npm test --silent

# ruff + mypy (backend), eslint + tsc (frontend).
lint: lint-py lint-web

lint-py:
	$(PY) -m ruff check engine app scripts tests
	$(PY) -m ruff format --check engine app scripts tests
	$(PY) -m mypy

lint-web:
	cd web && npm run lint --silent && npm run typecheck --silent

# Tools, versions, CPU, model cache, network to Hugging Face.
check:
	$(PY) -m engine.cli check

# Synthetic test clip + ground truth (M1).
synth:
	$(PY) scripts/make_synthetic_clip.py

# Pilot clips (M10): three commentators, and the 20-minute stability clip.
synth-pilot:
	$(PY) scripts/make_synthetic_clip.py --script data/scripts/synthetic_match_3spk.yaml \
	  --name synthetic_match_3spk
	$(PY) scripts/make_synthetic_clip.py --script data/scripts/synthetic_match_3spk.yaml \
	  --name synthetic_match_20min --minutes 20

download-models:
	$(PY) -m engine.cli download-models

bench:
	$(PY) -m engine.cli bench

# POC at live speed (M2–M7).
poc:
	$(PY) -m engine.cli poc --clip $(CLIP)

# Backend + frontend together (Pilot, M8–M9). MALLOC_ARENA_MAX=2 keeps RSS flat (M10).

.PHONY: serve
serve:
	cd web && npm run build
	MALLOC_ARENA_MAX=2 $(PY) -m uvicorn app.main:app --port 8000

dev:
	@trap 'kill 0' EXIT; \
	MALLOC_ARENA_MAX=2 $(PY) -m uvicorn app.main:app --port 8000 & \
	(cd web && npm run dev) & \
	wait
