# AGENTS.md

Canonical guide for humans and coding agents working on Charmr.

## Repo layout (npm workspaces)

| Package | Path | Role |
|---------|------|------|
| **Mobile app** | repo root (`src/`, `ios/`, `android/`) | React Native |
| **Backend** | `backend/` | Express API |
| **Marketing site** | `website/` | Static site |
| **Shared types** | `packages/shared` (`@charmr/shared`) | Enums, plan limits, generate-reply DTOs |

**Do not** import `backend/src` from mobile — use `@charmr/shared` for shared contracts.

## Commands (run from repo root unless noted)

```bash
npm install                 # installs workspaces; builds @charmr/shared (postinstall)
npm run lint                # ESLint (mobile + shared TS at root scope; backend ignored — use backend build/test)
npm test                    # Jest (mobile)
npm run test:e2e            # Maestro E2E — numbered flows under `.maestro/` (macOS; `CHARMR_E2E_VERBOSE_IOS=0` for less build log noise; `CHARMR_E2E_SKIP_BUILD=1` still starts Metro for Debug JS)
npm run test:e2e:stub-llm   # Maestro stub flows under `.maestro/stub/` (API must set `CHARMR_E2E_STUB_LLM=true`)
npm run test:e2e:native-picker # Optional: system Photos picker on Home (`.env.e2e.native-picker`; not default CI)
npm run test:e2e:flow -- <name>   # Single flow: `.maestro/<name>.yaml` (see `docs/E2E_FLOWS.md`; Metro unless `CHARMR_E2E_SKIP_METRO=1`)
npm run test:e2e:verify-api # Curl `GET /health` + `POST /api/support` (local backend; use `CHARMR_DEV_MOCK_EMAIL=1` if no SMTP)
npm run test:e2e:verify-stub-api # Curl `POST /api/generate-reply` expects `[E2E_STUB]` (API must have `CHARMR_E2E_STUB_LLM=true`)
npm run test:e2e:stub-api-server # Foreground backend: sqlite + stub LLM + mock email (for `npm run test:e2e:stub-llm`)
# `.env.e2e` — default **`CHARMR_E2E_RELAX_IMAGE_PICKER=false`** (real Photos UI). `npm run test:e2e` builds with a **temp** env that forces **`RELAX=true`** for stub/02 + flow `28` only.
# `npm run ios:e2e-manual` — alternate env file for explicit manual builds (also `RELAX=false`). See `docs/E2E_FLOWS.md`.
npm run test:e2e:install-ios-runtime  # CLI: install iOS Simulator runtime matching Xcode SDK (if `showdestinations` is empty)
npm run test:e2e:scripts              # `bash -n` on Maestro/E2E shell scripts (same check as CI job `e2e-scripts`)
npm run build -w @charmr/shared
npm run build -w charmr-backend
DATABASE_TYPE=sqlite npm test -w charmr-backend
```

Metro watches `packages/shared` for workspace changes.

## Firebase

- **Single config:** repo root [`firebase.json`](firebase.json). See [`firebase/README.md`](firebase/README.md).
- Deploy rules/indexes from repo root: `npm run firebase:deploy:rules`, `npm run firebase:deploy:indexes`.

## Backend

- `DATABASE_TYPE=sqlite` for local dev and CI; `firestore` for production. See [`docs/PERSISTENCE.md`](docs/PERSISTENCE.md).
- Dummy `backend/service-account.json` may be required for Firebase Admin init (see `.env.example`).
- **Admin CLI:** `npm run add-admin -- <uid>`, `npm run remove-admin -- <uid>` (in `backend/`).

## Mobile

- **iOS image picker:** `patches/react-native-image-crop-picker+*.patch` — when only the Screenshots smart album is shown, open that album’s grid immediately (skip the single-row album list). Applied on `npm install` via **patch-package**.
- Long-running API calls use **120s** axios timeout (`src/services/axiosInstance.ts`).
- RN Firebase: auth uses modular-style imports from `@react-native-firebase/auth`; `RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS` in `App.tsx` is temporary — track full migration separately.

## Backlog

- [`TODO.md`](TODO.md) — product and engineering backlog (near-term vs future).

## Operational docs

- [`docs/DECISION_GATES.md`](docs/DECISION_GATES.md)
- [`docs/TESTING_AND_COVERAGE.md`](docs/TESTING_AND_COVERAGE.md)
- [`docs/MIGRATION_AND_ROLLBACK.md`](docs/MIGRATION_AND_ROLLBACK.md)
- [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md)
- [`docs/RELEASE_SAFETY.md`](docs/RELEASE_SAFETY.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/OWNERSHIP_AND_PHASES.md`](docs/OWNERSHIP_AND_PHASES.md)

## CI

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — shared build, backend test+build, mobile lint+test; `npm audit` uses `continue-on-error` for critical-only reporting.
- [`.github/workflows/deploy-render.yml`](.github/workflows/deploy-render.yml) — backend deploy to Render (paths-filtered).
- [`render.yaml`](render.yaml) — Render Blueprint at **repo root** (monorepo build, no SQLite disk; sync or mirror these settings in the dashboard).

## Secrets

Never commit `.env`, `service-account.json`, or API keys. See [`docs/SECURITY.md`](docs/SECURITY.md).
