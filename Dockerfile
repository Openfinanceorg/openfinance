FROM node:22-slim AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY server/package.json server/
COPY shared/package.json shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS production
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server/ server/
COPY shared/ shared/
EXPOSE 3000
WORKDIR /app/server
CMD ["node", "--import", "tsx", "src/index.ts"]
