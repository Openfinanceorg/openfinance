import { Hono } from "hono";
import { Products, CountryCode } from "plaid";
import { plaidClient } from "$lib/sync/plaid.client";
import { requireAuth, type AuthEnv } from "$lib/middleware";
import { db } from "../db";
import {
  accountConnections,
  financialAccounts,
  institutionRegistry,
} from "../schema";
import { eq } from "drizzle-orm";

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
plaidRoutes.post("/exchange_public_token", async (c) => {
  const user = c.get("user");
  const { public_token, institution_id } = await c.req.json<{
    public_token: string;
    institution_id?: string;
  }>();

  // Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token,
  });
  const { access_token, item_id } = exchangeResponse.data;

  // Get institution info
  let institutionName = "Unknown Institution";
  let institutionLogo: string | null = null;
  let registryId: number | null = null;

  if (institution_id) {
    try {
      const instResponse = await plaidClient.institutionsGetById({
        institution_id,
        country_codes: [CountryCode.Us, CountryCode.Ca],
        options: { include_optional_metadata: true },
      });
      institutionName = instResponse.data.institution.name;
      institutionLogo = instResponse.data.institution.logo ?? null;
    } catch {
      // ignore - use defaults
    }

    // Find in registry
    const registryRows = await db
      .select()
      .from(institutionRegistry)
      .where(
        eq(institutionRegistry.providerCompositeKey, `plaid_${institution_id}`),
      )
      .limit(1);

    if (registryRows.length > 0) {
      registryId = registryRows[0].id;
    }
  }

  // Create account connection
  const [connection] = await db
    .insert(accountConnections)
    .values({
      userId: user.id,
      provider: "plaid",
      institutionRegistryId: registryId,
      plaidItemId: item_id,
      plaidAccessToken: access_token,
      status: "active",
    })
    .returning();

  // Fetch and store accounts
  const accountsResponse = await plaidClient.accountsGet({ access_token });

  for (const account of accountsResponse.data.accounts) {
    await db
      .insert(financialAccounts)
      .values({
        userId: user.id,
        accountConnectionId: connection.id,
        providerAccountId: account.account_id,
        name: account.name,
        officialName: account.official_name ?? null,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance: account.balances.current?.toString() ?? null,
        availableBalance: account.balances.available?.toString() ?? null,
        isoCurrencyCode: account.balances.iso_currency_code ?? null,
      })
      .onConflictDoUpdate({
        target: [
          financialAccounts.accountConnectionId,
          financialAccounts.providerAccountId,
        ],
        set: {
          name: account.name,
          officialName: account.official_name ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          mask: account.mask ?? null,
          currentBalance: account.balances.current?.toString() ?? null,
          availableBalance: account.balances.available?.toString() ?? null,
          isoCurrencyCode: account.balances.iso_currency_code ?? null,
          updatedAt: new Date(),
        },
      });
  }

  return c.json({ message: "Account connected successfully" });
});

export default plaidRoutes;
