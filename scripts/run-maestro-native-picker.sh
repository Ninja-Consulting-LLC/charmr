#!/usr/bin/env bash
# Optional Maestro: native iOS Photos picker on Home (no bundled image inject).
# 1) Boot simulator if needed, grant Photos, seed library with assets/logo.png
# 2) Build+install with .env.e2e.native-picker (unless CHARMR_E2E_SKIP_BUILD=1)
# 3) maestro test .maestro/optional/native_image_picker_home.yaml
set -euo pipefail

if [[ -n "${JAVA_HOME:-}" && ! -x "${JAVA_HOME}/bin/java" ]]; then
  unset JAVA_HOME
fi

MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin}"
if [[ ! -x "${MAESTRO_BIN}/maestro" ]]; then
  echo "Maestro CLI not found at ${MAESTRO_BIN}/maestro" >&2
  echo 'Install: curl -Ls "https://get.maestro.mobile.dev" | bash' >&2
  exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo 'Native picker E2E is iOS-only.' >&2
  exit 1
fi

export PATH="${MAESTRO_BIN}:${PATH}"
export MAESTRO_CLI_NO_ANALYTICS="${MAESTRO_CLI_NO_ANALYTICS:-1}"
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED="${MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED:-true}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SIMULATOR="${CHARMR_E2E_SIMULATOR:-iPhone 16 Pro Max}"
SKIP_BUILD="${CHARMR_E2E_SKIP_BUILD:-0}"
VERBOSE_IOS="${CHARMR_E2E_VERBOSE_IOS:-1}"
BUNDLE_ID="${CHARMR_IOS_BUNDLE_ID:-com.ninjadating.charmr}"
ENVFILE="${ROOT}/.env.e2e.native-picker"

if [[ ! -f "${ENVFILE}" ]]; then
  echo "Missing ${ENVFILE}" >&2
  exit 1
fi

booted_sim_udid() {
  xcrun simctl list devices booted 2>/dev/null | grep '(Booted)' | head -1 | sed -n 's/.*(\([A-F0-9-]*\)) (Booted).*/\1/p'
}

ensure_ios_simulator() {
  if xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
    echo 'Using already-booted iOS simulator.' >&2
    return 0
  fi
  echo "Booting simulator: ${SIMULATOR} ..." >&2
  if ! xcrun simctl boot "${SIMULATOR}" 2>/dev/null; then
    echo "Could not boot '${SIMULATOR}'. Pick a name from: xcrun simctl list devices available" >&2
    exit 1
  fi
  open -a Simulator 2>/dev/null || true
  local i=0
  while (( i < 60 )); do
    if xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  echo 'Timed out waiting for a booted iOS simulator.' >&2
  exit 1
}

MEDIA="${ROOT}/assets/logo.png"
if [[ ! -f "${MEDIA}" ]]; then
  echo "Missing seed image: ${MEDIA}" >&2
  exit 1
fi

ensure_ios_simulator
UDID="$(booted_sim_udid)"
if [[ -z "${UDID}" ]]; then
  echo 'Could not resolve booted simulator UDID.' >&2
  exit 1
fi

echo "simctl addmedia ${UDID} (Recently Added) …" >&2
xcrun simctl addmedia "${UDID}" "${MEDIA}" >&2

echo "simctl privacy grant photos ${BUNDLE_ID} …" >&2
xcrun simctl privacy "${UDID}" grant photos "${BUNDLE_ID}" >&2 || {
  echo 'Warning: simctl privacy grant failed; you may see a Photos permission alert.' >&2
}

ensure_metro() {
  if [[ "${CHARMR_E2E_SKIP_METRO:-0}" == "1" ]]; then
    return 0
  fi
  if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
    return 0
  fi
  echo 'Starting Metro on 8081…' >&2
  (cd "$ROOT" && npx react-native start >/tmp/charmr-metro-native-picker.log 2>&1 &)
  local i=0
  while (( i < 120 )); do
    if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
      echo 'Metro ready.' >&2
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  echo 'Metro failed to start; see /tmp/charmr-metro-native-picker.log' >&2
  exit 1
}

if [[ "${SKIP_BUILD}" != "1" ]]; then
  ensure_metro
  echo "Building with ENVFILE=${ENVFILE} (udid=${UDID}) …" >&2
  local run_ios_args=(--udid "${UDID}" --no-packager)
  if [[ "${VERBOSE_IOS}" == "1" ]]; then
    run_ios_args+=(--verbose)
  fi
  env ENVFILE="${ENVFILE}" npx react-native run-ios "${run_ios_args[@]}"
else
  echo 'CHARMR_E2E_SKIP_BUILD=1 — skipping run-ios (install app built with .env.e2e.native-picker first).' >&2
  ensure_metro
fi

FLOW="${ROOT}/.maestro/optional/native_image_picker_home.yaml"
echo "Running Maestro: ${FLOW}" >&2
exec maestro test -p ios "${FLOW}"
