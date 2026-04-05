#!/usr/bin/env bash
# Install iOS app with `.env.e2e.manual` (CHARMR_E2E_RELAX_IMAGE_PICKER=false) for real Photos picker QA.
# react-native-config reads ENVFILE at native build time — rebuild after changing the env file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVFILE="${ROOT}/.env.e2e.manual"
if [[ ! -f "${ENVFILE}" ]]; then
  echo "Missing ${ENVFILE}" >&2
  exit 1
fi

echo "Using ENVFILE=${ENVFILE} (real Photos picker; not for Maestro stub/02 or flow 28)." >&2
exec env ENVFILE="${ENVFILE}" npx react-native run-ios "$@"
