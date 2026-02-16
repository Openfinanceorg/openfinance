import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import crypto from "node:crypto";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { db } from "../db";
import { apiKeys } from "../schema";
import { eq, and, isNull } from "drizzle-orm";

const keyRoutes = new Hono<AuthEnv>();

keyRoutes.use("*", requireAuth);

// POST /api/keys — generate a new API key
keyRoutes.post(
  "/",
  zValidator("json", z.object({ name: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    const { name } = c.req.valid("json");

    // Generate a random key with sk- prefix
    const raw = crypto.randomBytes(32).toString("base64url");
    const plaintext = `sk-${raw}`;
    const prefix = plaintext.slice(0, 8);
    const keyHash = crypto.createHash("sha256").update(plaintext).digest("hex");

    const [key] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        keyHash,
        name: name ?? null,
        prefix,
      })
      .returning();

    return c.json({
      id: key.id,
      key: plaintext,
      prefix,
      name: key.name,
      createdAt: key.createdAt.toISOString(),
    });
  },
);

// GET /api/keys — list active keys (no secrets)
keyRoutes.get("/", async (c) => {
  const user = c.get("user");

  const keys = await db
    .select({
      id: apiKeys.id,
      prefix: apiKeys.prefix,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));

  return c.json({
    keys: keys.map((k) => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    })),
  });
});

// DELETE /api/keys/:id — revoke a key
keyRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"), 10);

  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
    .returning();

  if (!updated) {
    return c.json({ error: "Key not found" }, 404);
  }

  return c.json({ ok: true });
});

export default keyRoutes;
