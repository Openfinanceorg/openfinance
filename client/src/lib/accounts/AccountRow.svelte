<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { formatBalance, isLiabilityGroup } from "./utils";

  interface Props {
    account: ConnectedAccount;
    groupKey: string;
  }

  let { account, groupKey }: Props = $props();

  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as
    | string
    | undefined;

  const logoUrl = $derived.by(() => {
    if (!logoDevKey || !account.institutionUrl) return null;
    try {
      const url = account.institutionUrl.startsWith("http")
        ? account.institutionUrl
        : `https://${account.institutionUrl}`;
      const domain = new URL(url).hostname;
      return `https://img.logo.dev/${domain}?token=${logoDevKey}&size=64&format=png`;
    } catch {
      return null;
    }
  });

  const isLiability = $derived(isLiabilityGroup(groupKey));

  const displayBalance = $derived.by(() => {
    if (!account.currentBalance) return "--";
    const num = parseFloat(account.currentBalance);
    const value = isLiability ? -Math.abs(num) : num;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: account.isoCurrencyCode || "USD",
    }).format(value);
  });
</script>

<div class="flex items-center gap-3 py-2.5 px-1">
  <div
    class="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
  >
    {#if logoUrl}
      <img
        src={logoUrl}
        alt={account.institutionName}
        class="w-full h-full object-contain"
      />
    {:else}
      <span class="text-gray-500 font-medium text-sm" aria-hidden="true">
        {account.institutionName.charAt(0).toUpperCase()}
      </span>
    {/if}
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 truncate">
      {account.name}
      {#if account.mask}
        <span class="text-gray-500 font-normal">····{account.mask}</span>
      {/if}
    </p>
    <p class="text-xs text-gray-500 truncate">{account.institutionName}</p>
  </div>
  <div class="flex-shrink-0 text-sm font-medium text-gray-900">
    {displayBalance}
  </div>
</div>
