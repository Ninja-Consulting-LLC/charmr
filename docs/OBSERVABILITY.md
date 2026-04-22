# Observability baseline (modernization)

Track these **before and after** large refactors:

| Signal | Where | Notes |
|--------|-------|--------|
| API 5xx / 4xx rate | Hosting / proxy logs | Split client vs server errors. |
| p95 latency (`/api/generate-reply`) | APM or log-derived | Watch regressions after LLM changes. |
| 429 / message-limit rate | App logs | Spikes may indicate client bugs or abuse. |
| LLM token usage & cost | Existing cost fields / logs | Compare to baseline after SDK upgrades. |
| Auth failures | Firebase / API logs | OAuth or token refresh issues. |
| Mobile crash-free sessions | Play Console / App Store / crash SDK | If integrated. |

Set **alert thresholds** in your hosting/monitoring tool; this repo does not ship provider-specific config.

## HTTP API (this backend)

| Endpoint | Role |
|----------|------|
| `GET /health` | **Liveness** — process is up; use for load balancer “is the Node process responding”. |
| `GET /health/ready` | **Readiness** — pings the configured database (SQLite `SELECT 1` or Firestore `users` probe). Fails with **503** if storage is unreachable. |

## Request correlation

- Middleware assigns or propagates **`X-Request-ID`** (incoming `x-request-id` is respected when non-empty).
- Response includes the same **`X-Request-ID`** header.
- Structured logs on the completion path include **`requestId`** where the request logger runs; the global error handler logs **`requestId`** on uncaught pipeline errors.

When debugging a user report, ask for **`X-Request-ID`** from client or proxy logs and grep server logs for that value.

## Log fields worth standardizing

| Field | Use |
|-------|-----|
| `userId` | Authenticated user / `req.body.userId` on generate-reply. |
| `matchId` | Match context when present. |
| `requestId` | Correlation (see above). |
| `duration` / status | Already on debug “Request completed” lines from `requestLogger`. |

## E2E smoke

`npm run test:e2e:verify-api` curls **`/health`**, **`/health/ready`**, checks **`X-Request-ID`** on `/health`, and **`POST /api/support`** (implemented in **`scripts/verify-e2e-support-api.sh`**).
