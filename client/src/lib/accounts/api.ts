import { apiFetch } from "$lib/api-client";
import type { ConnectedAccount } from "@openfinance/shared";

export function fetchAccounts() {
  return apiFetch<{ accounts: ConnectedAccount[] }>("/api/accounts");
}
