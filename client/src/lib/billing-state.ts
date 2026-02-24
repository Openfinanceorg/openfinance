import { writable } from "svelte/store";
import { getBillingStatus } from "$lib/billing/api";
import type { BillingStatus } from "@openfinance/shared";

export const billingState = writable<BillingStatus | null>(null);

export async function loadBillingState() {
  try {
    const status = await getBillingStatus();
    billingState.set(status);
  } catch {
    // ignore — stays null
  }
}

export function refreshBillingState() {
  return loadBillingState();
}
