import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "$lib/middleware";
import { billingService } from "$lib/billing";
import { PLAN_TYPES, type PlanType } from "@openfinance/shared";

const billingRoutes = new Hono<AuthEnv>();

billingRoutes.use("*", requireAuth);

// GET /api/billing/status
billingRoutes.get("/status", async (c) => {
  const user = c.get("user");
  const status = await billingService.getBillingStatus(user.id);
  return c.json(status);
});

// POST /api/billing/check-connect
billingRoutes.post("/check-connect", async (c) => {
  const user = c.get("user");
  const result = await billingService.checkCanConnect(user.id);
  return c.json(result);
});

// POST /api/billing/create-checkout
billingRoutes.post(
  "/create-checkout",
  zValidator(
    "json",
    z.object({
      planType: z.enum(["plus", "pro"]),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { planType } = c.req.valid("json");

    const appUrl = process.env.APP_URL!;
    const successUrl = `${appUrl}/?checkout=success`;
    const cancelUrl = `${appUrl}/?checkout=cancel`;

    const url = await billingService.createCheckoutSession(
      user.id,
      user.email,
      planType,
      successUrl,
      cancelUrl,
    );

    return c.json({ url });
  },
);

// POST /api/billing/change-plan
billingRoutes.post(
  "/change-plan",
  zValidator(
    "json",
    z.object({
      planType: z.enum(["plus", "pro"]),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    const { planType } = c.req.valid("json");

    const userPlan = await billingService.getUserPlan(user.id);

    if (!userPlan.stripeSubscriptionId) {
      return c.json({ error: "No active subscription" }, 400);
    }

    await billingService.changePlan(userPlan.stripeSubscriptionId, planType);

    return c.json({ success: true });
  },
);

// POST /api/billing/cancel
billingRoutes.post("/cancel", async (c) => {
  const user = c.get("user");
  const userPlan = await billingService.getUserPlan(user.id);

  if (!userPlan.stripeSubscriptionId) {
    return c.json({ error: "No active subscription" }, 400);
  }

  await billingService.cancelSubscription(userPlan.stripeSubscriptionId);

  await billingService.updateUserPlan(user.id, {
    planType: "free",
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
  });

  return c.json({ success: true });
});

// POST /api/billing/create-portal
billingRoutes.post("/create-portal", async (c) => {
  const user = c.get("user");
  const userPlan = await billingService.getUserPlan(user.id);

  if (!userPlan.stripeCustomerId) {
    return c.json({ error: "No Stripe customer" }, 400);
  }

  const appUrl = process.env.APP_URL!;
  const url = await billingService.createPortalSession(
    userPlan.stripeCustomerId,
    appUrl,
  );

  return c.json({ url });
});

export default billingRoutes;
