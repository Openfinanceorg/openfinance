/**
 * Tests for billingService.confirmCheckoutSession.
 *
 * Activation used to depend solely on the Stripe webhook, which is delivered
 * asynchronously and races the browser redirect — so a user could pay, land on
 * `?checkout=success`, and still be told they'd hit their connection limit.
 * Confirming the session on return closes that race, but it also means a
 * user-supplied session id reaches the billing code, so ownership and payment
 * state both have to be checked.
 */
import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";

const mockRetrieveCheckoutSession = vi.fn();

vi.mock("./stripe.client", () => ({
  retrieveCheckoutSession: mockRetrieveCheckoutSession,
  planTypeFromPriceId: vi.fn().mockResolvedValue("plus"),
  createCheckoutSession: vi.fn(),
  changePlan: vi.fn(),
  cancelSubscription: vi.fn(),
  createPortalSession: vi.fn(),
  constructEvent: vi.fn(),
}));

const { db } = await import("../../db");
const { user } = await import("../../schema");
const { billingService } = await import("./billing.service");

function session(overrides: Record<string, unknown> = {}) {
  return {
    clientReferenceId: null,
    paymentStatus: "paid",
    customerId: "cus_test",
    subscriptionId: "sub_test",
    subscriptionStatus: "active",
    planType: "plus",
    priceId: "price_test",
    ...overrides,
  };
}

describe("billingService.confirmCheckoutSession", () => {
  const userId = `test-confirm-${randomUUID().slice(0, 8)}`;
  const otherUserId = `test-confirm-other-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    for (const id of [userId, otherUserId]) {
      await db.insert(user).values({
        id,
        name: "Confirm Test",
        email: `${id}@test.com`,
        emailVerified: false,
      });
    }
  });

  afterAll(async () => {
    for (const id of [userId, otherUserId]) {
      await db.delete(user).where(eq(user.id, id));
    }
  });

  it("applies the plan when the session is paid and belongs to the user", async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce(
      session({ clientReferenceId: userId }),
    );

    const result = await billingService.confirmCheckoutSession(userId, "cs_1");

    expect(result.confirmed).toBe(true);
    expect(result.status.planType).toBe("plus");
    expect(result.status.maxConnections).toBe(5);

    const plan = await billingService.getUserPlan(userId);
    expect(plan.planType).toBe("plus");
    expect(plan.stripeCustomerId).toBe("cus_test");
    expect(plan.stripeSubscriptionId).toBe("sub_test");
    expect(plan.stripeSubscriptionStatus).toBe("active");
  });

  it("is idempotent when the webhook already applied the same session", async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce(
      session({ clientReferenceId: userId }),
    );

    const result = await billingService.confirmCheckoutSession(userId, "cs_1");

    expect(result.confirmed).toBe(true);
    expect(result.status.planType).toBe("plus");
  });

  it("refuses a session belonging to a different user", async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce(
      session({ clientReferenceId: otherUserId }),
    );

    const result = await billingService.confirmCheckoutSession(
      userId,
      "cs_someone_else",
    );

    expect(result.confirmed).toBe(false);

    // The victim's plan must be untouched by the caller's session id.
    const plan = await billingService.getUserPlan(otherUserId);
    expect(plan.planType).toBe("free");
  });

  it("refuses an unpaid session", async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce(
      session({ clientReferenceId: otherUserId, paymentStatus: "unpaid" }),
    );

    const result = await billingService.confirmCheckoutSession(
      otherUserId,
      "cs_unpaid",
    );

    expect(result.confirmed).toBe(false);
    const plan = await billingService.getUserPlan(otherUserId);
    expect(plan.planType).toBe("free");
  });

  it("falls back to the price id when the session carries no plan metadata", async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce(
      session({ clientReferenceId: otherUserId, planType: null }),
    );

    const result = await billingService.confirmCheckoutSession(
      otherUserId,
      "cs_no_meta",
    );

    expect(result.confirmed).toBe(true);
    expect(result.status.planType).toBe("plus");
  });
});
