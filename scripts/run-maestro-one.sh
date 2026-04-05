#!/usr/bin/env bash
# Run a single Maestro flow by basename (no .yaml). Example:
#   npm run test:e2e:flow -- 01_login_cold_start
# Requires: iOS Simulator booted, app installed, Maestro on PATH.
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
  echo 'Maestro iOS flows require macOS.' >&2
  exit 1
fi

export PATH="${MAESTRO_BIN}:${PATH}"
export MAESTRO_CLI_NO_ANALYTICS="${MAESTRO_CLI_NO_ANALYTICS:-1}"
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED="${MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED:-true}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ensure_metro_for_single_flow() {
  if [[ "${CHARMR_E2E_SKIP_METRO:-0}" == "1" ]]; then
    return 0
  fi
  if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
    return 0
  fi
  echo 'Starting Metro on 8081 (Debug bundle)...' >&2
  (cd "$ROOT" && npx react-native start >/tmp/charmr-metro-e2e.log 2>&1 &)
  local i=0
  while (( i < 120 )); do
    if curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
      echo 'Metro ready.' >&2
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  echo 'Metro failed to start; see /tmp/charmr-metro-e2e.log' >&2
  exit 1
}

ensure_metro_for_single_flow

FLOW="${1:-}"
if [[ -z "${FLOW}" ]]; then
  echo 'usage: npm run test:e2e:flow -- <flow_basename>' >&2
  echo 'example: npm run test:e2e:flow -- 05_support_feedback_exhaustive' >&2
  ls -1 "${ROOT}/.maestro/"*.yaml 2>/dev/null | xargs -I{} basename {} .yaml | sed 's/^/  /' >&2 || true
  exit 1
fi

FILE="${ROOT}/.maestro/${FLOW}.yaml"
if [[ ! -f "${FILE}" ]]; then
  echo "Flow file not found: ${FILE}" >&2
  exit 1
fi

echo "Running Maestro: ${FLOW}.yaml"
exec maestro test -p ios "${FILE}"
