import "./env.js";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import authRoutes from "./routes/auth.js";

const app = new Hono();

app.use("*", logger());

// API routes
app.route("/api/auth", authRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/", (c) => c.text("ImATeapot2", 418));

// Serve static client files
app.use("/*", serveStatic({ root: "../client-dist" }));

// SPA fallback
app.get("/*", serveStatic({ root: "../client-dist", path: "index.html" }));

const port = parseInt(process.env.PORT || "3000");
console.log(`Server running on port ${port}`);
serve({ fetch: app.fetch, port });
