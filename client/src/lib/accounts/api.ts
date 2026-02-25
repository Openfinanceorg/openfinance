import { apiFetch } from "$lib/api-client";
import type {
  ConnectedAccount,
  DowngradeEligibility,
} from "@openfinance/shared";

export interface OnboardingState {
  accountConnected: boolean;
  mcpLinked: boolean;
  dismissed: boolean;
}

export function fetchAccounts() {
  return apiFetch<{
    accounts: ConnectedAccount[];
    onboarding: OnboardingState;
  }>("/api/accounts");
}

export function fetchAllAccounts() {
  return apiFetch<{
    accounts: ConnectedAccount[];
    onboarding: OnboardingState;
  }>("/api/accounts?includeHidden=true");
}

export function updateAccountStatus(id: number, status: "active" | "hidden") {
  return apiFetch<{ success: boolean }>(`/api/accounts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    headers: { "Content-Type": "application/json" },
  });
}

export function deleteAccount(id: number) {
  return apiFetch<{ success: boolean; downgrade?: DowngradeEligibility }>(
    `/api/accounts/${id}`,
    { method: "DELETE" },
  );
}

export function deleteUserAccount() {
  return apiFetch<{ success: boolean }>("/api/me/delete-account", {
    method: "DELETE",
  });
}

export function dismissOnboarding() {
  return apiFetch<{ ok: boolean }>("/api/me/dismiss-onboarding", {
    method: "POST",
  });
}
