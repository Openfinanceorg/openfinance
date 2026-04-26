import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = resolve(__dirname, "../../../skill/SKILL.md");

const skillRoutes = new Hono();

skillRoutes.get("/", async (c) => {
  try {
    const data = await readFile(SKILL_PATH, "utf8");
    const download = c.req.query("download") === "1";
    return c.newResponse(data, 200, {
      "Content-Type": "text/markdown; charset=utf-8",
      ...(download
        ? { "Content-Disposition": 'attachment; filename="SKILL.md"' }
        : {}),
    });
  } catch (error) {
    console.error("[skill] SKILL.md not found", {
      localPath: SKILL_PATH,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "SKILL.md not found." }, 404);
  }
});

export default skillRoutes;
