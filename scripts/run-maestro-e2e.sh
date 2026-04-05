#!/usr/bin/env bash
# Run Maestro flows on iOS Simulator only (macOS + Xcode). Boots a sim, starts Metro if needed, builds/installs the app, then runs flows.
set -euo pipefail

# Maestro bundles its own JRE; invalid JAVA_HOME breaks startup on some Macs.
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
  echo 'Charmr E2E is configured for iOS only; run this script on macOS.' >&2
  exit 1
fi

export PATH="${MAESTRO_BIN}:${PATH}"
export MAESTRO_CLI_NO_ANALYTICS="${MAESTRO_CLI_NO_ANALYTICS:-1}"
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED="${MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED:-true}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SIMULATOR="${CHARMR_E2E_SIMULATOR:-iPhone 16 Pro Max}"
SKIP_BUILD="${CHARMR_E2E_SKIP_BUILD:-0}"
# run-ios normally prints only "Building the app..." for a long time; 1 = stream raw xcodebuild lines.
VERBOSE_IOS="${CHARMR_E2E_VERBOSE_IOS:-1}"

# Xcode can list zero simulator destinations when the iOS Simulator *runtime* version
# does not match the installed iphonesimulator SDK (e.g. SDK 26.4 but only 26.0 runtime).
ensure_xcode_sim_destination() {
  local out
  out="$(cd "$ROOT/ios" && xcodebuild -workspace Charmr.xcworkspace -scheme Charmr -showdestinations 2>&1)" || true
  if echo "${out}" | grep -q 'platform:iOS Simulator'; then
    return 0
  fi
  local sdk_ver
  sdk_ver="$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || echo 'unknown')"
  echo 'No eligible iOS Simulator destinations for scheme Charmr (xcodebuild cannot target any simulator).' >&2
  echo "  Active Xcode: $(xcode-select -p 2>/dev/null || true)" >&2
  echo "  iOS Simulator SDK version: ${sdk_ver}" >&2
  echo '  Installed CoreSimulator runtimes:' >&2
  xcrun simctl list runtimes 2>/dev/null | sed 's/^/    /' >&2
  echo '' >&2
  echo 'Fix: install a simulator runtime that matches this SDK (Xcode → Settings → Platforms).' >&2
  echo '  CLI: npm run test:e2e:install-ios-runtime   (or: xcodebuild -downloadPlatform iOS)' >&2
  echo '  Then: npm run test:e2e' >&2
  echo 'If the app is already on a booted simulator: CHARMR_E2E_SKIP_BUILD=1 npm run test:e2e' >&2
  if [[ "${CHARMR_E2E_DOWNLOAD_IOS_RUNTIME:-0}" == "1" ]]; then
    echo 'CHARMR_E2E_DOWNLOAD_IOS_RUNTIME=1: downloading iOS Simulator platform (this can take a long time)...' >&2
    xcodebuild -downloadPlatform iOS
    out="$(cd "$ROOT/ios" && xcodebuild -workspace Charmr.xcworkspace -scheme Charmr -showdestinations 2>&1)" || true
    if echo "${out}" | grep -q 'platform:iOS Simulator'; then
      return 0
    fi
  fi
  exit 1
}

booted_sim_udid() {
  xcrun simctl list devices booted 2>/dev/null | grep '(Booted)' | head -1 | sed -n 's/.*(\([A-F0-9-]*\)) (Booted).*/\1/p'
}

ensure_ios_simulator() {
  if xcrun simctl list devices booted 2>/dev/null | grep -q '(Booted)'; then
    echo 'Using already-booted iOS simulator.'
    return 0
  fi
  echo "Booting simulator: ${SIMULATOR} ..."
  if ! xcrun simctl boot "${SIMULATOR}" 2>/dev/null; then
    echo "Could not boot '${SIMULATOR}'. Pick a name from: xcrun simctl list devices available" >&2
    exit 1
  fi
  open -a Simulator || true
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

ensure_metro() {
  if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
    echo 'Metro already running on port 8081.'
    return 0
  fi
  echo 'Starting Metro in the background...'
  cd "$ROOT"
  npx react-native start >/tmp/charmr-metro-e2e.log 2>&1 &
  METRO_PID=$!
  local i=0
  while (( i < 120 )); do
    if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
      echo "Metro ready (pid=${METRO_PID})."
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  echo 'Metro failed to start; see /tmp/charmr-metro-e2e.log' >&2
  exit 1
}

build_and_install_ios() {
  local udid
  udid="$(booted_sim_udid)"
  if [[ -z "${udid}" ]]; then
    echo 'Could not resolve booted simulator UDID.' >&2
    exit 1
  fi
  echo "Building and installing iOS app (udid=${udid}) ..."
  echo 'This step often looks stuck: React Native only animates "Building the app..." while Xcode compiles many pods (first build can take 10–20+ minutes).' >&2
  echo 'Streaming verbose xcodebuild output by default; set CHARMR_E2E_VERBOSE_IOS=0 for the short spinner only.' >&2
  echo 'Tip: Activity Monitor → filter "clang" or "Swift" to confirm work is happening.' >&2
  local run_ios_args=(--udid "${udid}" --no-packager)
  if [[ "${VERBOSE_IOS}" == "1" ]]; then
    run_ios_args+=(--verbose)
  fi
  # react-native-config reads ENVFILE during the Xcode bundle step; export alone is unreliable.
  # Default .env.e2e uses RELAX=false (real Photos). Numbered flows stub/02 + 28 need inject — force RELAX=true in a temp file for this build only.
  if [[ -f "${ROOT}/.env.e2e" ]]; then
    local tmp_env
    tmp_env="$(mktemp "${TMPDIR:-/tmp}/charmr-e2e-maestro-XXXXXX")"
    if grep -q '^CHARMR_E2E_RELAX_IMAGE_PICKER=' "${ROOT}/.env.e2e"; then
      sed 's/^CHARMR_E2E_RELAX_IMAGE_PICKER=.*/CHARMR_E2E_RELAX_IMAGE_PICKER=true/' "${ROOT}/.env.e2e" > "${tmp_env}"
    else
      cat "${ROOT}/.env.e2e" > "${tmp_env}"
      printf '\nCHARMR_E2E_RELAX_IMAGE_PICKER=true\n' >> "${tmp_env}"
    fi
    echo "Using ENVFILE=${tmp_env} (RELAX inject on for Maestro stub/02 + flow 28; delete temp after build)."
    env ENVFILE="${tmp_env}" npx react-native run-ios "${run_ios_args[@]}"
    rm -f "${tmp_env}"
  else
    npx react-native run-ios "${run_ios_args[@]}"
  fi
}

ensure_ios_simulator
if [[ "${SKIP_BUILD}" != "1" ]]; then
  ensure_xcode_sim_destination
  ensure_metro
  build_and_install_ios
else
  echo 'CHARMR_E2E_SKIP_BUILD=1 — skipping run-ios (app must already be installed).'
  # Debug builds load JS from Metro; without it the simulator may run a stale bundle.
  ensure_metro
fi

echo 'Running Maestro (iOS only)...'
echo 'Note: Flows that add matches, coach chat, feedback/support POST, or dev saturate need a running API (see docs/E2E_FLOWS.md). Simulator must reach API_BASE_URL / LOCAL_IP from .env.'
shopt -s nullglob
flows=( "${ROOT}/.maestro"/[0-9][0-9]_*.yaml )
if [[ ${#flows[@]} -eq 0 ]]; then
  echo 'No numbered flows found under .maestro/[0-9][0-9]_*.yaml' >&2
  exit 1
fi
# macOS ships Bash 3.2 — no `mapfile`; build sorted array for Maestro argv.
flows_sorted=()
while IFS= read -r line; do
  [[ -n "${line}" ]] && flows_sorted+=("${line}")
done < <(printf '%s\n' "${flows[@]}" | LC_ALL=C sort)
exec maestro test -p ios "${flows_sorted[@]}"
