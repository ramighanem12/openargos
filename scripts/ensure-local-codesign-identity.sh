#!/usr/bin/env bash
set -euo pipefail

identity_name="${OPENARGOS_CODESIGN_IDENTITY:-OpenArgos Local Development}"
keychain_path="${OPENARGOS_CODESIGN_KEYCHAIN:-$HOME/Library/Keychains/local-certs/openargos-build.keychain-db}"
keychain_password="${OPENARGOS_CODESIGN_KEYCHAIN_PASSWORD:-openargos-local}"
cert_dir="${OPENARGOS_CODESIGN_CERT_DIR:-$PWD/local-certs}"
p12_path="${OPENARGOS_CODESIGN_P12:-$cert_dir/openargos-local-development-v2.p12}"
p12_password="${OPENARGOS_CODESIGN_P12_PASSWORD:-openargos-local}"

find_identity_hash() {
  security find-identity -v -p codesigning |
    awk -v name="${identity_name}" 'index($0, "\"" name "\"") && index($0, "CSSMERR") == 0 { print $2; exit }'
}

find_certificate_hash() {
  security find-certificate -a -c "$identity_name" -Z 2>/dev/null |
    awk '/SHA-1 hash:/ { print $3; exit }'
}

normalize_user_keychains() {
  local existing_keychains
  existing_keychains="$(security list-keychains -d user | tr -d '"' | awk 'NF && !seen[$0]++')"
  if [[ -n "$existing_keychains" ]]; then
    # shellcheck disable=SC2086
    security list-keychains -d user -s $existing_keychains
  fi
}

ensure_local_keychain_in_search_list() {
  local existing_keychains
  existing_keychains="$(security list-keychains -d user | tr -d '"' | awk 'NF && !seen[$0]++')"
  if ! grep -Fxq "$keychain_path" <<<"$existing_keychains"; then
    # shellcheck disable=SC2086
    security list-keychains -d user -s "$keychain_path" $existing_keychains
  else
    normalize_user_keychains
  fi
}

prepare_local_keychain_for_codesign() {
  [[ -f "$keychain_path" ]] || return 0
  security unlock-keychain -p "$keychain_password" "$keychain_path"
  security set-keychain-settings -lut 21600 "$keychain_path"
  ensure_local_keychain_in_search_list
  security set-key-partition-list \
    -S "apple-tool:,apple:,codesign:" \
    -s \
    -k "$keychain_password" \
    "$keychain_path" >/dev/null 2>&1 || true
}

if [[ -n "$(find_identity_hash)" ]]; then
  prepare_local_keychain_for_codesign
  exit 0
fi

mkdir -p "$(dirname "$keychain_path")" "$cert_dir"

if [[ ! -f "$keychain_path" ]]; then
  security create-keychain -p "$keychain_password" "$keychain_path"
fi

security unlock-keychain -p "$keychain_password" "$keychain_path"
security set-keychain-settings -lut 21600 "$keychain_path"
ensure_local_keychain_in_search_list

if [[ ! -f "$p12_path" ]]; then
  key_path="$cert_dir/openargos-local-development-v2.key"
  cert_path="$cert_dir/openargos-local-development-v2.crt"
  openssl req \
    -newkey rsa:2048 \
    -nodes \
    -keyout "$key_path" \
    -x509 \
    -days 3650 \
    -out "$cert_path" \
    -config "$PWD/scripts/openargos-local-codesign.cnf" >/dev/null 2>&1
  openssl pkcs12 \
    -export \
    -out "$p12_path" \
    -inkey "$key_path" \
    -in "$cert_path" \
    -name "$identity_name" \
    -passout "pass:$p12_password" >/dev/null 2>&1
  chmod 600 "$key_path" "$p12_path"
fi

cert_path="$cert_dir/openargos-local-development-v2.crt"
if [[ ! -f "$cert_path" ]]; then
  openssl pkcs12 \
    -in "$p12_path" \
    -nokeys \
    -out "$cert_path" \
    -passin "pass:$p12_password" >/dev/null 2>&1
fi

security import "$p12_path" \
  -k "$keychain_path" \
  -P "$p12_password" \
  -A \
  -T /usr/bin/codesign \
  -T /usr/bin/security >/dev/null

security set-key-partition-list \
  -S "apple-tool:,apple:,codesign:" \
  -s \
  -k "$keychain_password" \
  "$keychain_path" >/dev/null

if [[ "${OPENARGOS_TRUST_LOCAL_CODESIGN:-0}" == "1" && -n "$(find_certificate_hash)" ]]; then
  security add-trusted-cert \
    -r trustRoot \
    -p codeSign \
    -k "$keychain_path" \
    "$cert_path" >/dev/null 2>&1 || true
fi

if [[ -z "$(find_identity_hash)" ]]; then
  cat >&2 <<EOF
Could not create or import a trusted ${identity_name} code-signing identity.

The certificate exists, but macOS does not trust it for code signing yet. To
attempt to trust it, run this script with OPENARGOS_TRUST_LOCAL_CODESIGN=1.
EOF
  exit 1
fi
