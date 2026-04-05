# Migration and rollback runbooks

Use this template for risky changes (Firebase rules/indexes, shared DTOs, persistence toggles).

## Pre-flight

- [ ] Staging build green (CI + smoke tests).
- [ ] Backup or export critical data if schema-affecting.
- [ ] On-call / DRI identified.

## Deploy (forward)

1. Apply code or config change (PR merged).
2. If Firestore indexes: `firebase deploy --only firestore:indexes` from **repo root** (canonical `firebase.json`).
3. If rules: `firebase deploy --only firestore:rules`.
4. Deploy API (e.g. Render) with env vars verified.

## Verify

- [ ] `/health` OK.
- [ ] Sample `generate-reply` with sandbox or staging keys.
- [ ] Dashboards: error rate and latency stable (see `OBSERVABILITY.md`).

## Rollback

1. Revert deployment to previous release tag / Render manual rollback.
2. If indexes/rules: redeploy previous committed `firestore.indexes.json` / `firestore.rules` from known-good commit.
3. Confirm clients receive expected error shapes (no contract surprises).

## Escalation

Document team channel and owner in `OWNERSHIP_AND_PHASES.md`.
