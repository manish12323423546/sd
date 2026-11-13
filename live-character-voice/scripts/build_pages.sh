#!/bin/bash
# Build the GitHub Pages website into $1 (default: dist-pages/):
#   /            the web app (talks to the engine on the Hugging Face Space)
#   /report/     the interactive project report
#   /download/   Chrome extension zip + promo video
# Usage: scripts/build_pages.sh [out dir]   (env: PAGES_BASE=/altercast/  ENGINE_URL=https://…hf.space)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist-pages}"
BASE="${PAGES_BASE:-/altercast/}"
ENGINE="${ENGINE_URL:-https://manishvk18-live-character-voice.hf.space}"
mkdir -p "$OUT"
(cd web && VITE_BASE="$BASE" VITE_API_BASE="$ENGINE" npx vite build --outDir "$(cd .. && pwd)/$OUT" --emptyOutDir)
cp "$OUT/index.html" "$OUT/404.html"          # deep links (/voices, /lab …) load the app too
touch "$OUT/.nojekyll"
mkdir -p "$OUT/report" "$OUT/download"
cp docs/report/index.html "$OUT/report/index.html"
cp extension-store/live-character-voice-extension.zip "$OUT/download/altercast-extension.zip"
cp promo/altercast-promo.mp4 "$OUT/download/altercast-promo.mp4"
echo "website built in $OUT (base $BASE, engine $ENGINE)"
