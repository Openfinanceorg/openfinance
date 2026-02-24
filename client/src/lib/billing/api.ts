import { apiFetch } from "$lib/api-client";
import type {
  BillingStatus,
  CheckConnectResult,
  DowngradeEligibility,
  PlanType,
} from "@openfinance/shared";

export function getBillingStatus() {
  return apiFetch<BillingStatus>("/api/billing/status");
}

export function checkCanConnect() {
  return apiFetch<CheckConnectResult>("/api/billing/check-connect", {
    method: "POST",
  });
}

export function createCheckoutSession(planType: Exclude<PlanType, "free">) {
  return apiFetch<{ url: string }>("/api/billing/create-checkout", {
    method: "POST",
    body: JSON.stringify({ planType }),
  });
}

export function changePlan(planType: Exclude<PlanType, "free">) {
  return apiFetch<{ success: boolean }>("/api/billing/change-plan", {
    method: "POST",
    body: JSON.stringify({ planType }),
  });
}

export function cancelSubscription() {
  return apiFetch<{ success: boolean }>("/api/billing/cancel", {
    method: "POST",
  });
}

export function createPortalSession() {
  return apiFetch<{ url: string }>("/api/billing/create-portal", {
    method: "POST",
  });
}
