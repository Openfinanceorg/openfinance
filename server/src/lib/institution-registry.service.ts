import { db } from "../db";
import { institutionRegistry } from "../schema";
import { ilike, eq, asc, and, sql, inArray } from "drizzle-orm";
import type { InstitutionType } from "@openfinance/shared";

/**
 * Top institutions by country - Plaid IDs only
 * Derived from karlafinance's TOP_INSTITUTIONS_BY_COUNTRY
 */
type TopInstitutionGroup = {
  name: string;
  ids: string[];
};

const TOP_INSTITUTIONS_BY_COUNTRY: Record<string, TopInstitutionGroup[]> = {
  US: [
    { name: "Chase", ids: ["plaid_ins_56"] },
    { name: "Bank of America", ids: ["plaid_ins_127989"] },
    { name: "Wells Fargo", ids: ["plaid_ins_127991"] },
    { name: "Citibank", ids: ["plaid_ins_5"] },
    { name: "U.S. Bank", ids: ["plaid_ins_127990"] },
    { name: "PNC", ids: ["plaid_ins_13"] },
    { name: "Truist", ids: ["plaid_ins_130888"] },
    { name: "Capital One", ids: ["plaid_ins_128026"] },
    { name: "TD Bank", ids: ["plaid_ins_14"] },
    { name: "American Express", ids: ["plaid_ins_10"] },
    { name: "Ally Bank", ids: ["plaid_ins_25"] },
    { name: "Discover", ids: ["plaid_ins_33"] },
    { name: "Charles Schwab", ids: ["plaid_ins_11"] },
    { name: "Marcus by Goldman Sachs", ids: ["plaid_ins_52"] },
    { name: "Huntington Bank", ids: ["plaid_ins_21"] },
  ],
  CA: [
    { name: "RBC Royal Bank", ids: ["plaid_ins_39"] },
    { name: "TD Canada Trust", ids: ["plaid_ins_42"] },
    { name: "Scotiabank", ids: ["plaid_ins_38"] },
    { name: "BMO Bank of Montreal", ids: ["plaid_ins_41"] },
    { name: "CIBC", ids: ["plaid_ins_37"] },
    { name: "National Bank of Canada", ids: ["plaid_ins_48"] },
    { name: "Tangerine", ids: ["plaid_ins_40"] },
    { name: "American Express", ids: ["plaid_ins_100533"] },
    { name: "Laurentian Bank", ids: ["plaid_ins_44"] },
    { name: "President's Choice Financial", ids: ["plaid_ins_47"] },
    { name: "Desjardins", ids: ["plaid_ins_46"] },
  ],
};

function mapToInstitutionType(
  row: typeof institutionRegistry.$inferSelect,
): InstitutionType {
  return {
    id: String(row.id),
    name: row.name,
    logo: row.logo,
    logoUrl: row.mxData?.mediumLogoUrl ?? row.mxData?.smallLogoUrl ?? null,
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

    const topGroups = TOP_INSTITUTIONS_BY_COUNTRY[country];

    if (topGroups) {
      // Use hardcoded list: query by providerCompositeKey
      const allIds = topGroups.flatMap((group) => group.ids);

      let whereCondition = inArray(
        institutionRegistry.providerCompositeKey,
        allIds,
      );

      if (accountType !== "all") {
        whereCondition = and(
          whereCondition,
          sql`${institutionRegistry.supportedAccountTypes}::jsonb @> ${JSON.stringify([accountType])}::jsonb`,
        ) as any;
      }

      const rows = await db
        .select()
        .from(institutionRegistry)
        .where(whereCondition);

      // Order by hardcoded list position
      const result: InstitutionType[] = [];
      for (const group of topGroups.slice(0, limit)) {
        const matchingRow = rows.find(
          (row) =>
            row.providerCompositeKey &&
            group.ids.includes(row.providerCompositeKey),
        );
        if (matchingRow) {
          result.push(mapToInstitutionType(matchingRow));
        }
      }

      return result;
    }

    // Fallback: use isTopInstitution flag for countries without hardcoded list
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
