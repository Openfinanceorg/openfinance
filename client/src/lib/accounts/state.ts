import { writable } from "svelte/store";
import { fetchAccounts } from "./api";
import type { OnboardingState } from "./api";
import type { ConnectedAccount } from "@openfinance/shared";

interface AccountsState {
  accounts: ConnectedAccount[];
  onboarding: OnboardingState;
}

export const accountsState = writable<AccountsState | null>(null);

export async function loadAccountsState() {
  try {
    const data = await fetchAccounts();
    accountsState.set({ accounts: data.accounts, onboarding: data.onboarding });
  } catch {
    // ignore — stays null
  }
}

export function refreshAccountsState() {
  return loadAccountsState();
}
