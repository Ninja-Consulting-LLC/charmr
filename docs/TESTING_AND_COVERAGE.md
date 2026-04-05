# Testing and coverage matrix

## Pyramid

- **Unit / component:** Jest + RNTL (mobile); Jest + mocks (backend).
- **Integration:** Firebase emulators + API tests (`__tests__/integration/`); backend tests with `DATABASE_TYPE=sqlite`.
- **E2E:** Maestro on iOS Simulator — catalog in [`docs/E2E_FLOWS.md`](E2E_FLOWS.md). `npm run test:e2e` runs numbered `.maestro/[0-9][0-9]_*.yaml` (merged journeys; see catalog); `npm run test:e2e:verify-api` curls the API (support payload includes **`phone`** alongside email and message); `npm run test:e2e:stub-llm` runs `.maestro/stub/` with `CHARMR_E2E_STUB_LLM=true` on the API. Optional handoffs: `.maestro/optional/` (OAuth, screenshot deep link). RC purchase, push, and keyboard extension remain manual or future XCTest. Workflow dispatch smoke: `.github/workflows/e2e-ios.yml`.

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
