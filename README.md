# OpenFinance App

Full-stack web app with Google OAuth authentication. Hono API server + SvelteKit SPA client backed by PostgreSQL.

**Stack:** Hono, SvelteKit, Drizzle ORM, Better Auth, PostgreSQL, Docker

## Quickstart

### Prerequisites

- Node.js 22+
- pnpm
- Docker

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure environment

```sh
cp .env.example .env
```

Fill in your Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

### 3. Start the app

```sh
pnpm db:migrate
pnpm dev
```

This starts Postgres in Docker, the API server on `:3000`, and SvelteKit on `:5173` (proxies `/api` to server).

## Adding shadcn-svelte components

We use [shadcn-svelte](https://next.shadcn-svelte.com/). To add a new component:

```sh
cd client
pnpm dlx shadcn-svelte@latest add <component-name>
```

Components are installed to `src/lib/components/ui/<component-name>/`.

## How to test

From the repo root:

```sh
cd server
pnpm vitest run -t "queryTransactions"
```

Run a specific test by name with `-t "pattern"`, e.g.:

```sh
pnpm vitest run -t "blocks mutation queries"
```

Run Scripts
```sh
cd server
npx tsx src/scripts/sync-accounts.ts list <email>
```
