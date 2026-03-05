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

async function fetchRemoteBundle(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Remote bundle fetch failed with status ${response.status}`,
    );
  }
  return response.arrayBuffer();
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  return bytes.buffer;
}

mcpBundleRoutes.get("/", async (c) => {
  const remoteUrl = process.env.MCP_BUNDLE_URL || DEFAULT_CDN_URL;

  // Prefer remote source for consistency across environments.
  try {
    const remoteData = await fetchRemoteBundle(remoteUrl);
    return c.newResponse(remoteData, 200, DOWNLOAD_HEADERS);
  } catch (error) {
    console.warn(
      "[mcp-bundle] Remote fetch failed, falling back to local file",
      {
        remoteUrl,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  // Fallback to local file if remote fetch fails.
  try {
    const data = await readFile(BUNDLE_PATH);
    return c.newResponse(bufferToArrayBuffer(data), 200, DOWNLOAD_HEADERS);
  } catch (error) {
    console.error("[mcp-bundle] Failed to load both remote and local bundle", {
      remoteUrl,
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
