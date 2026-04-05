# Decision gates (resolve before large churn)

1. **Workspaces:** npm workspaces (current) vs pnpm — locked to **npm** for this repo.
2. **Persistence:** Production is **Firestore**; SQLite is **dev/test** unless explicitly documented otherwise.
3. **E2E primary framework:** Choose **Maestro** (fast smoke) or **Detox** (deeper RN sync) before investing in CI runners.
4. **Contracts:** Source of truth for API DTOs is **`@charmr/shared`**; extend with Zod/OpenAPI in shared when ready.
5. **Expo:** **Out of scope** unless promoted to a separate initiative (keyboard extension complexity).
