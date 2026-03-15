export const PLAN_TYPES = ["free", "plus", "pro"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_LIMITS: Record<PlanType, number> = {
  free: 1,
  plus: 8,
  pro: 25,
};

export const PLAN_PRICES: Record<Exclude<PlanType, "free">, number> = {
  plus: 4.99,
  pro: 8.99,
};

export interface BillingStatus {
  planType: PlanType;
  connectionCount: number;
  maxConnections: number;
  canAddConnection: boolean;
  stripeSubscriptionStatus: string | null;
}

export interface CheckConnectResult {
  allowed: boolean;
  requiredPlan?: PlanType;
  currentPlan: PlanType;
  connectionCount: number;
  maxConnections: number;
}

export interface DowngradeEligibility {
  canDowngrade: boolean;
  currentPlan: PlanType;
  suggestedPlan?: PlanType;
  monthlySavings?: number;
}

export function requiredPlanForConnectionCount(count: number): PlanType {
  if (count <= PLAN_LIMITS.free) return "free";
  if (count <= PLAN_LIMITS.plus) return "plus";
  return "pro";
}

export function canAddConnection(
  planType: PlanType,
  currentCount: number,
): boolean {
  return currentCount < PLAN_LIMITS[planType];
}
