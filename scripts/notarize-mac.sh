#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/OpenArgos.dmg" >&2
  exit 64
fi

artifact_path="$1"
if [[ ! -f "$artifact_path" ]]; then
  echo "Artifact not found: ${artifact_path}" >&2
  exit 66
fi

submit_args=()

if [[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_ISSUER:-}" && -n "${APPLE_API_KEY_PATH:-}" ]]; then
  submit_args+=(--key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER")
elif [[ -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  submit_args+=(--apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD")
elif [[ -n "${OPENARGOS_NOTARYTOOL_KEYCHAIN_PROFILE:-}" ]]; then
  submit_args+=(--keychain-profile "$OPENARGOS_NOTARYTOOL_KEYCHAIN_PROFILE")
else
  cat >&2 <<EOF
Missing Apple notarization credentials.

Set either:
  APPLE_API_KEY, APPLE_API_ISSUER, APPLE_API_KEY_PATH

or:
  APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD

or:
  OPENARGOS_NOTARYTOOL_KEYCHAIN_PROFILE
EOF
  exit 65
fi

xcrun notarytool submit "$artifact_path" "${submit_args[@]}" --wait
xcrun stapler staple "$artifact_path"
xcrun stapler validate "$artifact_path"
