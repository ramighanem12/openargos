#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/OpenArgos.app" >&2
  exit 64
fi

app_path="$1"
if [[ ! -d "${app_path}/Contents" ]]; then
  echo "Not a macOS app bundle: ${app_path}" >&2
  exit 66
fi

release_sign="${OPENARGOS_RELEASE_SIGN:-0}"
identity_hash="${OPENARGOS_CODESIGN_IDENTITY_HASH:-}"

if [[ -z "${identity_hash}" ]]; then
  identity_names=()
  if [[ -n "${OPENARGOS_CODESIGN_IDENTITY:-}" ]]; then
    identity_names+=("${OPENARGOS_CODESIGN_IDENTITY}")
  elif [[ "${release_sign}" == "1" ]]; then
    identity_names+=(
      "Developer ID Application"
    )
  else
    identity_names+=(
      "OpenArgos Local Development"
      "Argos Local Development"
      "Argos Local Code Signing"
    )
  fi

  for identity_name in "${identity_names[@]}"; do
    identity_hash="$(
      security find-identity -v -p codesigning |
        awk -v name="${identity_name}" 'index($0, "\"" name "\"") && index($0, "CSSMERR") == 0 { print $2; exit }'
    )"
    if [[ -z "${identity_hash}" && "${release_sign}" == "1" ]]; then
      identity_hash="$(
        security find-certificate -a -c "${identity_name}" -Z 2>/dev/null |
          awk '/SHA-1 hash:/ { print $3; exit }'
      )"
    fi
    if [[ -n "${identity_hash}" ]]; then
      if [[ "${release_sign}" == "1" ]]; then
        echo "Using release code-signing identity: ${identity_name}" >&2
      else
        echo "Using local code-signing identity: ${identity_name}" >&2
      fi
      break
    fi
  done
fi

if [[ -z "${identity_hash}" ]]; then
  if [[ "${release_sign}" == "1" ]]; then
    cat >&2 <<EOF
Missing Developer ID Application signing identity.

Set OPENARGOS_CODESIGN_IDENTITY or OPENARGOS_CODESIGN_IDENTITY_HASH to a valid
Developer ID Application certificate before running npm run release:mac.
EOF
    exit 65
  fi
  cat >&2 <<EOF
Missing local code-signing identity.

Falling back to ad-hoc signing for this local open-source build. macOS Screen
Recording and Accessibility permissions may need to be re-granted after rebuilds
because TCC tracks ad-hoc signatures by per-build code hash.
EOF
  identity_hash="-"
fi

timestamp_args=(--timestamp=none)
if [[ "${release_sign}" == "1" ]]; then
  timestamp_args=(--timestamp)
fi
codesign_args=(--force --sign "${identity_hash}" "${timestamp_args[@]}")
if [[ "${release_sign}" == "1" ]]; then
  codesign_args+=(--options runtime)
fi

entitlements="${PWD}/build/entitlements.mac.plist"
inherit_entitlements="${PWD}/build/entitlements.inherit.mac.plist"

set_plist_string() {
  local plist_path="$1"
  local key="$2"
  local value="$3"
  /usr/libexec/PlistBuddy -c "Set :${key} ${value}" "$plist_path" >/dev/null 2>&1 ||
    /usr/libexec/PlistBuddy -c "Add :${key} string ${value}" "$plist_path" >/dev/null
}

sign_macho() {
  local target="$1"
  if file "$target" | grep -q "Mach-O"; then
    codesign "${codesign_args[@]}" --entitlements "${inherit_entitlements}" "$target"
  fi
}

while IFS= read -r -d '' macho_path; do
  sign_macho "$macho_path"
done < <(find "${app_path}/Contents/Resources" -type f \( -name "*.node" -o -name "*.dylib" -o -perm -111 \) -print0)

while IFS= read -r -d '' dylib_path; do
  sign_macho "$dylib_path"
done < <(find "${app_path}/Contents/Frameworks" -type f -name "*.dylib" -print0)

while IFS= read -r -d '' framework_path; do
  bundle_id="$(
    plutil -extract CFBundleIdentifier raw -o - "${framework_path}/Resources/Info.plist" 2>/dev/null ||
    plutil -extract CFBundleIdentifier raw -o - "${framework_path}/Versions/Current/Resources/Info.plist" 2>/dev/null ||
    basename "$framework_path" .framework
  )"
  codesign "${codesign_args[@]}" --identifier "$bundle_id" "$framework_path"
done < <(find "${app_path}/Contents/Frameworks" -maxdepth 1 -type d -name "*.framework" -print0)

while IFS= read -r -d '' helper_path; do
  helper_plist="${helper_path}/Contents/Info.plist"
  set_plist_string "$helper_plist" "CFBundleDisplayName" "OpenArgos"
  set_plist_string "$helper_plist" "CFBundleName" "OpenArgos"
  set_plist_string "$helper_plist" "NSScreenCaptureUsageDescription" "OpenArgos needs Screen Recording permission to answer questions about your visible screen and perform approved Computer Use actions."
  set_plist_string "$helper_plist" "NSAudioCaptureUsageDescription" "OpenArgos needs system audio capture access when macOS groups screen and system audio recording permissions."
  set_plist_string "$helper_plist" "NSMicrophoneUsageDescription" "OpenArgos needs microphone access for voice input."
  bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "${helper_path}/Contents/Info.plist")"
  codesign "${codesign_args[@]}" --identifier "$bundle_id" --entitlements "${inherit_entitlements}" "$helper_path"
done < <(find "${app_path}/Contents/Frameworks" -maxdepth 1 -type d -name "OpenArgos Helper*.app" -print0)

bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "${app_path}/Contents/Info.plist")"
codesign "${codesign_args[@]}" --identifier "$bundle_id" --entitlements "${entitlements}" "$app_path"
codesign --verify --deep --strict "$app_path"
codesign -dr - "$app_path" 2>&1
