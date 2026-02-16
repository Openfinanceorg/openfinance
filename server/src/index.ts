import "./env.js";
import { DBOS } from "@dbos-inc/dbos-sdk";
import "./workflows/index.js";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import authRoutes from "./routes/auth.js";
import institutionRoutes from "./routes/institutions.js";
import plaidRoutes from "./routes/plaid.js";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";
import keyRoutes from "./routes/keys.js";

const app = new Hono();

app.use("*", logger());

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/institutions", institutionRoutes);
app.route("/api/plaid", plaidRoutes);
app.route("/api/accounts", accountRoutes);
app.route("/api/transactions", transactionRoutes);
app.route("/api/keys", keyRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/", (c) => c.text("ImATeapot2", 418));

// Serve static client files
app.use("/*", serveStatic({ root: "../client-dist" }));

// SPA fallback
app.get("/*", serveStatic({ root: "../client-dist", path: "index.html" }));

const port = parseInt(process.env.PORT || "3000");

(async () => {
  DBOS.setConfig({
    name: "openfin-server",
    systemDatabaseUrl: process.env.DATABASE_URL,
  });
  await DBOS.launch();

  console.log(`Server running on port ${port}`);
  serve({ fetch: app.fetch, port });
})();
