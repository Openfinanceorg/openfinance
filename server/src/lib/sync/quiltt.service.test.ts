import { randomUUID } from "crypto";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  user,
  accountConnections,
  financialAccounts,
  syncJobs,
  transactions,
} from "../../schema";
import { mapQuilttTypeToAccountType, quilttService } from "./quiltt.service.js";

describe("mapQuilttTypeToAccountType", () => {
  it("should map depository account types correctly", () => {
    expect(mapQuilttTypeToAccountType("CHECKING")).toBe("depository");
    expect(mapQuilttTypeToAccountType("SAVINGS")).toBe("depository");
    expect(mapQuilttTypeToAccountType("MONEY_MARKET")).toBe("depository");
    expect(mapQuilttTypeToAccountType("CD")).toBe("depository");
  });

  it("should map credit account types correctly", () => {
    expect(mapQuilttTypeToAccountType("CREDIT_CARD")).toBe("credit");
    expect(mapQuilttTypeToAccountType("LINE_OF_CREDIT")).toBe("credit");
  });

  it("should map loan account types correctly", () => {
    expect(mapQuilttTypeToAccountType("LOAN")).toBe("loan");
    expect(mapQuilttTypeToAccountType("MORTGAGE")).toBe("loan");
    expect(mapQuilttTypeToAccountType("STUDENT")).toBe("loan");
    expect(mapQuilttTypeToAccountType("AUTO")).toBe("loan");
  });

  it("should map investment account types correctly", () => {
    expect(mapQuilttTypeToAccountType("INVESTMENT")).toBe("investment");
    expect(mapQuilttTypeToAccountType("BROKERAGE")).toBe("investment");
    expect(mapQuilttTypeToAccountType("RETIREMENT")).toBe("investment");
    expect(mapQuilttTypeToAccountType("401K")).toBe("investment");
    expect(mapQuilttTypeToAccountType("IRA")).toBe("investment");
  });

  it("should be case-insensitive", () => {
    expect(mapQuilttTypeToAccountType("checking")).toBe("depository");
    expect(mapQuilttTypeToAccountType("Savings")).toBe("depository");
    expect(mapQuilttTypeToAccountType("credit_card")).toBe("credit");
  });

  it("should default unknown types to depository", () => {
    expect(mapQuilttTypeToAccountType("UNKNOWN_TYPE")).toBe("depository");
    expect(mapQuilttTypeToAccountType("")).toBe("depository");
    expect(mapQuilttTypeToAccountType("RANDOM")).toBe("depository");
  });

  describe("Name-based detection for OTHER type", () => {
    it("should detect investment accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "401K")).toBe("investment");
      expect(mapQuilttTypeToAccountType("OTHER", "My 401k Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Roth IRA")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Traditional IRA")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "403B")).toBe("investment");
      expect(mapQuilttTypeToAccountType("OTHER", "529 College Savings")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "ROLLOVER")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Retirement Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Brokerage Account")).toBe(
        "investment",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Investment Portfolio")).toBe(
        "investment",
      );
    });

    it("should detect credit accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Credit Card")).toBe("credit");
      expect(mapQuilttTypeToAccountType("OTHER", "Visa CreditCard")).toBe(
        "credit",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Line of Credit")).toBe(
        "credit",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "HELOC")).toBe("credit");
    });

    it("should detect loan accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Home Mortgage")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Auto Loan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Autoloan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Student Loan")).toBe("loan");
      expect(mapQuilttTypeToAccountType("OTHER", "Personal Loan")).toBe("loan");
    });

    it("should detect depository accounts by name when type is OTHER", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Checking Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Savings Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "Money Market")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "CD 12 Month")).toBe(
        "depository",
      );
    });

    it("should default to depository when name doesn't match any pattern", () => {
      expect(mapQuilttTypeToAccountType("OTHER", "Unknown Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER", "My Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("OTHER")).toBe("depository");
    });

    it("should not use name-based detection for non-OTHER types", () => {
      expect(mapQuilttTypeToAccountType("CHECKING", "Investment Account")).toBe(
        "depository",
      );
      expect(mapQuilttTypeToAccountType("SAVINGS", "401K")).toBe("depository");
    });
  });
});

describe("QuilttService.syncTransactions", () => {
  const testUserId = `test-user-${randomUUID().slice(0, 8)}`;
  const quilttConnectionId = `conn_${randomUUID().slice(0, 8)}`;
  let connectionId: number;

  beforeAll(async () => {
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: `${testUserId}@test.com`,
      emailVerified: false,
    });

    const [conn] = await db
      .insert(accountConnections)
      .values({
        userId: testUserId,
        provider: "quiltt",
        quilttConnectionId,
        status: "active",
      })
      .returning();
    connectionId = conn.id;
  });

  afterAll(async () => {
    await db.delete(transactions).where(eq(transactions.userId, testUserId));
    await db
      .delete(syncJobs)
      .where(eq(syncJobs.accountConnectionId, connectionId));
    await db
      .delete(financialAccounts)
      .where(eq(financialAccounts.userId, testUserId));
    await db
      .delete(accountConnections)
      .where(eq(accountConnections.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upserts accounts that the initial sync missed (INITIALIZING case)", async () => {
    // Pre-condition: connection exists but no financial accounts (the bug scenario:
    // initial sync ran while Quiltt was INITIALIZING and returned empty accounts).
    const before = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.accountConnectionId, connectionId));
    expect(before).toHaveLength(0);

    vi.spyOn(quilttService, "getConnection").mockResolvedValue({
      id: quilttConnectionId,
      provider: "plaid_aggregated",
      status: "SYNCED",
      institution: { name: "Test Bank" },
      accounts: [
        {
          id: "quiltt_acct_checking",
          name: "Checking",
          kind: "CHECKING",
          mask: "1111",
          balance: { current: 100.5, available: 95.5 },
        },
        {
          id: "quiltt_acct_savings",
          name: "Savings",
          kind: "SAVINGS",
          mask: "2222",
          balance: { current: 5000, available: 5000 },
        },
      ],
    });
    vi.spyOn(quilttService, "getAllTransactions").mockResolvedValue([]);

    await quilttService.syncTransactions({
      connectionId,
      quilttConnectionId,
      quilttProfileId: "profile_1",
    });

    const after = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.accountConnectionId, connectionId));

    expect(after).toHaveLength(2);
    const checking = after.find(
      (a) => a.providerAccountId === "quiltt_acct_checking",
    );
    expect(checking?.name).toBe("Checking");
    expect(checking?.type).toBe("depository");
    expect(checking?.mask).toBe("1111");
  });

  // The currency used to be hardcoded to "USD", which filed Canadian accounts
  // (e.g. a CIBC chequing account reporting CAD) under USD.
  it("stores the currency Quiltt reports rather than assuming USD", async () => {
    vi.spyOn(quilttService, "getConnection").mockResolvedValue({
      id: quilttConnectionId,
      provider: "plaid_aggregated",
      status: "SYNCED",
      institution: { name: "CIBC Canada" },
      accounts: [
        {
          id: "quiltt_acct_cad",
          name: "CHECKING",
          kind: "CHECKING",
          mask: "7388",
          currencyCode: "CAD",
          balance: { current: 77455.46, available: 77455.46 },
        },
        {
          id: "quiltt_acct_no_currency",
          name: "Unknown Currency",
          kind: "CHECKING",
          mask: "3333",
          balance: { current: 10, available: 10 },
        },
      ],
    });
    vi.spyOn(quilttService, "getAllTransactions").mockResolvedValue([]);

    await quilttService.syncTransactions({
      connectionId,
      quilttConnectionId,
      quilttProfileId: "profile_1",
    });

    const after = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.accountConnectionId, connectionId));

    expect(
      after.find((a) => a.providerAccountId === "quiltt_acct_cad")
        ?.isoCurrencyCode,
    ).toBe("CAD");
    expect(
      after.find((a) => a.providerAccountId === "quiltt_acct_no_currency")
        ?.isoCurrencyCode,
    ).toBeNull();
  });

  // The account-level fix above left the transaction path still defaulting to
  // "USD", so a CAD account's transactions were stamped USD while the account
  // row said CAD.
  it("stores transaction currency from Quiltt, falling back to the account's currency instead of USD", async () => {
    vi.spyOn(quilttService, "getConnection").mockResolvedValue({
      id: quilttConnectionId,
      provider: "plaid_aggregated",
      status: "SYNCED",
      institution: { name: "CIBC Canada" },
      accounts: [
        {
          id: "quiltt_acct_cad",
          name: "CHECKING",
          kind: "CHECKING",
          mask: "7388",
          currencyCode: "CAD",
          balance: { current: 77455.46, available: 77455.46 },
        },
        {
          id: "quiltt_acct_no_currency",
          name: "Unknown Currency",
          kind: "CHECKING",
          mask: "3333",
          balance: { current: 10, available: 10 },
        },
      ],
    });
    vi.spyOn(quilttService, "getAllTransactions").mockResolvedValue([
      {
        id: "quiltt_txn_explicit",
        date: "2026-07-01",
        description: "Explicit currency",
        amount: 25.5,
        currencyCode: "CAD",
        entryType: "DEBIT",
        status: "POSTED",
        account: { id: "quiltt_acct_cad" },
      },
      {
        // Quiltt omitted currencyCode — must inherit CAD from the account.
        id: "quiltt_txn_inherits",
        date: "2026-07-02",
        description: "No currency reported",
        amount: 40,
        entryType: "DEBIT",
        status: "POSTED",
        account: { id: "quiltt_acct_cad" },
      },
      {
        // Neither the transaction nor the account has a currency — stay null
        // rather than inventing one.
        id: "quiltt_txn_unknown",
        date: "2026-07-03",
        description: "Unknowable currency",
        amount: 5,
        entryType: "CREDIT",
        status: "POSTED",
        account: { id: "quiltt_acct_no_currency" },
      },
    ]);

    await quilttService.syncTransactions({
      connectionId,
      quilttConnectionId,
      quilttProfileId: "profile_1",
    });

    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, testUserId));

    const byProviderId = (id: string) =>
      rows.find((t) => t.providerTransactionId === id);

    expect(byProviderId("quiltt_txn_explicit")?.isoCurrencyCode).toBe("CAD");
    expect(byProviderId("quiltt_txn_inherits")?.isoCurrencyCode).toBe("CAD");
    expect(byProviderId("quiltt_txn_unknown")?.isoCurrencyCode).toBeNull();
  });
});
