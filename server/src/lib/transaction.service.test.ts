import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  user,
  accountConnections,
  financialAccounts,
  institutionRegistry,
  transactions,
} from "../schema";
import { transactionService } from "./transaction.service";

describe("TransactionService", () => {
  const testUserId = `test-user-${randomUUID().slice(0, 8)}`;

  let accountId: number;
  let connectionId: number;
  let registryId: number;

  beforeAll(async () => {
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: `${testUserId}@test.com`,
      emailVerified: false,
    });

    const [registry] = await db
      .insert(institutionRegistry)
      .values({
        name: "Test Bank",
        logo: "https://logo.png",
        url: "https://testbank.com",
        countryCode: "US",
        lastSynced: new Date(),
      })
      .returning();
    registryId = registry.id;

    const [conn] = await db
      .insert(accountConnections)
      .values({
        userId: testUserId,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: `item_${randomUUID().slice(0, 8)}`,
        plaidAccessToken: `access_${randomUUID()}`,
      })
      .returning();
    connectionId = conn.id;

    const [acct] = await db
      .insert(financialAccounts)
      .values({
        userId: testUserId,
        accountConnectionId: connectionId,
        providerAccountId: `acct_${randomUUID().slice(0, 8)}`,
        name: "Checking",
        type: "depository",
        subtype: "checking",
        mask: "1234",
        currentBalance: "5000.00",
        isoCurrencyCode: "USD",
      })
      .returning();
    accountId = acct.id;

    await db.insert(transactions).values([
      {
        userId: testUserId,
        accountId,
        providerTransactionId: `txn_1_${randomUUID().slice(0, 8)}`,
        name: "Starbucks Coffee",
        amount: "5.50",
        isoCurrencyCode: "USD",
        date: new Date("2025-01-10"),
        merchantName: "Starbucks",
        status: "active",
      },
      {
        userId: testUserId,
        accountId,
        providerTransactionId: `txn_2_${randomUUID().slice(0, 8)}`,
        name: "Amazon Purchase",
        amount: "120.00",
        isoCurrencyCode: "USD",
        date: new Date("2025-01-15"),
        merchantName: "Amazon",
        status: "active",
      },
      {
        userId: testUserId,
        accountId,
        providerTransactionId: `txn_3_${randomUUID().slice(0, 8)}`,
        name: "Grocery Store",
        amount: "45.00",
        isoCurrencyCode: "USD",
        date: new Date("2025-02-01"),
        merchantName: "Whole Foods",
        status: "active",
      },
      {
        userId: testUserId,
        accountId,
        providerTransactionId: `txn_4_${randomUUID().slice(0, 8)}`,
        name: "Deleted Transaction",
        amount: "10.00",
        isoCurrencyCode: "USD",
        date: new Date("2025-01-20"),
        merchantName: "Ghost Store",
        status: "deleted",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(transactions).where(eq(transactions.userId, testUserId));
    await db
      .delete(financialAccounts)
      .where(eq(financialAccounts.userId, testUserId));
    await db
      .delete(accountConnections)
      .where(eq(accountConnections.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
    await db
      .delete(institutionRegistry)
      .where(eq(institutionRegistry.id, registryId));
  });

  it("returns all active transactions, excluding deleted", async () => {
    const results =
      await transactionService.getTransactionsByUserId(testUserId);

    expect(results).toHaveLength(3);
    expect(results.every((t) => t.status !== "deleted")).toBe(true);
  });

  it("filters by date range", async () => {
    const results = await transactionService.getTransactionsByUserId(
      testUserId,
      { startDate: "2025-01-10", endDate: "2025-01-20" },
    );

    expect(results).toHaveLength(2);
    for (const t of results) {
      expect(t.date >= "2025-01-10").toBe(true);
      expect(t.date <= "2025-01-20").toBe(true);
    }
  });

  it("filters by searchText (merchant name)", async () => {
    const results = await transactionService.getTransactionsByUserId(
      testUserId,
      { searchText: "Starbucks" },
    );

    expect(results).toHaveLength(1);
    expect(results[0].merchantName).toBe("Starbucks");
  });

  it("filters by amountFilters", async () => {
    const results = await transactionService.getTransactionsByUserId(
      testUserId,
      { amountFilters: [{ operator: ">=", amount: 45 }] },
    );

    expect(results).toHaveLength(2);
    for (const t of results) {
      expect(t.amount).toBeGreaterThanOrEqual(45);
    }
  });

  describe("queryTransactions", () => {
    it("runs an aggregation query", async () => {
      const result = await transactionService.queryTransactions(
        testUserId,
        "SELECT merchant_name, SUM(amount) as total FROM txns GROUP BY 1 ORDER BY total DESC",
      );

      expect(result).not.toHaveProperty("error");
      expect(result).toHaveProperty("rows");

      const { rows } = result as { rows: Record<string, unknown>[] };
      expect(rows).toHaveLength(3);
      expect(
        Number(rows.find((r) => r.merchant_name === "Amazon")?.total),
      ).toBe(120);
      expect(
        Number(rows.find((r) => r.merchant_name === "Whole Foods")?.total),
      ).toBe(45);
      expect(
        Number(rows.find((r) => r.merchant_name === "Starbucks")?.total),
      ).toBe(5.5);
    });

    it("filters with WHERE clause", async () => {
      const result = await transactionService.queryTransactions(
        testUserId,
        "SELECT * FROM txns WHERE merchant_name ILIKE '%starbucks%'",
      );

      expect(result).not.toHaveProperty("error");
      const { rows, rowCount } = result as {
        rows: Record<string, unknown>[];
        rowCount: number;
      };
      expect(rowCount).toBe(1);
      expect(rows[0].merchant_name).toBe("Starbucks");
      expect(Number(rows[0].amount)).toBe(5.5);
    });

    it("excludes deleted transactions", async () => {
      const result = await transactionService.queryTransactions(
        testUserId,
        "SELECT * FROM txns WHERE merchant_name = 'Ghost Store'",
      );

      expect(result).not.toHaveProperty("error");
      const { rowCount } = result as { rowCount: number };
      expect(rowCount).toBe(0);
    });

    it("returns error for invalid SQL", async () => {
      const result = await transactionService.queryTransactions(
        testUserId,
        "SELECT * FROM nonexistent_table",
      );

      expect(result).toHaveProperty("error");
    });

    it("blocks mutation queries", async () => {
      const result = await transactionService.queryTransactions(
        testUserId,
        "DELETE FROM txns",
      );

      expect(result).toHaveProperty("error");
    });
  });
});
