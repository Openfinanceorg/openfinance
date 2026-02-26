import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { financialAccountService } from "../lib/financial-account.service";
import { db } from "../db";
import { apiKeys, user as userTable } from "../schema";
import { eq, isNotNull } from "drizzle-orm";

const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use("*", requireAuth);

// GET /api/accounts
accountRoutes.get("/", async (c) => {
  const user = c.get("user");
  const includeHidden = c.req.query("includeHidden") === "true";
  const includeStatus: ("active" | "hidden")[] = includeHidden
    ? ["active", "hidden"]
    : ["active"];
  const accounts = await financialAccountService.getAccountsByUserId(
    user.id,
    includeStatus,
  );

  // Fetch onboarding state
  const [[mcpRow], [userRow]] = await Promise.all([
    db
      .select({ lastUsedAt: apiKeys.lastUsedAt })
      .from(apiKeys)
      .where(
        eq(apiKeys.userId, user.id),
      )
      .limit(1),
    db
      .select({
        firstAccountConnectedAt: userTable.firstAccountConnectedAt,
        onboardingDismissedAt: userTable.onboardingDismissedAt,
      })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1),
  ]);

  const onboarding = {
    accountConnected: userRow?.firstAccountConnectedAt != null,
    mcpLinked: mcpRow?.lastUsedAt != null,
    dismissed: userRow?.onboardingDismissedAt != null,
  };

  return c.json({ accounts, onboarding });
});

// PATCH /api/accounts/:id/status
accountRoutes.patch("/:id/status", async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid account ID" }, 400);

  const body = await c.req.json<{ status?: string }>();
  if (body.status !== "active" && body.status !== "hidden") {
    return c.json({ error: "Status must be 'active' or 'hidden'" }, 400);
  }

  const updated = await financialAccountService.updateAccountStatus(
    id,
    user.id,
    body.status,
  );
  if (!updated) return c.json({ error: "Account not found" }, 404);

  return c.json({ success: true });
});

// DELETE /api/accounts/:id
accountRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid account ID" }, 400);

  const deleted = await financialAccountService.deleteAccount(id, user.id);
  if (!deleted) return c.json({ error: "Account not found" }, 404);

  return c.json({ success: true });
});

export default accountRoutes;
