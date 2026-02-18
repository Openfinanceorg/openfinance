<script lang="ts">
  import type { ApiTransaction } from "@openfinance/shared";
  import { fetchTransactions } from "./api";

  let transactions = $state<ApiTransaction[]>([]);
  let loading = $state(true);

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

  $effect(() => {
    load();
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
    <span class="text-xs text-gray-400">See all</span>
  </div>

  {#if loading}
    <p class="text-gray-400 text-sm py-4">Loading...</p>
  {:else if transactions.length === 0}
    <p class="text-gray-400 text-sm py-4">No transactions yet.</p>
  {:else}
    <div class="space-y-1">
      {#each transactions as tx}
        <div class="flex items-center justify-between py-2.5 px-1">
          <div class="min-w-0">
            <p class="text-sm text-gray-900 truncate">
              {tx.merchantName || tx.name}
            </p>
            <p class="text-xs text-gray-400">{formatDate(tx.date)}</p>
          </div>
          <span
            class="text-sm font-medium text-gray-900 ml-4 whitespace-nowrap"
          >
            {formatAmount(tx.amount, tx.isoCurrencyCode)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</section>
