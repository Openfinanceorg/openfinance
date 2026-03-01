import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { db } from "../db";
import {
  user,
  accountConnections,
  financialAccounts,
  institutionRegistry,
  syncJobs,
} from "../schema";
import { TransactionPollWorkflow } from "./transaction-poll.workflow";

describe("TransactionPollWorkflow.fetchActiveConnections", () => {
  const testUserId = `test-poll-${randomUUID().slice(0, 8)}`;
  let connectionId1: number;
  let connectionId2: number;
  let registryId: number;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    DBOS.setConfig({
      name: "transaction-poll-test",
      systemDatabaseUrl: dbUrl,
    });
    await DBOS.launch();

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

    const [conn1] = await db
      .insert(accountConnections)
      .values({
        userId: testUserId,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: `item_${randomUUID().slice(0, 8)}`,
        plaidAccessToken: `access_${randomUUID()}`,
        status: "active",
      })
      .returning();
    connectionId1 = conn1.id;

    const [conn2] = await db
      .insert(accountConnections)
      .values({
        userId: testUserId,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: `item_${randomUUID().slice(0, 8)}`,
        plaidAccessToken: `access_${randomUUID()}`,
        status: "active",
      })
      .returning();
    connectionId2 = conn2.id;

    // Both connections have financial accounts
    await db.insert(financialAccounts).values([
      {
        userId: testUserId,
        accountConnectionId: connectionId1,
        providerAccountId: `acct_${randomUUID().slice(0, 8)}`,
        name: "Checking 1",
        type: "depository",
        subtype: "checking",
        mask: "1111",
        currentBalance: "1000.00",
        isoCurrencyCode: "USD",
      },
      {
        userId: testUserId,
        accountConnectionId: connectionId2,
        providerAccountId: `acct_${randomUUID().slice(0, 8)}`,
        name: "Checking 2",
        type: "depository",
        subtype: "checking",
        mask: "2222",
        currentBalance: "2000.00",
        isoCurrencyCode: "USD",
      },
    ]);

    // Connection 1 has a disconnect error sync job
    await db.insert(syncJobs).values({
      userId: testUserId,
      accountConnectionId: connectionId1,
      provider: "plaid",
      jobType: "transactions",
      status: "error",
      errorMessage: "ITEM_LOGIN_REQUIRED",
      errorCode: "ITEM_LOGIN_REQUIRED",
    });

    // Connection 2 has a pending sync job
    await db.insert(syncJobs).values({
      userId: testUserId,
      accountConnectionId: connectionId2,
      provider: "plaid",
      jobType: "transactions",
      status: "pending",
    });
  });

  afterAll(async () => {
    await db.delete(syncJobs).where(eq(syncJobs.userId, testUserId));
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
    await DBOS.shutdown();
  });

  it("skips disconnected and pending connections", async () => {
    const connections = await TransactionPollWorkflow.fetchActiveConnections();

    const ids = connections.map((c) => c.id);

    // Connection 1 has ITEM_LOGIN_REQUIRED error → skipped
    expect(ids).not.toContain(connectionId1);
    // Connection 2 has pending sync job → skipped
    expect(ids).not.toContain(connectionId2);
  });
});
