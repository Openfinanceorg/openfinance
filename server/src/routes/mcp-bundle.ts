import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = resolve(__dirname, "../../../mcp-server/openfinance.mcpb");

const DEFAULT_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@openfinance-sh/mcp@latest/openfinance.mcpb";

const mcpBundleRoutes = new Hono();

const DOWNLOAD_HEADERS = {
  "Content-Type": "application/octet-stream",
  "Content-Disposition": 'attachment; filename="openfinance.mcpb"',
} as const;

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

mcpBundleRoutes.get("/", async (c) => {
  const remoteUrl = process.env.MCP_BUNDLE_URL || DEFAULT_CDN_URL;
  const useRemote =
    process.env.NODE_ENV === "production" || !!process.env.MCP_BUNDLE_URL;

  if (useRemote) {
    try {
      const response = await fetch(remoteUrl);
      if (!response.ok || !response.body) {
        console.error("[mcp-bundle] Remote bundle fetch failed", {
          remoteUrl,
          status: response.status,
        });
        return c.json({ error: "Failed to fetch MCP bundle." }, 502);
      }
      return c.newResponse(response.body, 200, DOWNLOAD_HEADERS);
    } catch (error) {
      console.error("[mcp-bundle] Remote bundle fetch failed", {
        remoteUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: "Failed to fetch MCP bundle." }, 502);
    }
  }

  try {
    const data = await readFile(BUNDLE_PATH);
    return c.newResponse(bufferToArrayBuffer(data), 200, DOWNLOAD_HEADERS);
  } catch (error) {
    console.error("[mcp-bundle] Local bundle not found", {
      localPath: BUNDLE_PATH,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json(
      { error: "Bundle not found. Run `pnpm bundle` in mcp-server/ first." },
      404,
    );
  }
});

export default mcpBundleRoutes;
