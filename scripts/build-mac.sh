#!/usr/bin/env bash
set -euo pipefail

rm -rf \
  dist/mac \
  dist/mac-* \
  dist/*.dmg \
  dist/*.dmg.blockmap \
  dist/latest*.yml \
  dist/builder-debug.yml \
  dist/*-native

export CSC_IDENTITY_AUTO_DISCOVERY=false

if [[ "${OPENARGOS_RELEASE_SIGN:-}" != "1" && "${OPENARGOS_SKIP_LOCAL_CODESIGN_IDENTITY:-}" != "1" ]]; then
  bash scripts/ensure-local-codesign-identity.sh || true
fi

electron-builder --mac dir -c.mac.identity=null -c.mac.timestamp=none

prepackaged_dirs=()
while IFS= read -r -d '' app_path; do
  bash scripts/sign-mac-app.sh "$app_path"
  prepackaged_dirs+=("$(dirname "$app_path")")
done < <(find dist -maxdepth 2 -type d -name "OpenArgos.app" -print0)

if [[ ${#prepackaged_dirs[@]} -eq 0 ]]; then
  echo "No packaged OpenArgos.app found under dist/." >&2
  exit 66
fi

for packaged_dir in "${prepackaged_dirs[@]}"; do
  electron-builder --mac dmg --prepackaged "$packaged_dir" -c.mac.identity=null -c.mac.timestamp=none
done

if [[ "${OPENARGOS_RELEASE_SIGN:-}" == "1" ]]; then
  while IFS= read -r -d '' dmg_path; do
    bash scripts/sign-mac-dmg.sh "$dmg_path"
  done < <(find dist -maxdepth 1 -type f -name "OpenArgos-*.dmg" -print0)
fi

if [[ "${OPENARGOS_NOTARIZE:-}" == "1" ]]; then
  while IFS= read -r -d '' dmg_path; do
    bash scripts/notarize-mac.sh "$dmg_path"
  done < <(find dist -maxdepth 1 -type f -name "OpenArgos-*.dmg" -print0)
fi
