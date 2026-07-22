<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";
  import AccountCarousel from "./AccountCarousel.svelte";
  import { currencyTotals } from "./utils";

  interface Props {
    accounts: ConnectedAccount[];
    onAddAccount?: () => void;
    onReauth?: (account: ConnectedAccount) => void;
    onAccountClick?: (accountId: number) => void;
  }

  let {
    accounts,
    onAddAccount = undefined,
    onReauth = undefined,
    onAccountClick = undefined,
  }: Props = $props();

  // One total per currency — balances are never converted between currencies.
  // A lone total reads fine as a symbol ("CA$182,180.48"), but once there are
  // several, each gets its ISO code so no line can be mistaken for a subtotal
  // or a second figure about the same money.
  let totalsByCurrency = $derived.by(() => {
    const totals = currencyTotals(accounts);
    const currencyDisplay = totals.length > 1 ? "code" : "symbol";
    return totals.map(({ currency, amount }) => ({
      currency,
      formatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        currencyDisplay,
      }).format(amount),
    }));
  });
</script>

<section>
  <div class="flex items-center justify-between mb-4">
    <div>
      <p class="text-xs text-[var(--text-muted)]">Total balance</p>
      {#each totalsByCurrency as total (total.currency)}
        <p class="text-2xl font-semibold text-[var(--text)] leading-snug">
          {total.formatted}
        </p>
      {/each}
    </div>
    <Button variant="linkBlue" size="link" onclick={onAddAccount}>
      <Plus class="h-3.5 w-3.5" />
      add account
    </Button>
  </div>
  <AccountCarousel {accounts} {onReauth} {onAccountClick} />
</section>
