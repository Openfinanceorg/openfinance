# Development

## Getting started

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

### Adding shadcn-svelte components

We use [shadcn-svelte](https://next.shadcn-svelte.com/). To add a new component:

```sh
cd client
pnpm dlx shadcn-svelte@latest add <component-name>
```

Components are installed to `src/lib/components/ui/<component-name>/`.

## Running scripts (development only)

From the repo root:

```sh
cd server
npx tsx src/scripts/sync-accounts.ts list <email>
```

Other scripts live under `server/src/scripts/` and can be run the same way: `npx tsx src/scripts/<script-name>.ts <args>`.

## Testing

### Vitest

From the repo root:

```sh
cd server
pnpm vitest run
```

Run tests matching a filename:

```sh
pnpm vitest run billing
```

Run a specific test by name with `-t "pattern"`:

```sh
pnpm vitest run -t "blocks mutation queries"
```

### Stripe testing

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Login: `stripe login`
3. Forward webhooks to the local server:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy the webhook signing secret (`whsec_...`) into your `.env` as `STRIPE_WEBHOOK_SECRET`.
