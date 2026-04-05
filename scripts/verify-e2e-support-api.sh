#!/usr/bin/env bash
# Quick contract check: POST /api/support returns 200 (use with CHARMR_DEV_MOCK_EMAIL=1 or real SMTP).
# Usage: npm run test:e2e:verify-api
set -euo pipefail
BASE="${API_BASE_URL:-http://127.0.0.1:3001}"
curl -sf "${BASE}/health" >/dev/null
curl -sf -X POST "${BASE}/api/support" \
  -H "Content-Type: application/json" \
  -d '{"userId":"e2e-verify","email":"e2e.verify@charmr.test","phone":"+15550100998","message":"Maestro verify script","plan":"free","dailyMessagesUsed":0,"dailyMessageLimit":5,"extraMessages":0}' \
  | grep -q 'Support request received'
echo "OK: ${BASE}/health and POST /api/support (development auth bypass)"
