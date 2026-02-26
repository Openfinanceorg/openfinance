import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = resolve(__dirname, "../../../mcp-server/openfinance.mcpb");

// TODO: Update this once we have a CDN url
const DEFAULT_CDN_URL =
  "https://unpkg.com/@openfinance-sh/mcp@latest/openfinance.mcpb";

const mcpBundleRoutes = new Hono();

mcpBundleRoutes.get("/", async (c) => {
  const cdnUrl = process.env.MCP_BUNDLE_URL;

  // In production (or when CDN URL is set), redirect to CDN
  if (cdnUrl || process.env.NODE_ENV === "production") {
    return c.redirect(cdnUrl || DEFAULT_CDN_URL, 302);
  }

  // In development, serve from local file
  try {
    const data = await readFile(BUNDLE_PATH);
    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Disposition", 'attachment; filename="openfinance.mcpb"');
    return c.body(data);
  } catch {
    return c.json(
      { error: "Bundle not found. Run `pnpm bundle` in mcp-server/ first." },
      404,
    );
  }
});

export default mcpBundleRoutes;
