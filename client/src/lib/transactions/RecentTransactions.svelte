<script lang="ts">
  import type { ApiTransaction } from "@openfinance/shared";
  import { fetchTransactions } from "./api";
  import { syncStatus } from "$lib/sync/sync-status";
  import InstitutionLogo from "$lib/components/InstitutionLogo.svelte";
  import { accountsState } from "$lib/accounts/state";
  import { cn } from "$lib/utils";

  let transactions = $state<ApiTransaction[]>([]);
  let loading = $state(true);
  let accounts = $derived($accountsState?.accounts ?? []);

  async function load() {
    try {
      const data = await fetchTransactions({ limit: 5 });
      transactions = data.transactions;
    } catch {
      transactions = [];
    } finally {
      loading = false;
    }
  }

  // Initial load
  $effect(() => {
    load();
  });

  // Re-fetch when sync completes
  $effect(() => {
    if ($syncStatus.completed) {
      load();
    }
  });

  function formatAmount(amount: number, currency: string | null) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
</script>

<section>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-base font-semibold text-gray-700">Recent transactions</h2>
    <a
      href="/transactions"
      class="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2"
      >View all</a
    >
  </div>

  {#if loading}
    <p class="text-gray-400 text-sm py-4">Loading...</p>
  {:else if transactions.length === 0}
    <p class="text-gray-400 text-sm py-4">No transactions yet.</p>
  {:else}
    <div class="space-y-1">
      {#each transactions as tx}
        {@const account = accounts.find((a) => a.id === tx.accountId)}
        <div class="flex items-center justify-between py-2.5 px-1 gap-2">
          <div class="min-w-0 flex items-center gap-2 flex-1">
            <div class="min-w-0">
              <p class="text-sm text-gray-900 truncate">
                {tx.merchantName || tx.name}
              </p>
              <p class="text-xs text-gray-400">{formatDate(tx.date)}</p>
            </div>
            {#if account}
              <div class="flex items-center gap-1.5 min-w-0 ml-2">
                <InstitutionLogo
                  institutionUrl={account.institutionUrl}
                  institutionName={account.institutionName}
                />
                <span class="text-xs text-gray-600 truncate">
                  {account.name}
                </span>
              </div>
            {/if}
          </div>
          <span
            class={cn(
              "text-sm font-medium ml-4 whitespace-nowrap flex-shrink-0",
              tx.amount < 0 ? "text-green-600" : "text-gray-900",
            )}
          >
            {formatAmount(tx.amount, tx.isoCurrencyCode)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</section>
