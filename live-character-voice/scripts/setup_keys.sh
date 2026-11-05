#!/bin/bash
# Ask for the free API keys and store them in live-character-voice/.env (git-ignored, chmod 600).
# Usage: make keys      (run again any time to replace a key)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
ask_key() {  # $1 variable, $2 what it is, $3 where to get it
  local cur=""; grep -q "^$1=." .env && cur=" (already set — Enter keeps it)"
  echo; echo "$2"
  echo "Free key: open $3 , sign in, click 'Create' / 'New API key', copy it."
  read -r -s -p "Paste $1$cur: " val < /dev/tty || val=""; echo
  if [ -n "$val" ]; then
    { grep -v "^$1=" .env || true; echo "$1=$val"; } > .env.tmp && mv .env.tmp .env
    echo "Saved."
  fi
}
ask_key FISH_API_KEY "Fish Audio — emotional voices and voice cloning" "https://fish.audio/app/api-keys"
ask_key GROQ_API_KEY "Groq — fast, accurate speech-to-text" "https://console.groq.com/keys"
chmod 600 .env
echo; echo "Checking the keys…"
.venv/bin/python -m engine.keycheck || true
echo "Now (re)start the app:  make serve   → open http://localhost:8000"
