# Build from repository root: docker compose build (context .., dockerfile backend/Dockerfile).
# Installs only @charmr/shared + backend (not the full RN mobile workspace).
FROM node:22-bookworm-slim

WORKDIR /app

COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/
WORKDIR /app/packages/shared
RUN npm install && npm run build

WORKDIR /app/backend
COPY backend/package.json backend/tsconfig.json ./
COPY backend/src ./src/
RUN sed -i 's|"@charmr/shared": "\*"|"@charmr/shared": "file:../packages/shared"|' package.json \
  && npm install --legacy-peer-deps \
  && npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
