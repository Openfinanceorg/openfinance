# OpenFinance

Open-source financial data for any AI.

OpenFinance lets you connect your financial accounts once and use that data with
the AI tools you choose. Ask Claude, ChatGPT, OpenClaw, Cursor, local agents, or
any MCP client about spending, subscriptions, balances, rewards, and trends
without locking your financial data into one platform.

OpenFinance is not an AI provider. It gives your AI a safe way to read your
financial data.

## Why OpenFinance

- **Use any AI you want.** Use Claude, ChatGPT, OpenClaw, local models, or any
  MCP client.
- **Own the data layer.** Use the hosted app or self-host the stack yourself.
- **Understand your spending.** Query accounts and transactions, inspect
  merchants, compare months, and find patterns.
- **Avoid platform lock-in.** Your financial data should be useful outside one
  app, one chatbot, or one vendor.

## How it works

```text
Financial accounts
  -> OpenFinance sync and storage
  -> normalized accounts, balances, and transactions
  -> Skill, MCP server, or REST API
  -> your chosen AI
```

1. Connect accounts through configured financial data providers such as Plaid,
   MX, and Quiltt/Mastercard-backed connections.
2. OpenFinance syncs and normalizes account and transaction data into your
   database.
3. You create an API key from the app's Connect tab.
4. Your AI reads financial data through a Skill, the OpenFinance MCP server, or
   the REST API.
5. You ask questions in the AI tool you already use.

## What you can ask

Example questions:

- How much did I spend on food last month?
- What are my biggest recurring subscriptions?
- Which merchants did I spend the most money with this quarter?
- How is my spending trending over the last three months?
- Which card should I use for better rewards in this category?
- What large or unusual transactions happened recently?
- How much cash is available across my checking and savings accounts?
- Which transactions should I review for reimbursement?

Rewards tracking, categorization, and habit detection are built from the account
and transaction data OpenFinance exposes.

## Data available to AI

OpenFinance currently exposes:

- Connected financial accounts
- Institution names and account metadata
- Current and available balances
- Transactions
- Merchant and transaction names
- Amounts, dates, pending status, and currency
- Read-only SQL queries over transactions for aggregation and analysis

The main AI-facing tools are:

- `get_accounts` - list connected accounts with balances and institution info
- `get_transactions` - search and filter transactions
- `query_transactions` - run read-only SQL against normalized transactions

## Connect your AI

### Skill

The app's Connect tab provides an OpenFinance Skill with setup instructions for
compatible agents. The Skill uses your OpenFinance API key and can call the
OpenFinance API directly.

```sh
export OPENFINANCE_API_KEY="sk-..."
```

### MCP

The MCP server is published as
[`@openfinance-sh/mcp`](https://www.npmjs.com/package/@openfinance-sh/mcp).
Use it with any MCP client that can run a local stdio server.

```json
{
  "mcpServers": {
    "openfinance": {
      "command": "npx",
      "args": ["-y", "@openfinance-sh/mcp"],
      "env": {
        "OPENFINANCE_API_KEY": "sk-...",
        "OPENFINANCE_URL": "https://api.openfinance.sh"
      }
    }
  }
}
```

### REST API

Agents and custom workflows can call the OpenFinance API directly with a bearer
token.

```sh
curl https://api.openfinance.sh/api/accounts \
  -H "Authorization: Bearer $OPENFINANCE_API_KEY"
```

See the [OpenFinance Skill](skill/SKILL.md) for API examples and query shapes.

## Quick start

### Hosted app

1. Go to [app.openfinance.sh](https://app.openfinance.sh).
2. Sign in and connect a financial account.
3. Open the Connect tab.
4. Copy the Skill, MCP config, or API key.
5. Ask your AI about your finances.

### Self-hosted development

Prerequisites:

- Node.js 22+
- pnpm
- Docker

Install dependencies:

```sh
pnpm install
```

Configure environment:

```sh
cp .env.example .env
```

Start Postgres, run migrations, and launch the app:

```sh
docker compose up -d
pnpm db:migrate
pnpm dev
```

The API server runs on `:3000`. The SvelteKit client runs on `:5173` and proxies
`/api` to the server.

More setup details are in [docs/development.md](docs/development.md).

## Documentation

- [Development](docs/development.md) - local setup, scripts, tests, and
  component development
- [Deployment](docs/deployment.md) - deploying to Fly.io
- [MCP server](docs/mcp-server.md) - publishing and registry notes for the MCP
  package
- [Skill](skill/SKILL.md) - API examples for agents

## Stack

- Hono
- SvelteKit
- Drizzle ORM
- Better Auth
- PostgreSQL
- Docker
- Model Context Protocol

## Security and privacy

OpenFinance gives AI tools read-only access to your financial data.

- Bank authentication is handled by financial data providers; your bank
  credentials do not touch OpenFinance servers.
- API keys control what your AI client can read from OpenFinance.
- OpenFinance does not require you to use a specific AI provider.
- You can self-host the app and database.
- The project is open source so the data flow can be inspected and modified.

Do not share your OpenFinance API key with tools or agents you do not trust.
Anyone with a valid API key can read the financial data exposed by that key.

## Contributing

Contributions are welcome across code, docs, tests, connectors, MCP support, and
examples. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution and licensing
notes.

## License

The OpenFinance app is licensed under `AGPL-3.0-only`.

See [LICENSE](LICENSE) for the full license text.
