import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { institutionRegistry } from "../schema";

vi.mock("./sync/mx.client", () => ({
  isMxConfigured: () => false,
}));

const { institutionRegistryService } =
  await import("./institution-registry.service");

describe("InstitutionRegistryService.searchInstitutions (MX not configured)", () => {
  const suffix = randomUUID().slice(0, 8);
  // Shared substring (tag) so one query matches all three; distinct prefixes
  // so InstitutionMatcher.deduplicateInstitutions keeps them as separate rows.
  const tag = `ZzsrchTag${suffix}`;
  const plaidName = `AlphaBank ${tag}`;
  const mcName = `BetaCredit ${tag}`;
  const mxName = `GammaSavings ${tag}`;
  let insertedIds: number[] = [];

  beforeAll(async () => {
    const rows = await db
      .insert(institutionRegistry)
      .values([
        {
          name: plaidName,
          countryCode: "US",
          providerCompositeKey: `plaid_${suffix}_p`,
          plaidData: {
            institutionId: `ins_${suffix}_p`,
            countryCodes: ["US"],
            oauth: true,
            products: ["transactions"],
            routingNumbers: [],
          },
          mxData: null,
          mastercardData: null,
          supportedAccountTypes: ["depository"],
          lastSynced: new Date(),
        },
        {
          name: mcName,
          countryCode: "US",
          providerCompositeKey: `mastercard_${suffix}_mc`,
          plaidData: null,
          mxData: null,
          mastercardData: {
            institutionId: `${suffix}_mc`,
            name: mcName,
            voa: true,
            voi: true,
            stateAgg: true,
            ach: true,
            transAgg: true,
            aha: true,
            availBalance: true,
            oauthEnabled: true,
            status: "online",
            urlHomeApp: null,
            urlLogonApp: null,
            accountTypeDescription: "Banking",
            currency: "USD",
            branding: null,
          },
          supportedAccountTypes: ["depository"],
          lastSynced: new Date(),
        },
        {
          name: mxName,
          countryCode: "US",
          providerCompositeKey: `mx_${suffix}_mx`,
          plaidData: null,
          mxData: {
            institutionCode: `${suffix}_mx`,
            name: mxName,
          },
          mastercardData: null,
          supportedAccountTypes: ["depository"],
          lastSynced: new Date(),
        },
      ])
      .returning({ id: institutionRegistry.id });
    insertedIds = rows.map((r) => r.id);
  });

  afterAll(async () => {
    if (insertedIds.length) {
      await db
        .delete(institutionRegistry)
        .where(inArray(institutionRegistry.id, insertedIds));
    }
  });

  it("returns plaid and mastercard rows, excludes mx-only", async () => {
    const results = await institutionRegistryService.searchInstitutions({
      query: tag,
    });

    const names = results.map((r) => r.name);
    expect(names).toContain(plaidName);
    expect(names).toContain(mcName);
    expect(names).not.toContain(mxName);
  });

  it("returns the mastercard-only row when searching for its specific name", async () => {
    const results = await institutionRegistryService.searchInstitutions({
      query: mcName,
    });
    expect(results.map((r) => r.name)).toContain(mcName);
  });

  it("returns the plaid-only row when searching for its specific name", async () => {
    const results = await institutionRegistryService.searchInstitutions({
      query: plaidName,
    });
    expect(results.map((r) => r.name)).toContain(plaidName);
  });

  it("does not return the mx-only row when searching for its specific name", async () => {
    const results = await institutionRegistryService.searchInstitutions({
      query: mxName,
    });
    expect(results.map((r) => r.name)).not.toContain(mxName);
  });
});
