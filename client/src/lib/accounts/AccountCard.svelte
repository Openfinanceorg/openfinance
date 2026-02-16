<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";

  interface Props {
    account: ConnectedAccount;
  }

  let { account }: Props = $props();

  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as
    | string
    | undefined;
  const logoUrl = $derived(
    logoDevKey
      ? `https://img.logo.dev/name/${encodeURIComponent(account.institutionName)}?token=${logoDevKey}&size=64&format=png`
      : null,
  );

  function formatBalance(
    balance: string | null,
    currency: string | null,
  ): string {
    if (!balance) return "--";
    const num = parseFloat(balance);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  }

  function formatAccountType(type: string, subtype: string | null): string {
    const display = subtype || type;
    return (
      display.charAt(0).toUpperCase() + display.slice(1).replace(/_/g, " ")
    );
  }
</script>

<div
  class="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors flex items-start gap-4"
>
  <div
    class="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
  >
    {#if logoUrl}
      <img
        src={logoUrl}
        alt={account.institutionName}
        class="w-full h-full object-contain"
      />
    {:else}
      <span class="text-gray-500 font-medium text-lg" aria-hidden="true">
        {account.institutionName.charAt(0).toUpperCase()}
      </span>
    {/if}
  </div>
  <div class="flex-1 min-w-0 flex items-start justify-between gap-4">
    <div class="min-w-0">
      <p class="text-sm text-gray-400 mb-1">
        {account.institutionName}
      </p>
      <p class="text-base font-medium text-gray-900">
        {account.name}
        {#if account.mask}
          <span class="text-gray-400 font-normal">····{account.mask}</span>
        {/if}
      </p>
      <p class="text-sm text-gray-400 mt-0.5">
        {formatAccountType(account.type, account.subtype)}
      </p>
    </div>
    <div class="text-right flex-shrink-0">
      <p class="text-base font-medium text-gray-900">
        {formatBalance(account.currentBalance, account.isoCurrencyCode)}
      </p>
      {#if account.availableBalance && account.availableBalance !== account.currentBalance}
        <p class="text-sm text-gray-400 mt-0.5">
          {formatBalance(account.availableBalance, account.isoCurrencyCode)} available
        </p>
      {/if}
    </div>
  </div>
</div>
