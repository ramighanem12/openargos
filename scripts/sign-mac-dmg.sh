#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/OpenArgos.dmg" >&2
  exit 64
fi

dmg_path="$1"
if [[ ! -f "$dmg_path" ]]; then
  echo "DMG not found: ${dmg_path}" >&2
  exit 66
fi

identity_hash="${OPENARGOS_CODESIGN_IDENTITY_HASH:-}"

if [[ -z "$identity_hash" ]]; then
  identity_name="${OPENARGOS_CODESIGN_IDENTITY:-Developer ID Application}"
  identity_hash="$(
    security find-identity -v -p codesigning |
      awk -v name="${identity_name}" 'index($0, "\"" name) { print $2; exit }'
  )"
fi

if [[ -z "$identity_hash" ]]; then
  echo "Missing Developer ID Application identity for DMG signing." >&2
  exit 65
fi

codesign --force --sign "$identity_hash" --timestamp "$dmg_path"
codesign --verify --strict "$dmg_path"
