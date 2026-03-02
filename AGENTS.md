# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Charmr is an AI-powered dating assistant built as a React Native mobile app with a Node.js/Express backend API and a static marketing website. The repo is a monorepo with three packages:

| Service | Directory | Port | Start command |
|---------|-----------|------|---------------|
| Backend API | `backend/` | 3001 | `cd backend && DATABASE_TYPE=sqlite npm run dev` |
| Marketing website | `website/` | 3000 | `cd website && npm start` |
| React Native app | root (`/`) | 8081 (Metro) | `npm start` (requires iOS/Android emulator) |

### Backend development

- The backend supports two database modes: `firestore` (default, requires real Firebase credentials) and `sqlite` (local dev). Always set `DATABASE_TYPE=sqlite` in `backend/.env` for local development.
- A dummy `backend/service-account.json` is required even when using SQLite, because Firebase Admin SDK initializes at import time regardless of `DATABASE_TYPE`. Generate one with `openssl genpkey` (see setup notes).
- Set `OPENAI_SANDBOX_MODE=true` and `GEMINI_SANDBOX_MODE=true` in `backend/.env` to run the server without real API keys. Sandbox mode returns canned AI responses.
- The email transporter will log errors about SMTP connection failures; this is harmless without MailHog running.
- **Run backend tests**: `cd backend && DATABASE_TYPE=sqlite npm test` — some tests require real Firebase/Gemini credentials and will fail in the cloud VM (admin.test.ts, reply.test.ts).
- **Build backend**: `cd backend && npm run build`

### Frontend (React Native)

- **Lint**: ESLint 9 is installed but no `eslint.config.js` exists in the repo. `npm run lint` will fail until a flat config is added.
- **Tests**: `npm test` runs Jest with the `react-native` preset. Component tests require native module mocks that are incomplete; some will fail in a headless environment.
- The React Native app cannot be run on a cloud VM (requires iOS/Android emulator). Focus backend + website for cloud-based development.

### Useful commands

See `package.json` scripts in root, `backend/`, and `website/` for the full list. Key commands:

- `cd backend && npm test` — backend unit tests
- `cd backend && npm run build` — TypeScript compilation
- `cd backend && npm run dev` — dev server with hot-reload (nodemon)
- `cd website && npm start` — static site on port 3000
