# Charmr — product & engineering backlog

Living backlog for near-term work and longer-term ideas.  
**Last reviewed:** 2026-04-02 · **Branch:** `feature/modernization`

For how to build and test the repo, see [`AGENTS.md`](AGENTS.md). For E2E catalog, see [`docs/E2E_FLOWS.md`](docs/E2E_FLOWS.md).

---

## Baseline shipped (modernization effort)

The following are **in the current tree** (not open work):

| Area | Notes |
|------|--------|
| **Monorepo** | npm workspaces; [`packages/shared`](packages/shared) (`@charmr/shared`) for enums, plan limits, generate-reply DTOs |
| **Backend** | LLM provider layer; reply pipeline split; SQLite path for dev/CI; repository and test hardening |
| **Mobile** | Consumes shared types; axios timeout; Jest with native mocks + navigation wrapper; component tests aligned to current UI |
| **CI / deploy** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`deploy-render.yml`](.github/workflows/deploy-render.yml); root [`render.yaml`](render.yaml) |
| **Firebase** | Single root [`firebase.json`](firebase.json); [`firebase/README.md`](firebase/README.md) |
| **E2E** | [`.maestro/`](.maestro/) flows, [`scripts/`](scripts/), [`.env.e2e`](.env.e2e) variants (picker stub vs native) |

---

## In progress / next up

Priority items to pick up next (no strict ordering unless noted).

- [ ] **Subscriptions:** Handle cancellation with a clear **grace period** (access, messaging, RevenueCat edge cases).
- [ ] **Logging:** Production-grade logging; strip or gate verbose debug logs in release builds.
- [ ] **API errors:** Centralized, consistent handling for failing API calls (user-visible recovery, retry where appropriate).
- [ ] **Coach UX:** Offer opening the **reply modal** from dating-coach mode to **regenerate** a response.
- [ ] **Reply modal:** **Delete screenshot** toggle / state behaves poorly — fix persistence and UX.
- [ ] **Account linking:** **Apple Sign In** — fix linking to an existing account.
- [ ] **Account linking:** **Google Sign In** — verify and fix linking to an existing account.
- [ ] **Background work:** Generation continues or results apply if the user **leaves the app** (constraints: OS, push vs polling).

---

## Platform, growth, and App Store

- [ ] **Firebase console:** Bring **Android app** registration/config in Firebase in line with iOS (keys, SHA, package).
- [ ] **Referrals:** Friend referral program or deep link flow.
- [ ] **App Store:** Prompt or flow to **leave a review** / feedback in the App Store.
- [ ] **Onboarding media:** Replace or refresh **keyboard activation** GIF/tutorial assets.
- [ ] **Permissions nudges:** Notifications when **keyboard** or **push** permissions need an update (settings deep link).

---

## Data & ML (later)

- [ ] **Data tagging:** Design for datasets that could support future model training (privacy, consent, retention).
- [ ] **Model controls:** Dynamic **temperature** (or similar) exposed safely in product.

---

## Future features (not scheduled)

Larger bets — capture for roadmap; break into epics when prioritized.

- Coach **continuity** between in-app coach and SMS / off-platform texting.
- **Multiple photos** in one generation flow (product + limits + UI).
- **Custom coach personas** (e.g. playful vs serious) or user-tuned instructions.
- **Organization tools:** Tags, pipeline, or lightweight scheduling around matches/dates.
- **Conversation intelligence:** Coach nudges toward a **date**, **moving to text**, or **leaving the platform** when appropriate.
- **Voting** on generated messages (quality signal).
- **Multilingual** support and auto-detect for non-English threads.
- **History** of previously generated openers (per user, with privacy limits).
- **Dating playbooks** (templates or guided strategies).

---

## How to use this file

- Move items **up** into “In progress / next up” when they are actively staffed.
- Check off with `[x]` when merged to the mainline branch you ship from.
- Prefer **issues** for execution detail; keep this file as a **single glance** backlog.
