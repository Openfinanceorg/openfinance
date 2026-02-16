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

export default accountRoutes;
