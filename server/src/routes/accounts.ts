import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { financialAccountService } from "../lib/financial-account.service";

const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use("*", requireAuth);

// GET /api/accounts
accountRoutes.get("/", async (c) => {
  const user = c.get("user");
  const accounts = await financialAccountService.getAccountsByUserId(user.id);
  return c.json({ accounts });
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
