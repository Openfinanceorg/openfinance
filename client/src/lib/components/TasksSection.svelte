<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { Button } from "$lib/components/ui/button";
  import CircleAlert from "lucide-svelte/icons/circle-alert";

  interface Props {
    accounts: ConnectedAccount[];
    onConnectAccount: () => void;
  }

  let { accounts, onConnectAccount }: Props = $props();

  let hasNoAccounts = $derived(accounts.length === 0);
  let errorAccounts = $derived(accounts.filter((a) => a.syncError));
  let hasTasks = $derived(hasNoAccounts || errorAccounts.length > 0);
</script>

{#if hasTasks}
  <section class="mb-8">
    <h2 class="text-base font-semibold text-gray-700 mb-4">To do</h2>
    <div class="space-y-3">
      {#if hasNoAccounts}
        <div
          class="flex items-center justify-between rounded-lg border border-gray-200 p-4"
        >
          <div>
            <p class="text-sm font-medium text-gray-900">
              Connect your first bank account
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              Link a bank to start tracking your finances.
            </p>
          </div>
          <Button size="sm" onclick={onConnectAccount}>Connect</Button>
        </div>
      {/if}

      {#each errorAccounts as account}
        <div
          class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <CircleAlert class="h-4 w-4 text-red-500 shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {account.institutionName} sync error
            </p>
            <p class="text-xs text-red-600 mt-0.5">
              {account.syncError?.message}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}
