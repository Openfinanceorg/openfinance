# OpenFin App

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
