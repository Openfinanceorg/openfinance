import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Products, CountryCode } from "plaid";
import { plaidClient } from "$lib/sync/plaid.client";
import { plaidService } from "$lib/sync/plaid.service";
import { requireAuth, type AuthEnv } from "$lib/middleware";
import { db } from "../db";
import { accountConnections } from "../schema";

const exchangeTokenSchema = z.object({
  public_token: z.string(),
  institution_id: z.string().optional(),
});

const plaidRoutes = new Hono<AuthEnv>();

plaidRoutes.use("*", requireAuth);

// POST /api/plaid/create_link_token
plaidRoutes.post("/create_link_token", async (c) => {
  const user = c.get("user");

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "Open Finance",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us, CountryCode.Ca],
    language: "en",
  });

  return c.json({ link_token: response.data.link_token });
});

// POST /api/plaid/exchange_public_token
plaidRoutes.post(
  "/exchange_public_token",
  zValidator("json", exchangeTokenSchema),
  async (c) => {
    const user = c.get("user");
    const { public_token, institution_id } = c.req.valid("json");

    // Exchange public token for access token
    const { accessToken, itemId } =
      await plaidService.exchangePublicToken(public_token);

    // Get institution info and registry ID
    let registryId: number | null = null;
    if (institution_id) {
      try {
        await plaidService.getInstitutionInfo(institution_id);
      } catch {
        // ignore - use defaults
      }
      registryId = await plaidService.findRegistryId(institution_id);
    }

    // Create account connection
    const [connection] = await db
      .insert(accountConnections)
      .values({
        userId: user.id,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: itemId,
        plaidAccessToken: accessToken,
        status: "active",
      })
      .returning();

    // Sync accounts and create transaction sync job
    await plaidService.performInitialSync({
      connectionId: connection.id,
      userId: user.id,
      accessToken,
    });

    return c.json({ message: "Account connected successfully" });
  },
);

export default plaidRoutes;
