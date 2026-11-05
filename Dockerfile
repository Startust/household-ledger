FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY web/package.json ./web/package.json
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
COPY test ./test
COPY web ./web
COPY assets ./assets
RUN npm run build && npm prune --omit=dev

FROM base AS runtime
COPY LICENSE THIRD_PARTY_NOTICES.md ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/src ./dist/src
COPY --from=build --chown=node:node /app/web/dist ./web/dist
COPY --from=build --chown=node:node /app/assets ./assets
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node web/package.json ./web/package.json
COPY --chown=node:node prisma ./prisma
USER node
EXPOSE 8000
CMD ["node", "dist/src/main.js"]
