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
