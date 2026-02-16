import { writable } from "svelte/store";
import { fetchAccounts } from "./api";
import type { ConnectedAccount } from "@openfinance/shared";

interface SyncStatus {
  syncing: boolean;
  syncingInstitutions: string[];
  completed: boolean;
}

export const syncStatus = writable<SyncStatus>({
  syncing: false,
  syncingInstitutions: [],
  completed: false,
});

let pollTimer: ReturnType<typeof setInterval> | null = null;
let idlePollCount = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let onSyncCompleteCallback: ((accounts: ConnectedAccount[]) => void) | null =
  null;

export function setOnSyncComplete(
  cb: (accounts: ConnectedAccount[]) => void,
): void {
  onSyncCompleteCallback = cb;
}

export function triggerPoll(): void {
  idlePollCount = 0;
  if (!pollTimer) {
    syncStatus.set({
      syncing: true,
      syncingInstitutions: [],
      completed: false,
    });
    clearDismissTimer();
    poll();
    pollTimer = setInterval(poll, 3000);
  }
}

export function dismiss(): void {
  syncStatus.update((s) => ({ ...s, completed: false }));
  clearDismissTimer();
}

async function poll(): Promise<void> {
  try {
    const data = await fetchAccounts();
    const syncingAccounts = data.accounts.filter((a) => a.isSyncing);

    if (syncingAccounts.length > 0) {
      idlePollCount = 0;
      syncStatus.update((s) => ({
        ...s,
        syncing: true,
        syncingInstitutions: [
          ...new Set(syncingAccounts.map((a) => a.institutionName)),
        ],
      }));
    } else {
      idlePollCount++;
      if (idlePollCount >= 3) {
        stopPolling();
        syncStatus.set({
          syncing: false,
          syncingInstitutions: [],
          completed: true,
        });
        onSyncCompleteCallback?.(data.accounts);
        dismissTimer = setTimeout(dismiss, 8000);
      }
    }
  } catch {
    // ignore polling errors
  }
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function clearDismissTimer(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}
