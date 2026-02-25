## How to test

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

## How to run scripts
Write a script manually for testing and execute it from the server directory.

```sh
cd server
npx tsx src/scripts/sync-accounts.ts list <email>
```
