<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { formatBalance, isLiabilityGroup } from "./utils";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";

  export interface Props {
    account: ConnectedAccount;
    groupKey: string;
    onReauth?: (account: ConnectedAccount) => void;
    isConnectorLoading?: boolean;
  }

  let {
    account,
    groupKey,
    onReauth = undefined,
    isConnectorLoading = false,
  }: Props = $props();

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

{#snippet syncErrorReconnect()}
  <button
    class="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
    onclick={() => {
      if (!isConnectorLoading) onReauth?.(account);
    }}
    disabled={isConnectorLoading}
  >
    {#if isConnectorLoading}
      <Loader2Icon class="w-3.5 h-3.5 animate-spin" />
    {:else}
      <AlertTriangleIcon class="w-3.5 h-3.5" />
    {/if}
    Reconnect
  </button>
{/snippet}

<div
  class="group flex items-center gap-3 py-2.5 px-1 rounded-lg {account.syncError
    ? 'bg-red-50'
    : ''}"
>
  <div
    class="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
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
    {#if account.isSyncing}
      <div
        class="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg"
      >
        <Loader2Icon class="w-4 h-4 text-gray-500 animate-spin" />
      </div>
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
  {#if account.syncError}
    {@render syncErrorReconnect()}
  {:else}
    <div class="flex-shrink-0 text-sm font-medium text-gray-900">
      {displayBalance}
    </div>
  {/if}
</div>
