# Ownership and phase DRIs

Assign a **directly responsible individual** per area during modernization:

| Area | Typical owner |
|------|----------------|
| Mobile (RN, iOS/Android, keyboard) | Mobile DRI |
| Backend API & Firestore | Backend DRI |
| LLM / prompts / cost | AI DRI |
| CI / infra / Firebase deploy | Infra DRI |
| QA / release checklist | QA DRI |

**Must-have vs deferrable:** Tag issues/PRs so scope does not sprawl. Defer optional items (e.g. full Maestro suite) after critical path is green.

**Changelog:** Keep a short `docs/CHANGELOG-MODERNIZATION.md` or use GitHub Releases with links to merged PRs.
