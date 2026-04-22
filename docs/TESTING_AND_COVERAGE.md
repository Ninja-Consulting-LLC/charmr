# Testing and coverage matrix

## Pyramid

- **Unit / component:** Jest + RNTL (mobile); Jest + mocks (backend).
- **Integration (see below):** backend Jest hits real SQLite + service code; repo-root `__tests__/integration/` runs as part of **`npm test` in `backend/`** (not mobile Jest). Mobile `*.integration.test.ts` files are **ignored** by the app Jest config on purpose (manual or scripted).
- **E2E:** Maestro on iOS Simulator — catalog in [`docs/E2E_FLOWS.md`](E2E_FLOWS.md). `npm run test:e2e` runs numbered `.maestro/[0-9][0-9]_*.yaml` (merged journeys; see catalog); `npm run test:e2e:verify-api` curls the API (support payload includes **`phone`** alongside email and message); `npm run test:e2e:stub-llm` runs `.maestro/stub/` with `CHARMR_E2E_STUB_LLM=true` on the API. Optional handoffs: `.maestro/optional/` (OAuth, screenshot deep link). RC purchase, push, and keyboard extension remain manual or future XCTest. Workflow dispatch smoke: `.github/workflows/e2e-ios.yml`.

### Integration tests today

| What | Where | How to run |
|------|--------|------------|
| DB + reply flow (mocked LLM) | [`__tests__/integration/authFlow.test.ts`](../__tests__/integration/authFlow.test.ts) | `cd backend && npm test` (backend Jest `roots` include `../__tests__`) |
| Match CRUD on SQLite adapter | [`backend/src/test/match.integration.test.ts`](../backend/src/test/match.integration.test.ts) | `cd backend && npm run test:match` or full `npm test` |
| HTTP surface | [`backend/src/test/routesHttp.test.ts`](../backend/src/test/routesHttp.test.ts) | `cd backend && npm test` |
| Manual fetch smoke vs running API | [`src/test/backend.integration.test.ts`](../src/test/backend.integration.test.ts) | Excluded from Jest; run with `ts-node` / `npx tsx` and `API_URL` if you want a live server check |

**Should we add more?** Yes, incrementally: (1) keep expanding backend integration tests for auth and rate limits against SQLite; (2) add a small **Docker smoke** job (`curl /health` + one authenticated route) in CI if Compose is part of your release path; (3) reserve Maestro for full-app journeys. Mobile “integration” without a device is mostly **RNTL + provider mocks** (e.g. deep link handler).

## Capability checklist (fill in owners)

| Capability | Unit | Integration | E2E | Manual | Owner |
|------------|------|-------------|-----|--------|-------|
| Anonymous + registered auth | | | ✅ skip/home `03`, menu register `26`; OAuth UI `02`,`11` | | |
| Google / Apple sign-in | | | | | |
| Generate reply (text) | | | | | |
| Generate reply (images) | | | ✅ stub `02`; home add/remove `28` | | |
| Coach mode | | | | | |
| Match CRUD | | | ✅ `07`, `24`, `25` | | |
| Limits / upgrade | | | | | |
| RevenueCat sync | | | | | |
| Push notifications | | | | | |
| Support contact | ✅ `SupportContactModal` | | ✅ `05`, `17` | | |
| iOS keyboard extension | | | | | |

Mark at least one **automated** layer per row where feasible; document **manual** where not (e.g. OAuth in CI).

## CI

- Root **`.github/workflows/ci.yml`**: shared build, backend test+build, mobile lint+test.
- Backend deploy workflow must not swallow lint failures.

## AI-assisted workflow (agents + humans)

Use this order so automated changes stay mergeable: **unit/component → API contract (`@charmr/shared`) → Maestro E2E**.

1. **Prefer deterministic unit tests** for pure logic and service modules (`src/utils/*`, `src/services/*`, `src/store/store.ts`). Mock `AsyncStorage`, `axiosInstance`, and Firebase at the file boundary; copy patterns from `src/services/__tests__/matchService.test.ts` or `src/utils/__tests__/matchUtils.test.ts`.
2. **Use RNTL + `renderWithProviders`** for UI that reads context (`src/test/test-utils.tsx`). Keep assertions on testIDs and user-visible outcomes so Maestro and Jest stay aligned.
3. **Treat Maestro as the journey layer** for flows that need the real simulator (onboarding, match list, support). When a bug is found in E2E, add or extend a **focused Jest test** at the lowest layer that can fail for the same reason, so the next agent does not need a device to guard the regression.
4. **Coverage gate**: `jest.config.js` `coverageThreshold` is a floor on **`collectCoverageFrom`** (see excludes for type-only barrels). Raising the floor is welcome after adding tests; do not raise it without new coverage.
5. **Commands**: `npm test`, `npm test -- --testPathPattern=matchUtils`, `npm run test:e2e:flow -- 07_coach_match_lifecycle` (see [`docs/E2E_FLOWS.md`](E2E_FLOWS.md)).
