#!/usr/bin/env bash
# Run the backend with deterministic generate-reply for Maestro stub flows.
# Use the same PORT as your iOS build (default 3001 in .env.e2e). Stop any other process on that port first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export CHARMR_E2E_STUB_LLM=true
export CHARMR_DEV_MOCK_EMAIL="${CHARMR_DEV_MOCK_EMAIL:-1}"
export DATABASE_TYPE=sqlite
export NODE_ENV=development
# Avoid ts-node OOM / flaky compile when nodemon watches from the monorepo root.
export TS_NODE_TRANSPILE_ONLY=1
echo "Starting charmr-backend with CHARMR_E2E_STUB_LLM=true (Ctrl+C to stop)." >&2
echo "Tip: run from repo root; npm -w runs package scripts with backend as cwd (sqlite paths)." >&2
exec npm run dev -w charmr-backend
