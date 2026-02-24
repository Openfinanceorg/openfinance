import Stripe from "stripe";
import { PLAN_PRICES, type PlanType } from "@openfinance/shared";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// In-memory cache: lookup_key → price ID
const priceCache = new Map<string, string>();
// Reverse cache: price ID → plan type
const reversePriceCache = new Map<string, PlanType>();

function lookupKey(planType: Exclude<PlanType, "free">): string {
  return `${planType}_monthly`;
}

async function getOrCreatePrice(
  planType: Exclude<PlanType, "free">,
): Promise<string> {
  const key = lookupKey(planType);
  const cached = priceCache.get(key);
  if (cached) return cached;

  // Search for an existing active price with this lookup key
  const existing = await stripe.prices.search({
    query: `active:'true' lookup_key:'${key}'`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const priceId = existing.data[0].id;
    priceCache.set(key, priceId);
    reversePriceCache.set(priceId, planType);
    return priceId;
  }

  // Create a new price
  const price = await stripe.prices.create({
    unit_amount: Math.round(PLAN_PRICES[planType] * 100),
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: key,
    product_data: {
      name: `OpenFinance ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
    },
  });

  priceCache.set(key, price.id);
  reversePriceCache.set(price.id, planType);
  return price.id;
}

export async function planTypeFromPriceId(priceId: string): Promise<PlanType> {
  const cached = reversePriceCache.get(priceId);
  if (cached) return cached;

  // Fetch from Stripe and read lookup_key
  const price = await stripe.prices.retrieve(priceId);
  const key = price.lookup_key;
  if (key) {
    const plan = key.replace("_monthly", "") as PlanType;
    if (plan === "plus" || plan === "pro") {
      reversePriceCache.set(priceId, plan);
      return plan;
    }
  }

  return "free";
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  planType: Exclude<PlanType, "free">,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const priceId = await getOrCreatePrice(planType);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planType },
  });
  return session.url!;
}

export async function changePlan(
  subscriptionId: string,
  newPlanType: Exclude<PlanType, "free">,
): Promise<void> {
  const priceId = await getOrCreatePrice(newPlanType);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new Error("No subscription item found");

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "always_invoice",
    metadata: { planType: newPlanType },
  });
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  await stripe.subscriptions.cancel(subscriptionId, {
    prorate: true,
  });
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function constructEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
}
