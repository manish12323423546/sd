#!/bin/bash
# Start script for hosted deployments (Hugging Face Space, any VM/container).
# Loop: pull the latest commit of the branch → update what changed → run the app. The app exits
# by itself (LCV_AUTO_UPDATE=1) when GitHub has a newer commit and no session is running.
cd "$(dirname "$0")/../.." || exit 1
BRANCH="${LCV_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
PORT="${PORT:-7860}"
while true; do
  before=$(git rev-parse HEAD)
  if git fetch --depth 50 origin "$BRANCH" 2>/dev/null; then
    git reset --hard "origin/$BRANCH" >/dev/null
  fi
  after=$(git rev-parse HEAD)
  if [ "$before" != "$after" ]; then
    echo ">>> updated ${before:0:8} -> ${after:0:8}"
    changed=$(git diff --name-only "$before" "$after" -- . 2>/dev/null)
    if echo "$changed" | grep -q "pyproject.toml"; then make setup-python || true; fi
    if echo "$changed" | grep -qE "^live-character-voice/web/(package|src|public|index)|web/package"; then
      (cd web && npm install --no-audit --no-fund && npm run build) || true
    fi
    if echo "$changed" | grep -q "engine/cli.py"; then make download-models || true; fi
  fi
  [ -f web/dist/index.html ] || (cd web && npm run build)
  # scored test clips for Studio + Quality Lab (generated once; not stored in git)
  if [ ! -f data/clips/synthetic_match.mp4 ]; then make synth || true; fi
  for n in 6 8; do  # many-speaker panels (speaker tracking tests, V7)
    if [ ! -f "data/clips/synthetic_panel_${n}spk.mp4" ]; then
      .venv/bin/python scripts/make_synthetic_clip.py --script "data/scripts/synthetic_panel_${n}spk.yaml" \
        --name "synthetic_panel_${n}spk" || true
    fi
  done
  if [ ! -f data/clips/synthetic_match_3spk.mp4 ]; then
    .venv/bin/python scripts/make_synthetic_clip.py --script data/scripts/synthetic_match_3spk.yaml \
      --name synthetic_match_3spk || true
  fi
  echo ">>> starting engine at commit $(git rev-parse --short HEAD) on port $PORT"
  .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --ws-max-size 16777216
  echo ">>> engine exited ($?) — restarting in 2 s"
  sleep 2
done
