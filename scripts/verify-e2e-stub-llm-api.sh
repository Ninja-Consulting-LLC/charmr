#!/usr/bin/env bash
# Confirms POST /api/generate-reply returns the deterministic stub body when the API
# runs with CHARMR_E2E_STUB_LLM=true (development auth bypass).
# Usage: npm run test:e2e:verify-stub-api
#        API_BASE_URL=http://127.0.0.1:3002 npm run test:e2e:verify-stub-api
set -euo pipefail

BASE="${API_BASE_URL:-http://127.0.0.1:3001}"
if ! curl -sf "${BASE}/health" >/dev/null; then
  echo "No API at ${BASE}/health (set API_BASE_URL if needed)." >&2
  exit 1
fi

USER_ID="e2e-stub-verify-$(date +%s)"
create_user() {
  curl -sf -X POST "${BASE}/api/users" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"${USER_ID}\",\"name\":\"E2E Stub Verify\",\"installationId\":\"${USER_ID}\"}" >/dev/null
}

if ! create_user; then
  echo "Failed to POST /api/users (need development NODE_ENV on API and a writable sqlite DB)." >&2
  exit 1
fi

resp="$(curl -sf -X POST "${BASE}/api/generate-reply" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"${USER_ID}\",\"prompt\":\"e2e stub ping\",\"skipRateLimiting\":true,\"mode\":\"coach\"}")"

if ! echo "${resp}" | grep -q '\[E2E_STUB\]'; then
  echo "Expected stub reply containing [E2E_STUB]; got:" >&2
  echo "${resp}" >&2
  echo "" >&2
  echo "Start the API with CHARMR_E2E_STUB_LLM=true (see npm run test:e2e:stub-api-server)." >&2
  exit 1
fi

echo "OK: ${BASE} generate-reply returned E2E stub (CHARMR_E2E_STUB_LLM active)"
