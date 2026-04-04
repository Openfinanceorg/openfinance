# Deploying to Fly.io

## Prerequisites

- [Fly CLI](https://fly.io/docs/flyctl/install/) installed
- Fly.io account (`fly auth login`)

## One-time setup

```bash
# Create the Fly app
fly launch

# Create a managed Postgres cluster, name it openfinance-db
fly postgres create

# Attach DB to app (sets DATABASE_URL automatically).
fly postgres attach openfinance-db -a openfinance-app --database-name openfinance
```

## Create .env.prod

Create `.env.prod` based on `.env.example` with your production values. At minimum, include your Plaid API keys:

- `PLAID_CLIENT_ID`
- `PLAID_PROD_SECRET` (or `PLAID_SANDBOX_SECRET` for sandbox)

MX (`MX_API_KEY`, `MX_API_URL`, `MX_CLIENT_ID`) is optional.

## Set secrets

```bash
# Bulk import from .env.prod (skips DATABASE_URL and comments)
fly secrets import < .env.prod
```

Or set all secrets manually:

```bash
# Example: set required secrets manually
fly secrets set \
  KEY1=xxx \
  KEY2=xxx \
  KEY3=xxx
```

## Deploy

```bash
fly deploy
```

Migrations run automatically before each deploy via the `release_command` in `fly.toml`.

## Database access

```bash
# List managed Postgres clusters
fly mpg list

# Connect directly via psql
fly mpg connect <cluster-id>

# Proxy to localhost for local tools
fly mpg proxy <cluster-id>
# Then connect: psql postgres://user:password@localhost:5432/openfinance
```

## Verify

```bash
# Check release command / migration logs
fly logs

# Health check
curl https://openfinance-api.fly.dev/api/health
```
