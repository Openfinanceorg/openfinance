import { Hono } from "hono";
import { billingService, constructEvent } from "$lib/billing";
import type { PlanType } from "@openfinance/shared";

const stripeWebhookRoutes = new Hono();

// No auth middleware — Stripe sends these requests directly

stripeWebhookRoutes.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  let event;
  try {
    const body = await c.req.text();
    event = constructEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.client_reference_id as string;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const planType = session.metadata?.planType as PlanType | undefined;

      if (userId && customerId) {
        await billingService.updateUserPlan(userId, {
          stripeCustomerId: customerId,
          ...(subscriptionId && { stripeSubscriptionId: subscriptionId }),
          ...(subscriptionId && { stripeSubscriptionStatus: "active" }),
          ...(planType && planType !== "free" && { planType }),
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer as string;
      const status = subscription.status as string;
      const priceId = subscription.items?.data?.[0]?.price?.id as string;

      const planType = await billingService.planTypeFromPriceId(priceId);

      await billingService.updateUserPlanByCustomerId(customerId, {
        planType,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: status,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer as string;

      await billingService.updateUserPlanByCustomerId(customerId, {
        planType: "free",
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      console.warn(
        `Payment failed for customer ${invoice.customer}, subscription ${invoice.subscription}`,
      );
      break;
    }

    default:
      // Unknown event type — ignore
      break;
  }

  return c.json({ received: true });
});

export default stripeWebhookRoutes;
