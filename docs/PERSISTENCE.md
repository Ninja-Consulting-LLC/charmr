# Backend persistence strategy

| Mode | `DATABASE_TYPE` | Use case |
|------|-----------------|----------|
| **Firestore** | `firestore` (default) | Production / staging; real Firebase project. |
| **SQLite** | `sqlite` | Local development and most automated tests (`DATABASE_TYPE=sqlite`). |

**Production expectation:** Render and other hosts should set `DATABASE_TYPE=firestore` and real Firebase credentials. The repo-root [`render.yaml`](../render.yaml) sets `DATABASE_TYPE=firestore` and does **not** mount a persistent disk (Firestore does not need it). If an older Render service still has a SQLite disk attached, remove it in the dashboard to avoid paying for unused storage.

**Code path:** `backend/src/config/database.ts` selects the repository stack; `backend/src/db/index.ts` implements the `Database` facade for Firestore.
