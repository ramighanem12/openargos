#!/usr/bin/env bash
set -euo pipefail

js_files=(
  electron/main.js
  electron/preload.js
  electron/renderer/renderer.js
  electron/ambient/ambient.js
  electron/ambient/preload.js
  scripts/run-computer-use-evals.js
  scripts/export-computer-use-diagnostics.js
)

while IFS= read -r -d '' file; do
  js_files+=("$file")
done < <(find electron/computer-use -maxdepth 1 -type f -name "*.js" -print0 | sort -z)

echo "Checking JavaScript syntax..."
for file in "${js_files[@]}"; do
  node --check "$file" >/dev/null
done

echo "Running Computer Use harness evals..."
npm run eval:computer-use

echo "Checking whitespace..."
git diff --check

if [[ "${OPENARGOS_VERIFY_DIST:-}" == "1" ]]; then
  echo "Building macOS app and DMG..."
  npm run dist:mac
else
  echo "Skipping dist build. Set OPENARGOS_VERIFY_DIST=1 to include npm run dist:mac."
fi

echo "Release verification passed."
