import { db } from "../db";
import { institutionRegistry } from "../schema";
import { ilike, eq, asc, and, sql, inArray } from "drizzle-orm";
import type { InstitutionType } from "@openfinance/shared";
import { InstitutionMatcher } from "./institution-matcher";
import { isMxConfigured } from "./sync/mx.client";

/**
 * Top institutions by country - includes both Plaid and MX composite keys
 */
type TopInstitutionGroup = {
  name: string;
  ids: string[];
};

const TOP_INSTITUTIONS_BY_COUNTRY: Record<string, TopInstitutionGroup[]> = {
  US: [
    { name: "Chase", ids: ["plaid_ins_56", "mx_chase", "mastercard_102224"] },
    {
      name: "Bank of America",
      ids: ["plaid_ins_127989", "mx_bank_of_america", "mastercard_170758"],
    },
    {
      name: "Wells Fargo",
      ids: ["plaid_ins_127991", "mx_wells_fargo", "mastercard_170718"],
    },
    {
      name: "Citibank",
      ids: ["plaid_ins_5", "mx_citibank", "mastercard_170881"],
    },
    {
      name: "U.S. Bank",
      ids: ["plaid_ins_127990", "mx_us_bank", "mastercard_170894"],
    },
    { name: "PNC", ids: ["plaid_ins_13", "mx_pnc_bank", "mastercard_176917"] },
    {
      name: "Truist",
      ids: [
        "plaid_ins_130888",
        "mx_9f732f7a-b6e2-4c60-81eb-af6274f411dc",
        "mastercard_177570",
      ],
    },
    {
      name: "Capital One",
      ids: ["plaid_ins_128026", "mx_capital_one", "mastercard_170778"],
    },
    {
      name: "TD Bank",
      ids: ["plaid_ins_14", "mx_td_bank", "mastercard_170980"],
    },
    {
      name: "American Express",
      ids: ["plaid_ins_10", "mx_amex", "mastercard_1002"],
    },
    {
      name: "Ally Bank",
      ids: ["plaid_ins_25", "mx_allybank", "mastercard_10780"],
    },
    {
      name: "Discover",
      ids: ["plaid_ins_33", "mx_discover_card", "mastercard_10"],
    },
    {
      name: "Charles Schwab",
      ids: ["plaid_ins_11", "mx_69378", "mastercard_170906"],
    },
    {
      name: "Marcus by Goldman Sachs",
      ids: ["plaid_ins_52", "mx_69490", "mastercard_101406"],
    },
    {
      name: "Huntington Bank",
      ids: ["plaid_ins_21", "mx_69856", "mastercard_2524"],
    },
  ],
  CA: [
    {
      name: "RBC Royal Bank",
      ids: ["plaid_ins_39", "mx_69739", "mastercard_1411"],
    },
    {
      name: "TD Canada Trust",
      ids: ["plaid_ins_42", "mx_69814", "mastercard_1492"],
    },
    { name: "Scotiabank", ids: ["plaid_ins_38", "mx_69747"] },
    {
      name: "BMO Bank of Montreal",
      ids: [
        "plaid_ins_41",
        "mx_073bb78b-61a3-46d6-94f1-a7d58e048671",
        "mastercard_3415",
      ],
    },
    {
      name: "CIBC",
      ids: ["plaid_ins_37", "mx_69368", "mastercard_3417"],
    },
    { name: "National Bank of Canada", ids: ["plaid_ins_48", "mx_79115"] },
    {
      name: "Tangerine",
      ids: ["plaid_ins_40", "mx_76821", "mastercard_5691"],
    },
    { name: "American Express", ids: ["plaid_ins_100533", "mx_69956"] },
    {
      name: "Laurentian Bank",
      ids: ["plaid_ins_44", "mx_cca44ea7-e4ec-b141-2211-edfff371d612"],
    },
    { name: "President's Choice Financial", ids: ["plaid_ins_47", "mx_69785"] },
    {
      name: "Desjardins",
      ids: ["plaid_ins_46", "mx_78093", "mastercard_8017"],
    },
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
    mastercardData: row.mastercardData ?? null,
    providers: [
      ...(row.plaidData ? (["plaid"] as const) : []),
      ...(row.mxData ? (["mx"] as const) : []),
      ...(row.mastercardData ? (["quiltt"] as const) : []),
    ],
    rank: row.countryRank ?? undefined,
  };
}

function mergedToInstitutionType(
  merged: ReturnType<typeof InstitutionMatcher.deduplicateInstitutions>[number],
): InstitutionType {
  return {
    id: merged.originalInstitutions[0]
      ? String(merged.originalInstitutions[0].id)
      : "0",
    name: merged.name,
    logo: merged.logo,
    logoUrl:
      merged.mxData?.mediumLogoUrl ?? merged.mxData?.smallLogoUrl ?? null,
    primaryColor: merged.primaryColor,
    url: merged.url,
    plaidData: merged.plaidData ?? null,
    mxData: merged.mxData ?? null,
    mastercardData: merged.mastercardData ?? null,
    providers: merged.providers,
    matchConfidence: merged.matchConfidence,
    rank: merged.countryRank ?? undefined,
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

    // Fetch 3x limit to allow deduplication to merge and still have enough results
    const fetchLimit = limit * 3;

    const conditions = [ilike(institutionRegistry.name, `%${query}%`)];

    if (provider === "plaid") {
      conditions.push(sql`${institutionRegistry.plaidData} is not null`);
    } else if (provider === "mx") {
      conditions.push(sql`${institutionRegistry.mxData} is not null`);
    }

    // Exclude MX-only institutions when MX is not configured
    if (!isMxConfigured()) {
      conditions.push(
        sql`(${institutionRegistry.plaidData} is not null
          or ${institutionRegistry.mastercardData} is not null)`,
      );
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
      .limit(fetchLimit);

    // Deduplicate across providers
    const deduplicated = InstitutionMatcher.deduplicateInstitutions(rows);

    return deduplicated.slice(0, limit).map(mergedToInstitutionType);
  }

  async getTopInstitutions(params: SearchParams): Promise<InstitutionType[]> {
    const country = params.country || "US";
    const limit = Math.min(params.limit ?? 20, 50);
    const accountType = params.accountType || "all";

    const topGroups = TOP_INSTITUTIONS_BY_COUNTRY[country];

    if (topGroups) {
      const mxConfigured = isMxConfigured();
      // When MX is not configured, only include groups that have at least one Plaid ID
      const filteredGroups = mxConfigured
        ? topGroups
        : topGroups.filter((group) =>
            group.ids.some((id) => id.startsWith("plaid_")),
          );
      const allIds = filteredGroups.flatMap((group) => group.ids);

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

      // Group rows per top institution group and merge
      const result: InstitutionType[] = [];
      for (const group of filteredGroups.slice(0, limit)) {
        const matchingRows = rows.filter(
          (row) =>
            row.providerCompositeKey &&
            group.ids.includes(row.providerCompositeKey),
        );

        if (matchingRows.length === 0) continue;

        if (matchingRows.length === 1) {
          result.push(mapToInstitutionType(matchingRows[0]));
        } else {
          // Merge multiple rows (Plaid + MX) for the same institution
          const deduplicated =
            InstitutionMatcher.deduplicateInstitutions(matchingRows);
          if (deduplicated.length > 0) {
            result.push(mergedToInstitutionType(deduplicated[0]));
          }
        }
      }

      return result;
    }

    // Fallback: use isTopInstitution flag
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
