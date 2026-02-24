import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { user, accountConnections, institutionRegistry } from "../../schema";
import { billingService } from "./billing.service";
import {
  requiredPlanForConnectionCount,
  canAddConnection,
} from "@openfinance/shared";

describe("Shared plan helpers", () => {
  it("requiredPlanForConnectionCount returns correct plan", () => {
    expect(requiredPlanForConnectionCount(0)).toBe("free");
    expect(requiredPlanForConnectionCount(1)).toBe("free");
    expect(requiredPlanForConnectionCount(2)).toBe("plus");
    expect(requiredPlanForConnectionCount(5)).toBe("plus");
    expect(requiredPlanForConnectionCount(6)).toBe("pro");
    expect(requiredPlanForConnectionCount(25)).toBe("pro");
  });

  it("canAddConnection returns correct result", () => {
    expect(canAddConnection("free", 0)).toBe(true);
    expect(canAddConnection("free", 1)).toBe(false);
    expect(canAddConnection("plus", 4)).toBe(true);
    expect(canAddConnection("plus", 5)).toBe(false);
    expect(canAddConnection("pro", 24)).toBe(true);
    expect(canAddConnection("pro", 25)).toBe(false);
  });
});

describe("BillingService", () => {
  const testUserId = `test-billing-${randomUUID().slice(0, 8)}`;
  const testUserId2 = `test-billing2-${randomUUID().slice(0, 8)}`;
  const testUserId3 = `test-billing3-${randomUUID().slice(0, 8)}`;
  let registryId: number;

  beforeAll(async () => {
    // Create registry entry for test connections
    const [registry] = await db
      .insert(institutionRegistry)
      .values({
        name: "Billing Test Bank",
        logo: "https://logo.png",
        url: "https://billingtest.com",
        countryCode: "US",
        lastSynced: new Date(),
      })
      .returning();
    registryId = registry.id;

    // User 1: 0 connections (free)
    await db.insert(user).values({
      id: testUserId,
      name: "Test User",
      email: `${testUserId}@test.com`,
      emailVerified: false,
    });

    // User 2: 3 connections (1 revoked)
    await db.insert(user).values({
      id: testUserId2,
      name: "Test User 2",
      email: `${testUserId2}@test.com`,
      emailVerified: false,
    });

    // Create 3 active + 1 revoked connections for user2
    for (let i = 0; i < 3; i++) {
      await db.insert(accountConnections).values({
        userId: testUserId2,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: `item_billing_${randomUUID().slice(0, 8)}`,
        plaidAccessToken: `access_${randomUUID()}`,
        status: "active",
      });
    }
    await db.insert(accountConnections).values({
      userId: testUserId2,
      provider: "plaid",
      institutionRegistryId: registryId,
      plaidItemId: `item_billing_revoked_${randomUUID().slice(0, 8)}`,
      plaidAccessToken: `access_${randomUUID()}`,
      status: "revoked",
    });

    // User 3: pro plan with 2 connections (can downgrade)
    await db.insert(user).values({
      id: testUserId3,
      name: "Test User 3",
      email: `${testUserId3}@test.com`,
      emailVerified: false,
      planType: "pro",
      stripeCustomerId: `cus_test_${randomUUID().slice(0, 8)}`,
      stripeSubscriptionId: `sub_test_${randomUUID().slice(0, 8)}`,
      stripeSubscriptionStatus: "active",
    });
    for (let i = 0; i < 2; i++) {
      await db.insert(accountConnections).values({
        userId: testUserId3,
        provider: "plaid",
        institutionRegistryId: registryId,
        plaidItemId: `item_billing3_${randomUUID().slice(0, 8)}`,
        plaidAccessToken: `access_${randomUUID()}`,
        status: "active",
      });
    }
  });

  afterAll(async () => {
    await db
      .delete(accountConnections)
      .where(eq(accountConnections.userId, testUserId));
    await db
      .delete(accountConnections)
      .where(eq(accountConnections.userId, testUserId2));
    await db
      .delete(accountConnections)
      .where(eq(accountConnections.userId, testUserId3));
    await db.delete(user).where(eq(user.id, testUserId));
    await db.delete(user).where(eq(user.id, testUserId2));
    await db.delete(user).where(eq(user.id, testUserId3));
    await db
      .delete(institutionRegistry)
      .where(eq(institutionRegistry.id, registryId));
  });

  it("getConnectionCount returns 0 for user with no connections", async () => {
    const count = await billingService.getConnectionCount(testUserId);
    expect(count).toBe(0);
  });

  it("getConnectionCount returns correct count excluding revoked", async () => {
    const count = await billingService.getConnectionCount(testUserId2);
    expect(count).toBe(3);
  });

  it("getBillingStatus returns correct status for free user", async () => {
    const status = await billingService.getBillingStatus(testUserId);
    expect(status.planType).toBe("free");
    expect(status.connectionCount).toBe(0);
    expect(status.maxConnections).toBe(1);
    expect(status.canAddConnection).toBe(true);
  });

  it("getBillingStatus returns correct status for user with connections", async () => {
    const status = await billingService.getBillingStatus(testUserId2);
    expect(status.planType).toBe("free");
    expect(status.connectionCount).toBe(3);
    expect(status.maxConnections).toBe(1);
    expect(status.canAddConnection).toBe(false);
  });

  it("checkCanConnect returns allowed for user under limit", async () => {
    const result = await billingService.checkCanConnect(testUserId);
    expect(result.allowed).toBe(true);
    expect(result.currentPlan).toBe("free");
  });

  it("checkCanConnect returns not allowed with requiredPlan when at limit", async () => {
    const result = await billingService.checkCanConnect(testUserId2);
    expect(result.allowed).toBe(false);
    expect(result.requiredPlan).toBe("plus");
  });

  it("checkDowngradeEligibility suggests cheaper plan for pro user with few connections", async () => {
    const result = await billingService.checkDowngradeEligibility(testUserId3);
    expect(result.canDowngrade).toBe(true);
    expect(result.suggestedPlan).toBe("plus");
    expect(result.monthlySavings).toBe(4);
  });

  it("checkDowngradeEligibility returns false for free user", async () => {
    const result = await billingService.checkDowngradeEligibility(testUserId);
    expect(result.canDowngrade).toBe(false);
    expect(result.currentPlan).toBe("free");
  });

  it("updateUserPlan correctly updates plan and stripe fields", async () => {
    const customerId = `cus_test_${randomUUID().slice(0, 8)}`;
    await billingService.updateUserPlan(testUserId, {
      planType: "plus",
      stripeCustomerId: customerId,
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
    });

    const plan = await billingService.getUserPlan(testUserId);
    expect(plan.planType).toBe("plus");
    expect(plan.stripeCustomerId).toBe(customerId);
    expect(plan.stripeSubscriptionId).toBe("sub_123");
    expect(plan.stripeSubscriptionStatus).toBe("active");

    // Reset
    await billingService.updateUserPlan(testUserId, {
      planType: "free",
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
    });
  });

  it("updateUserPlanByCustomerId correctly updates user", async () => {
    const plan = await billingService.getUserPlan(testUserId3);
    const customerId = plan.stripeCustomerId!;

    await billingService.updateUserPlanByCustomerId(customerId, {
      planType: "plus",
      stripeSubscriptionStatus: "past_due",
    });

    const updated = await billingService.getUserPlan(testUserId3);
    expect(updated.planType).toBe("plus");
    expect(updated.stripeSubscriptionStatus).toBe("past_due");

    // Reset
    await billingService.updateUserPlanByCustomerId(customerId, {
      planType: "pro",
      stripeSubscriptionStatus: "active",
    });
  });
});
