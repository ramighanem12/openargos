#!/usr/bin/env bash
set -euo pipefail

APP_SUPPORT="${HOME}/Library/Application Support/OpenArgos"

pkill -x OpenArgos >/dev/null 2>&1 || true

rm -rf \
  "${APP_SUPPORT}/Local Storage" \
  "${APP_SUPPORT}/Session Storage" \
  "${APP_SUPPORT}/IndexedDB" \
  "${APP_SUPPORT}/Code Cache" \
  "${APP_SUPPORT}/Cache" \
  "${APP_SUPPORT}/GPUCache" \
  "${APP_SUPPORT}/DawnCache" \
  "${APP_SUPPORT}/Service Worker" \
  "${APP_SUPPORT}/blob_storage"

rm -f "${APP_SUPPORT}/settings.json"

printf 'Reset OpenArgos local state at %s\n' "${APP_SUPPORT}"
