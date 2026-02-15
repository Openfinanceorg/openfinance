import { describe, it, expect } from "vitest";
import { getConnectionHealth } from "./plaid-institution-syncer.js";

describe("getConnectionHealth", () => {
  it("extracts item_logins and transactions_updates with correct fields", () => {
    const institutionDetails = {
      status: {
        item_logins: {
          status: "HEALTHY",
          last_status_change: "2019-02-15T15:53:00Z",
          breakdown: {
            success: 0.9,
            error_plaid: 0.01,
            error_institution: 0.09,
          },
        },
        transactions_updates: {
          status: "HEALTHY",
          last_status_change: "2019-02-12T08:22:00Z",
          breakdown: {
            success: 0.95,
            error_plaid: 0.02,
            error_institution: 0.03,
            refresh_interval: "NORMAL",
          },
        },
      },
    };

    const result = getConnectionHealth(institutionDetails as any);
    expect(result).toBeDefined();
    expect(result?.item_logins?.status).toBe("HEALTHY");
    expect(result?.item_logins?.last_status_change).toBe(
      "2019-02-15T15:53:00Z",
    );
    expect(result?.item_logins?.breakdown?.success).toBeCloseTo(0.9);
    expect(result?.item_logins?.breakdown?.error_plaid).toBeCloseTo(0.01);
    expect(result?.item_logins?.breakdown?.error_institution).toBeCloseTo(0.09);

    expect(result?.transactions_updates?.status).toBe("HEALTHY");
    expect(result?.transactions_updates?.last_status_change).toBe(
      "2019-02-12T08:22:00Z",
    );
    expect(result?.transactions_updates?.breakdown?.success).toBeCloseTo(0.95);
    expect(result?.transactions_updates?.breakdown?.error_plaid).toBeCloseTo(
      0.02,
    );
    expect(
      result?.transactions_updates?.breakdown?.error_institution,
    ).toBeCloseTo(0.03);
    expect(result?.transactions_updates?.breakdown?.refresh_interval).toBe(
      "NORMAL",
    );

    // lastUpdated should be an ISO string close to now
    expect(typeof result?.lastUpdated).toBe("string");
    const ts = Date.parse(result!.lastUpdated!);
    expect(Number.isNaN(ts)).toBe(false);
  });

  it("returns undefined when status is missing", () => {
    const institutionDetails = {};
    const result = getConnectionHealth(institutionDetails as any);
    expect(result).toBeUndefined();
  });
});
