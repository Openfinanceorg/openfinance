<script lang="ts">
  import { fetchAccounts } from "./api";
  import type { ConnectedAccount } from "@shared/types";

  interface Props {
    onSyncComplete?: (accounts: ConnectedAccount[]) => void;
  }

  let { onSyncComplete }: Props = $props();

  let syncing = $state(false);
  let syncingInstitutions = $state<string[]>([]);
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let idlePollCount = 0;

  export function triggerPoll() {
    idlePollCount = 0;
    if (!pollTimer) {
      syncing = true;
      poll();
      pollTimer = setInterval(poll, 3000);
    }
  }

  async function poll() {
    try {
      const data = await fetchAccounts();
      const syncingAccounts = data.accounts.filter((a) => a.isSyncing);

      if (syncingAccounts.length > 0) {
        idlePollCount = 0;
        syncing = true;
        syncingInstitutions = [
          ...new Set(syncingAccounts.map((a) => a.institutionName)),
        ];
      } else {
        idlePollCount++;
        if (idlePollCount >= 3) {
          stopPolling();
          onSyncComplete?.(data.accounts);
        }
      }
    } catch {
      // ignore polling errors
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    syncing = false;
    syncingInstitutions = [];
  }
</script>

{#if syncing}
  <div
    class="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50"
  >
    <svg
      class="animate-spin h-4 w-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <span class="text-sm text-gray-600">
      Syncing{syncingInstitutions.length > 0
        ? ` ${syncingInstitutions.join(", ")}`
        : ""}...
    </span>
  </div>
{/if}
