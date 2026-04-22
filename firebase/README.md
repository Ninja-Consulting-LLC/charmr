# Firebase CLI configuration

**Canonical config:** the repo-root [`firebase.json`](../firebase.json). Run Firebase CLI commands from the **repository root** (e.g. `firebase deploy`, `firebase emulators:start`).

The nested `firebase/` directory holds **rules and indexes** referenced by that file:

- `firebase/rules/firestore.rules`
- `firebase/rules/firestore.indexes.json`

Do not maintain a second `firebase.json` inside this folder; it caused path confusion and deploy mistakes.
