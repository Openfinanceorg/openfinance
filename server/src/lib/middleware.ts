import { createMiddleware } from "hono/factory";
import crypto from "node:crypto";
import { auth } from "../auth.js";
import { db } from "../db.js";
import { apiKeys, user as userTable } from "../schema.js";
import { eq } from "drizzle-orm";

export type AuthEnv = {
  Variables: {
    user: { id: string; name: string; email: string; image?: string | null };
  };
};

async function authenticateApiKey(authHeader: string): Promise<{
  id: string;
  name: string;
  email: string;
  image?: string | null;
} | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token.startsWith("sk-")) return null;

  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const [row] = await db
    .select({
      keyId: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) return null;

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.keyId))
    .then(
      () => {},
      () => {},
    );

  // Look up the user
  const [u] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      firstMcpLinkedAt: userTable.firstMcpLinkedAt,
    })
    .from(userTable)
    .where(eq(userTable.id, row.userId))
    .limit(1);

  // Set firstMcpLinkedAt if not already set (fire-and-forget)
  if (u && !u.firstMcpLinkedAt) {
    db.update(userTable)
      .set({ firstMcpLinkedAt: new Date() })
      .where(eq(userTable.id, u.id))
      .then(
        () => {},
        () => {},
      );
  }

  if (!u) return null;
  return u;
}

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  // Try API key auth first
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer sk-")) {
    const apiUser = await authenticateApiKey(authHeader);
    if (apiUser) {
      c.set("user", apiUser);
      return next();
    }
    return c.json({ error: "Invalid API key" }, 401);
  }

  // Fall back to session auth
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  await next();
});
