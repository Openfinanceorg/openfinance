import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { db } from "../db";
import { user as userTable } from "../schema";
import { eq } from "drizzle-orm";

const meRoutes = new Hono<AuthEnv>();

meRoutes.use("*", requireAuth);

// POST /api/me/dismiss-onboarding
meRoutes.post("/dismiss-onboarding", async (c) => {
  const user = c.get("user");

  await db
    .update(userTable)
    .set({ onboardingDismissedAt: new Date() })
    .where(eq(userTable.id, user.id));

  return c.json({ ok: true });
});

export default meRoutes;
