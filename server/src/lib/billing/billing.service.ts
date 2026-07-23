import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { user as userTable, accountConnections } from "../../schema";
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  requiredPlanForConnectionCount,
  canAddConnection,
  type PlanType,
  type BillingStatus,
  type CheckConnectResult,
  type DowngradeEligibility,
} from "@openfinance/shared";
import * as stripeClient from "./stripe.client";

export const billingService = {
  async getConnectionCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.userId, userId),
          ne(accountConnections.status, "revoked"),
        ),
      );
    return result?.count ?? 0;
  },

  async getUserPlan(userId: string): Promise<{
    planType: PlanType;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripeSubscriptionStatus: string | null;
  }> {
    const [row] = await db
      .select({
        planType: userTable.planType,
        stripeCustomerId: userTable.stripeCustomerId,
        stripeSubscriptionId: userTable.stripeSubscriptionId,
        stripeSubscriptionStatus: userTable.stripeSubscriptionStatus,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    return {
      planType: (row?.planType as PlanType) ?? "free",
      stripeCustomerId: row?.stripeCustomerId ?? null,
      stripeSubscriptionId: row?.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: row?.stripeSubscriptionStatus ?? null,
    };
  },

  async getBillingStatus(userId: string): Promise<BillingStatus> {
    const [userPlan, connectionCount] = await Promise.all([
      this.getUserPlan(userId),
      this.getConnectionCount(userId),
    ]);

    const planType = userPlan.planType;
    const maxConnections = PLAN_LIMITS[planType];

    return {
      planType,
      connectionCount,
      maxConnections,
      canAddConnection: canAddConnection(planType, connectionCount),
      stripeSubscriptionStatus: userPlan.stripeSubscriptionStatus,
    };
  },

  async checkCanConnect(userId: string): Promise<CheckConnectResult> {
    const [userPlan, connectionCount] = await Promise.all([
      this.getUserPlan(userId),
      this.getConnectionCount(userId),
    ]);

    const planType = userPlan.planType;
    const maxConnections = PLAN_LIMITS[planType];
    const allowed = canAddConnection(planType, connectionCount);

    const result: CheckConnectResult = {
      allowed,
      currentPlan: planType,
      connectionCount,
      maxConnections,
    };

    if (!allowed) {
      result.requiredPlan = requiredPlanForConnectionCount(connectionCount + 1);
    }

    return result;
  },

  /**
   * Apply a completed Checkout Session to the user's plan.
   *
   * The webhook is still the source of truth for the subscription lifecycle,
   * but it is delivered asynchronously and races the browser redirect — and in
   * local development it never arrives at all unless `stripe listen` is
   * running. Verifying the session on return makes activation deterministic;
   * the webhook then acts as an idempotent backstop.
   */
  async confirmCheckoutSession(
    userId: string,
    sessionId: string,
  ): Promise<{ confirmed: boolean; status: BillingStatus }> {
    const session = await stripeClient.retrieveCheckoutSession(sessionId);

    // Never let one user apply another user's session.
    const belongsToUser = session.clientReferenceId === userId;
    const paid = session.paymentStatus === "paid";
    const confirmed = belongsToUser && paid;

    if (confirmed && session.customerId) {
      const planType =
        session.planType ??
        (session.priceId
          ? await stripeClient.planTypeFromPriceId(session.priceId)
          : undefined);

      await this.updateUserPlan(userId, {
        stripeCustomerId: session.customerId,
        ...(session.subscriptionId && {
          stripeSubscriptionId: session.subscriptionId,
          stripeSubscriptionStatus: session.subscriptionStatus ?? "active",
        }),
        ...(planType && planType !== "free" && { planType }),
      });
    }

    return { confirmed, status: await this.getBillingStatus(userId) };
  },

  async checkDowngradeEligibility(
    userId: string,
  ): Promise<DowngradeEligibility> {
    const [userPlan, connectionCount] = await Promise.all([
      this.getUserPlan(userId),
      this.getConnectionCount(userId),
    ]);

    const planType = userPlan.planType;
    if (planType === "free") {
      return { canDowngrade: false, currentPlan: planType };
    }

    const neededPlan = requiredPlanForConnectionCount(connectionCount);

    if (neededPlan === planType) {
      return { canDowngrade: false, currentPlan: planType };
    }

    // Can downgrade (planType is "plus" | "pro" here due to early return above)
    const currentPrice = PLAN_PRICES[planType];

    const newPrice =
      neededPlan === "free"
        ? 0
        : PLAN_PRICES[neededPlan as Exclude<PlanType, "free">];

    return {
      canDowngrade: true,
      currentPlan: planType,
      suggestedPlan: neededPlan,
      monthlySavings: currentPrice - newPrice,
    };
  },

  async updateUserPlan(
    userId: string,
    updates: {
      planType?: PlanType;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string | null;
      stripeSubscriptionStatus?: string | null;
    },
  ): Promise<void> {
    await db
      .update(userTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  },

  async updateUserPlanByCustomerId(
    stripeCustomerId: string,
    updates: {
      planType?: PlanType;
      stripeSubscriptionId?: string | null;
      stripeSubscriptionStatus?: string | null;
    },
  ): Promise<void> {
    await db
      .update(userTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userTable.stripeCustomerId, stripeCustomerId));
  },

  // Stripe-wrapping methods

  async createCheckoutSession(
    userId: string,
    email: string,
    planType: Exclude<PlanType, "free">,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    return stripeClient.createCheckoutSession(
      userId,
      email,
      planType,
      successUrl,
      cancelUrl,
    );
  },

  async changePlan(
    subscriptionId: string,
    newPlanType: Exclude<PlanType, "free">,
  ): Promise<void> {
    return stripeClient.changePlan(subscriptionId, newPlanType);
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    return stripeClient.cancelSubscription(subscriptionId);
  },

  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<string> {
    return stripeClient.createPortalSession(customerId, returnUrl);
  },

  async planTypeFromPriceId(priceId: string): Promise<PlanType> {
    return stripeClient.planTypeFromPriceId(priceId);
  },
};
