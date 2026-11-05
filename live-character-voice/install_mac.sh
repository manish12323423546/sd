#!/bin/bash
# One-command installer for macOS: installs everything, then starts the app and opens the browser.
# Usage (from anywhere):  bash install_mac.sh
# Safe to run again: steps that are already done are skipped.
set -euo pipefail

REPO="https://github.com/manish12323423546/sd.git"
BRANCH="claude/nice-ritchie-5s42u6"
DEST="$HOME/live-character-voice-app"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

say "1/6  Homebrew (macOS package manager)"
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is not installed. Installing it now — it will ask for your Mac password."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
# make brew available in this shell (Apple Silicon and Intel locations)
if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
if [ -x /usr/local/bin/brew ]; then eval "$(/usr/local/bin/brew shellenv)"; fi

say "2/6  Tools: git, ffmpeg, espeak-ng, uv, node"
brew install git ffmpeg espeak-ng uv node

say "3/6  Download the project to $DEST"
if [ -d "$DEST/.git" ]; then
  git -C "$DEST" fetch origin "$BRANCH"
  git -C "$DEST" checkout "$BRANCH"
  git -C "$DEST" pull --ff-only origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$DEST"
fi
cd "$DEST/live-character-voice"

say "4/6  Python + web dependencies (a few minutes)"
make setup-python setup-web

say "5/6  AI models (~1 GB) and the test match"
make download-models
if [ ! -f data/clips/synthetic_match.mp4 ]; then make synth; fi
if [ ! -f data/clips/synthetic_match_3spk.mp4 ]; then
  .venv/bin/python scripts/make_synthetic_clip.py --script data/scripts/synthetic_match_3spk.yaml \
    --name synthetic_match_3spk
fi

say "Free API keys (better voices + emotion + voice cloning, faster text)"
bash scripts/setup_keys.sh

say "6/6  Starting the app — your browser will open at http://localhost:8000"
echo "Leave this window open while you use the app. Press Ctrl+C here to stop it."
( sleep 25 && open "http://localhost:8000" ) &
make serve
