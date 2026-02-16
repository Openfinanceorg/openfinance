import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../lib/middleware";
import { db } from "../db";
import {
  financialAccounts,
  accountConnections,
  institutionRegistry,
} from "../schema";
import { eq } from "drizzle-orm";
import type { ConnectedAccount } from "@shared/types";

const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use("*", requireAuth);

// GET /api/accounts
accountRoutes.get("/", async (c) => {
  const user = c.get("user");

  const rows = await db
    .select({
      account: financialAccounts,
      connectionId: accountConnections.id,
      provider: accountConnections.provider,
      institutionName: institutionRegistry.name,
      institutionLogo: institutionRegistry.logo,
    })
    .from(financialAccounts)
    .innerJoin(
      accountConnections,
      eq(financialAccounts.accountConnectionId, accountConnections.id),
    )
    .leftJoin(
      institutionRegistry,
      eq(accountConnections.institutionRegistryId, institutionRegistry.id),
    )
    .where(eq(financialAccounts.userId, user.id));

  const accounts: ConnectedAccount[] = rows.map((row) => ({
    id: row.account.id,
    name: row.account.name,
    officialName: row.account.officialName,
    type: row.account.type,
    subtype: row.account.subtype,
    mask: row.account.mask,
    currentBalance: row.account.currentBalance,
    availableBalance: row.account.availableBalance,
    isoCurrencyCode: row.account.isoCurrencyCode,
    institutionName: row.institutionName ?? "Unknown",
    institutionLogo: row.institutionLogo ?? null,
    connectionId: row.connectionId,
    provider: row.provider,
  }));

  return c.json({ accounts });
});

export default accountRoutes;
