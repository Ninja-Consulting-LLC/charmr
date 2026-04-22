#!/usr/bin/env bash
# Maestro flows that require CHARMR_E2E_STUB_LLM=true on the API process.
# Start backend with: CHARMR_E2E_STUB_LLM=true npm run dev (or equivalent) before running.
set -euo pipefail

if [[ -n "${JAVA_HOME:-}" && ! -x "${JAVA_HOME}/bin/java" ]]; then
  unset JAVA_HOME
fi

MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin}"
if [[ ! -x "${MAESTRO_BIN}/maestro" ]]; then
  echo "Maestro CLI not found at ${MAESTRO_BIN}/maestro" >&2
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
STUB_DIR="${ROOT}/.maestro/stub"
if [[ ! -d "${STUB_DIR}" ]]; then
  echo "No stub directory: ${STUB_DIR}" >&2
  exit 1
fi

flows=()
while IFS= read -r line; do
  [[ -n "${line}" ]] && flows+=("${line}")
done < <(find "${STUB_DIR}" -maxdepth 1 -name '*.yaml' | LC_ALL=C sort)
if [[ ${#flows[@]} -eq 0 ]]; then
  echo "No .yaml flows under ${STUB_DIR}" >&2
  exit 1
fi

echo "Running Maestro stub-LLM suite (${#flows[@]} flow(s)); API must have CHARMR_E2E_STUB_LLM=true" >&2
echo "  Start API: npm run test:e2e:stub-api-server   (or: CHARMR_E2E_STUB_LLM=true npm run dev -w charmr-backend)" >&2
echo "  Contract check (no Simulator): npm run test:e2e:verify-stub-api" >&2
# Run one flow per process so addMedia paths resolve relative to each flow file (Maestro #1707).
cd "${ROOT}"
for flow in "${flows[@]}"; do
  echo "Maestro: ${flow}" >&2
  maestro test -p ios "${flow}"
done
