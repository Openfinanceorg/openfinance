import { db } from "../db";
import { institutionRegistry } from "../schema";
import { ilike, eq, asc, and, sql } from "drizzle-orm";
import type { InstitutionType } from "@shared/types";

function mapToInstitutionType(
  row: typeof institutionRegistry.$inferSelect,
): InstitutionType {
  return {
    id: String(row.id),
    name: row.name,
    logo: row.logo,
    primaryColor: row.primaryColor,
    url: row.url,
    plaidData: row.plaidData ?? null,
    mxData: row.mxData ?? null,
    providers: [
      ...(row.plaidData ? (["plaid"] as const) : []),
      ...(row.mxData ? (["mx"] as const) : []),
    ],
    rank: row.countryRank ?? undefined,
  };
}

interface SearchParams {
  query?: string;
  limit?: number;
  provider?: string;
  accountType?: string;
  country?: string;
}

class InstitutionRegistryService {
  async searchInstitutions(params: SearchParams): Promise<InstitutionType[]> {
    const query = params.query || "";
    if (!query) {
      return this.getTopInstitutions(params);
    }

    const limit = Math.min(params.limit ?? 20, 50);
    const provider = params.provider || "all";
    const accountType = params.accountType || "all";

    const conditions = [ilike(institutionRegistry.name, `%${query}%`)];

    if (provider === "plaid") {
      conditions.push(sql`${institutionRegistry.plaidData} is not null`);
    } else if (provider === "mx") {
      conditions.push(sql`${institutionRegistry.mxData} is not null`);
    }

    if (accountType !== "all") {
      conditions.push(
        sql`${institutionRegistry.supportedAccountTypes}::jsonb @> ${JSON.stringify([accountType])}::jsonb`,
      );
    }

    const rows = await db
      .select()
      .from(institutionRegistry)
      .where(and(...conditions))
      .limit(limit);

    return rows.map(mapToInstitutionType);
  }

  async getTopInstitutions(params: SearchParams): Promise<InstitutionType[]> {
    const country = params.country || "US";
    const limit = Math.min(params.limit ?? 20, 50);
    const accountType = params.accountType || "all";

    const conditions = [
      eq(institutionRegistry.countryCode, country),
      eq(institutionRegistry.isTopInstitution, true),
    ];

    if (accountType !== "all") {
      conditions.push(
        sql`${institutionRegistry.supportedAccountTypes}::jsonb @> ${JSON.stringify([accountType])}::jsonb`,
      );
    }

    const rows = await db
      .select()
      .from(institutionRegistry)
      .where(and(...conditions))
      .orderBy(asc(institutionRegistry.countryRank))
      .limit(limit);

    return rows.map(mapToInstitutionType);
  }
}

export const institutionRegistryService = new InstitutionRegistryService();
