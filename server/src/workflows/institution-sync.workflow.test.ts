import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { InstitutionSyncWorkflow } from "./institution-sync.workflow";

const mockSyncer = {
  refreshInstitutions: vi.fn(),
  updateConnectionHealthStatus: vi.fn(),
};

vi.mock("$lib/sync/plaid-institution-syncer.js", () => ({
  PlaidInstitutionSyncer: vi.fn(() => mockSyncer),
}));

describe("InstitutionSyncWorkflow", () => {
  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    DBOS.setConfig({
      name: "institution-sync-test",
      systemDatabaseUrl: dbUrl,
    });
    await DBOS.launch();
  });

  afterAll(async () => {
    await DBOS.shutdown();
  });

  it("should call both steps on success", async () => {
    mockSyncer.refreshInstitutions.mockResolvedValue(undefined);
    mockSyncer.updateConnectionHealthStatus.mockResolvedValue(undefined);

    const handle = await DBOS.startWorkflow(
      InstitutionSyncWorkflow,
    ).syncInstitutionsWorkflow();

    const result = await handle.getResult();

    expect(result.success).toBe(true);
    expect(result.institutionsRefreshed).toBe(true);
    expect(result.healthStatusUpdated).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(mockSyncer.refreshInstitutions).toHaveBeenCalledOnce();
    expect(mockSyncer.updateConnectionHealthStatus).toHaveBeenCalledOnce();
  });

  it("should handle partial failure gracefully", async () => {
    mockSyncer.refreshInstitutions.mockRejectedValue(
      new Error("Plaid API error"),
    );
    mockSyncer.updateConnectionHealthStatus.mockResolvedValue(undefined);

    const handle = await DBOS.startWorkflow(
      InstitutionSyncWorkflow,
    ).syncInstitutionsWorkflow();

    const result = await handle.getResult();

    expect(result.success).toBe(false);
    expect(result.institutionsRefreshed).toBe(false);
    expect(result.healthStatusUpdated).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toContain("Plaid API error");
  });

  it("should handle both steps failing", async () => {
    mockSyncer.refreshInstitutions.mockRejectedValue(
      new Error("Plaid API error"),
    );
    mockSyncer.updateConnectionHealthStatus.mockRejectedValue(
      new Error("Health check error"),
    );

    const handle = await DBOS.startWorkflow(
      InstitutionSyncWorkflow,
    ).syncInstitutionsWorkflow();

    const result = await handle.getResult();

    expect(result.success).toBe(false);
    expect(result.institutionsRefreshed).toBe(false);
    expect(result.healthStatusUpdated).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
