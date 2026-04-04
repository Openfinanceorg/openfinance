#!/usr/bin/env tsx

import "../env.js";
import { Command } from "commander";
import { db } from "../db.js";
import { institutionRegistry } from "../schema.js";
import {
  ALL_ACCOUNT_TYPES,
  type AccountType,
} from "$lib/sql/institution-registry.sql.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FinicityInstitution {
  id: number | string;
  name: string;
  voa: boolean;
  voi: boolean;
  stateAgg: boolean;
  ach: boolean;
  transAgg: boolean;
  aha: boolean;
  availBalance: boolean;
  accountTypeDescription: string;
  phone?: string;
  urlHomeApp?: string;
  urlLogonApp?: string;
  oauthEnabled: boolean;
  status?: string;
  currency: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string | number;
  };
  branding?: {
    logo?: string;
    alternateLogo?: string;
    icon?: string;
    primaryColor?: string;
    title?: string;
    tile?: string;
  };
}

const TEST_INSTITUTION_PATTERNS = [
  /^finbank/i,
  /\btest\s*bank\b/i,
  /\bdemo\s*bank\b/i,
  /\bsandbox\b/i,
];

function isTestInstitution(name: string): boolean {
  return TEST_INSTITUTION_PATTERNS.some((pattern) => pattern.test(name));
}

function inferSupportedAccountTypes(
  institution: FinicityInstitution,
): AccountType[] {
  const accountTypes = new Set<AccountType>();

  if (institution.transAgg) accountTypes.add("depository");
  if (institution.voa) {
    accountTypes.add("depository");
    accountTypes.add("investment");
  }
  if (institution.voi) accountTypes.add("depository");
  if (institution.ach) accountTypes.add("depository");
  if (institution.stateAgg) {
    accountTypes.add("credit");
    accountTypes.add("depository");
  }
  if (institution.aha) {
    accountTypes.add("depository");
    accountTypes.add("credit");
  }

  if (accountTypes.size === 0 || accountTypes.size >= 2) {
    return ALL_ACCOUNT_TYPES;
  }

  return Array.from(accountTypes);
}

function convertToRegistryFormat(institution: FinicityInstitution) {
  const id = String(institution.id);
  return {
    name: institution.name,
    logo: institution.branding?.logo || institution.branding?.icon || null,
    primaryColor: institution.branding?.primaryColor || null,
    url: institution.urlHomeApp || null,
    countryCode: institution.address?.country || "US",
    providerCompositeKey: `mastercard_${id}`,
    plaidData: null,
    mxData: null,
    mastercardData: {
      institutionId: id,
      name: institution.name,
      voa: institution.voa,
      voi: institution.voi,
      stateAgg: institution.stateAgg,
      ach: institution.ach,
      transAgg: institution.transAgg,
      aha: institution.aha,
      availBalance: institution.availBalance,
      oauthEnabled: institution.oauthEnabled,
      status: institution.status || "active",
      urlHomeApp: institution.urlHomeApp || null,
      urlLogonApp: institution.urlLogonApp || null,
      accountTypeDescription: institution.accountTypeDescription || null,
      currency: institution.currency,
      branding: institution.branding
        ? {
            logo: institution.branding.logo || null,
            alternateLogo: institution.branding.alternateLogo || null,
            icon: institution.branding.icon || null,
            primaryColor: institution.branding.primaryColor || null,
            title: institution.branding.title || null,
          }
        : null,
    },
    supportedAccountTypes: inferSupportedAccountTypes(institution),
    lastSynced: new Date(),
  };
}

/**
 * Core seeding logic - exported so it can be called from sync-institutions.ts too
 */
export async function seedMastercardInstitutions(options?: {
  limit?: number;
  filterTest?: boolean;
}) {
  const limit = options?.limit;
  const filterTest = options?.filterTest !== false;

  // Load JSON file
  const jsonPath = resolve(__dirname, "data/mastercard-institutions.json");
  const raw = readFileSync(jsonPath, "utf-8");
  let institutions: FinicityInstitution[] = JSON.parse(raw);

  console.log(`Loaded ${institutions.length} institutions from JSON`);

  // Filter test institutions
  if (filterTest) {
    const before = institutions.length;
    institutions = institutions.filter((inst) => !isTestInstitution(inst.name));
    console.log(
      `Filtered out ${before - institutions.length} test institutions`,
    );
  }

  // Filter only online institutions
  institutions = institutions.filter(
    (inst) => !inst.status || inst.status === "online",
  );
  console.log(`${institutions.length} online institutions to seed`);

  // Apply limit
  if (limit) {
    institutions = institutions.slice(0, limit);
  }

  // Process in batches of 500
  const BATCH_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < institutions.length; i += BATCH_SIZE) {
    const batch = institutions.slice(i, i + BATCH_SIZE);
    const records = batch.map(convertToRegistryFormat);

    await db
      .insert(institutionRegistry)
      .values(records)
      .onConflictDoUpdate({
        target: institutionRegistry.providerCompositeKey,
        set: {
          name: sql.raw("excluded.name"),
          logo: sql.raw("excluded.logo"),
          primaryColor: sql.raw("excluded.primary_color"),
          url: sql.raw("excluded.url"),
          countryCode: sql.raw("excluded.country_code"),
          mastercardData: sql.raw("excluded.mastercard_data"),
          supportedAccountTypes: sql.raw("excluded.supported_account_types"),
          lastSynced: sql.raw("excluded.last_synced"),
          updatedAt: new Date(),
        },
      });

    totalUpserted += records.length;
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: Upserted ${records.length} institutions (${totalUpserted} total)`,
    );
  }

  console.log(`Successfully seeded ${totalUpserted} Mastercard institutions`);
}

// CLI entrypoint
const program = new Command();

program
  .name("seed-mastercard-institutions")
  .description(
    "Seed Mastercard/Finicity institutions from JSON file into the institution registry",
  )
  .option(
    "-l, --limit <number>",
    "Limit the number of institutions to seed (for testing)",
  )
  .option("--filter-test", "Filter out test/demo institutions", true)
  .addHelpText(
    "after",
    `
Examples:
  tsx server/src/scripts/seed-mastercard-institutions.ts
  tsx server/src/scripts/seed-mastercard-institutions.ts --limit 100
  tsx server/src/scripts/seed-mastercard-institutions.ts --no-filter-test
`,
  )
  .action(async (options) => {
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    const filterTest = options.filterTest !== false;

    console.log("Starting Mastercard institutions seed...");
    if (limit) console.log(`Limited to: ${limit} institutions`);
    if (filterTest) console.log("Filtering out test/demo institutions");
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log("-".repeat(60));

    const startTime = Date.now();

    try {
      await seedMastercardInstitutions({ limit, filterTest });

      const duration = Date.now() - startTime;
      const seconds = Math.floor(duration / 1000);

      console.log("-".repeat(60));
      console.log(`Seed completed in ${seconds}s`);
      process.exit(0);
    } catch (error) {
      const duration = Date.now() - startTime;
      const seconds = Math.floor(duration / 1000);

      console.log("-".repeat(60));
      console.error(`Seed failed after ${seconds}s`);
      console.error("Error details:", error);
      process.exit(1);
    }
  });

program.parse();
