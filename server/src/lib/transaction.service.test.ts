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
});
