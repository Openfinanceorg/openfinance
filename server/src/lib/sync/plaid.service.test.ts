/**
 * Tests for PlaidService.syncTransactions — specifically the polling
 * behavior during initial sync to wait for HISTORICAL_UPDATE_COMPLETE.
 *
 * When a user first connects a bank account, Plaid's transaction sync has
 * two phases: INITIAL_UPDATE_COMPLETE (recent transactions only) and
 * HISTORICAL_UPDATE_COMPLETE (all historical transactions). The service
 * polls with exponential backoff during the initial sync until historical
 * data is ready or retries are exhausted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTransactionsSync = vi.fn();

vi.mock("./plaid.client", () => ({
  plaidClient: { transactionsSync: mockTransactionsSync },
}));

const mockDbChain = () => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue([]);
  return chain;
};

const dbMock = mockDbChain();

vi.mock("../../db", () => ({ db: dbMock }));
vi.mock("../../schema", () => ({
  financialAccounts: {
    accountConnectionId: "accountConnectionId",
    id: "id",
    providerAccountId: "providerAccountId",
    userId: "userId",
  },
  accountConnections: { id: "id" },
  syncJobs: {},
  institutionRegistry: {},
  transactions: {
    accountId: "accountId",
    providerTransactionId: "providerTransactionId",
  },
  user: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  sql: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));
vi.mock("@dbos-inc/dbos-sdk", () => ({ DBOS: {} }));
vi.mock("../../workflows/plaid-transaction-sync.workflow", () => ({
  TransactionSyncWorkflow: {},
}));

// Import after mocks are set up (module is cached, singleton is shared)
const { plaidService } = await import("./plaid.service");

/** Build a mock Plaid transactionsSync response */
function makeSyncResponse(overrides: {
  added?: Array<Record<string, unknown>>;
  modified?: Array<Record<string, unknown>>;
  removed?: Array<Record<string, unknown>>;
  has_more?: boolean;
  next_cursor?: string;
  transactions_update_status?: string;
}) {
  return {
    data: {
      added: overrides.added ?? [],
      modified: overrides.modified ?? [],
      removed: overrides.removed ?? [],
      has_more: overrides.has_more ?? false,
      next_cursor: overrides.next_cursor ?? "",
      transactions_update_status:
        overrides.transactions_update_status ?? "HISTORICAL_UPDATE_COMPLETE",
    },
  };
}

/** Build a minimal Plaid transaction object */
function makeTx(id: string) {
  return {
    transaction_id: id,
    account_id: "plaid-acct-1",
    amount: 42.0,
    iso_currency_code: "USD",
    date: "2025-01-15",
    authorized_date: null,
    pending: false,
    name: `Transaction ${id}`,
    merchant_name: "Test Merchant",
  };
}

describe("PlaidService.syncTransactions", () => {
  beforeEach(() => {
    mockTransactionsSync.mockReset();

    // Re-wire the db mock chain for each test
    dbMock.select = vi.fn().mockReturnValue(dbMock);
    dbMock.from = vi.fn().mockReturnValue(dbMock);
    dbMock.where = vi
      .fn()
      .mockResolvedValue([
        { id: 1, providerAccountId: "plaid-acct-1", userId: "user-1" },
      ]);
    dbMock.insert = vi.fn().mockReturnValue(dbMock);
    dbMock.values = vi.fn().mockReturnValue(dbMock);
    dbMock.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    dbMock.update = vi.fn().mockReturnValue(dbMock);
    dbMock.set = vi.fn().mockReturnValue(dbMock);
  });

  // Happy path: Plaid has data ready immediately, no polling needed
  it("syncs transactions on first call when data is ready", async () => {
    mockTransactionsSync.mockResolvedValueOnce(
      makeSyncResponse({
        added: [makeTx("tx-1"), makeTx("tx-2")],
        next_cursor: "cursor-1",
        transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
      }),
    );

    const result = await plaidService.syncTransactions({
      connectionId: 1,
      accessToken: "access-token",
      cursor: null,
    });

    expect(result.added).toBe(2);
    expect(result.nextCursor).toBe("cursor-1");
    expect(mockTransactionsSync).toHaveBeenCalledTimes(1);
  });

  // Core scenario: initial sync returns NOT_READY, service waits and retries,
  // second attempt returns transactions with HISTORICAL_UPDATE_COMPLETE
  it("polls with backoff when NOT_READY, then syncs when data arrives", async () => {
    vi.useFakeTimers();

    mockTransactionsSync
      .mockResolvedValueOnce(
        makeSyncResponse({
          next_cursor: "cursor-0",
          transactions_update_status: "NOT_READY",
        }),
      )
      .mockResolvedValueOnce(
        makeSyncResponse({
          added: [makeTx("tx-1"), makeTx("tx-2"), makeTx("tx-3")],
          next_cursor: "cursor-1",
          transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
        }),
      );

    const resultPromise = plaidService.syncTransactions({
      connectionId: 1,
      accessToken: "access-token",
      cursor: null,
    });

    // Advance past the first backoff delay (5s)
    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;

    expect(mockTransactionsSync).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(3);
    expect(result.nextCursor).toBe("cursor-1");

    vi.useRealTimers();
  });

  // Edge case: Plaid never becomes ready within the retry window (~95s).
  // Service should give up after 5 retries and return 0 results.
  it("exhausts all retries when data never becomes ready", async () => {
    vi.useFakeTimers();

    // 6 calls total: 1 initial + 5 retries, all NOT_READY
    for (let i = 0; i < 6; i++) {
      mockTransactionsSync.mockResolvedValueOnce(
        makeSyncResponse({
          next_cursor: `cursor-${i}`,
          transactions_update_status: "NOT_READY",
        }),
      );
    }

    const resultPromise = plaidService.syncTransactions({
      connectionId: 1,
      accessToken: "access-token",
      cursor: null,
    });

    // Advance through all backoff delays: 5s + 10s + 20s + 30s + 30s
    for (const delay of [5000, 10000, 20000, 30000, 30000]) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    const result = await resultPromise;

    expect(mockTransactionsSync).toHaveBeenCalledTimes(6);
    expect(result.added).toBe(0);

    vi.useRealTimers();
  });

  // INITIAL_UPDATE_COMPLETE with data: should continue polling for historical data
  it("continues polling when INITIAL_UPDATE_COMPLETE, stops at HISTORICAL_UPDATE_COMPLETE", async () => {
    vi.useFakeTimers();

    mockTransactionsSync
      .mockResolvedValueOnce(
        makeSyncResponse({
          added: [makeTx("tx-1"), makeTx("tx-2"), makeTx("tx-3")],
          next_cursor: "cursor-1",
          transactions_update_status: "INITIAL_UPDATE_COMPLETE",
        }),
      )
      .mockResolvedValueOnce(
        makeSyncResponse({
          added: [makeTx("tx-4"), makeTx("tx-5")],
          next_cursor: "cursor-2",
          transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
        }),
      );

    const resultPromise = plaidService.syncTransactions({
      connectionId: 1,
      accessToken: "access-token",
      cursor: null,
    });

    // Advance past the first backoff delay (5s)
    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;

    expect(mockTransactionsSync).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(5);
    expect(result.nextCursor).toBe("cursor-2");

    vi.useRealTimers();
  });

  // Incremental sync (cursor != null): should exit immediately without polling,
  // even if status is not HISTORICAL_UPDATE_COMPLETE
  it("does not poll during incremental sync (cursor != null)", async () => {
    mockTransactionsSync.mockResolvedValueOnce(
      makeSyncResponse({
        added: [makeTx("tx-1")],
        next_cursor: "cursor-2",
        transactions_update_status: "INITIAL_UPDATE_COMPLETE",
      }),
    );

    const result = await plaidService.syncTransactions({
      connectionId: 1,
      accessToken: "access-token",
      cursor: "cursor-1",
    });

    expect(mockTransactionsSync).toHaveBeenCalledTimes(1);
    expect(result.added).toBe(1);
    expect(result.nextCursor).toBe("cursor-2");
  });
});
