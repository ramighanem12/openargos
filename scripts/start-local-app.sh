#!/usr/bin/env bash
set -euo pipefail

if [[ "${OPENARGOS_START_SKIP_BUILD:-}" != "1" ]]; then
  npm run dist:mac
fi

machine_arch="$(uname -m 2>/dev/null || echo "")"
preferred_dirs=(
  "dist/mac-${machine_arch}/OpenArgos.app"
  "dist/mac-arm64/OpenArgos.app"
  "dist/mac/OpenArgos.app"
  "dist/mac-universal/OpenArgos.app"
)

app_path=""
for candidate in "${preferred_dirs[@]}"; do
  if [[ -d "$candidate" ]]; then
    app_path="$candidate"
    break
  fi
done

if [[ -z "$app_path" ]]; then
  while IFS= read -r -d '' candidate; do
    app_path="$candidate"
    break
  done < <(find dist -maxdepth 2 -type d -name "OpenArgos.app" -print0)
fi

if [[ -z "$app_path" ]]; then
  echo "No packaged OpenArgos.app found under dist/. Run npm run dist:mac first." >&2
  exit 66
fi

open -n "$app_path"
