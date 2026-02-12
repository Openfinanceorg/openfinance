FROM node:22-slim AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS client-build
WORKDIR /app
COPY client/ client/
COPY tsconfig.json ./
RUN pnpm --filter client build

FROM base AS production
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server/ server/
COPY --from=client-build /app/client/build ./client-dist
EXPOSE 3000
WORKDIR /app/server
CMD ["node", "--import", "tsx", "src/index.ts"]
