# Security readiness

- **Secrets:** Never commit `service-account.json`, `.env`, or API keys. Rotate keys if exposure is suspected; see `.gitignore`.
- **CI:** Run `npm audit` regularly; consider `npm audit --production` on backend. Add optional `npm audit --audit-level=high` to CI when noise is manageable.
- **Admin scripts:** `npm run add-admin` / `remove-admin` require a UID argument (no hardcoded users in `package.json`).
- **Abuse:** Rate limits and auth middleware should be covered by integration tests where feasible; extend for auth bypass attempts and oversized payloads.
