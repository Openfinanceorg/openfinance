<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";

  interface Props {
    account: ConnectedAccount;
  }

  let { account }: Props = $props();

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

  const shortName = $derived(() => {
    const sub = account.subtype || account.type;
    const label = sub.charAt(0).toUpperCase() + sub.slice(1).replace(/_/g, " ");
    return account.mask ? `${label} ····${account.mask}` : label;
  });
</script>

<div
  class="bg-gray-100 rounded-2xl p-5 w-[200px] flex flex-col justify-between h-[140px]"
>
  <div class="flex items-center gap-2.5">
    <div
      class="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0"
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
    <p class="text-sm font-medium text-gray-900 truncate">{account.name}</p>
  </div>
  <div>
    <p class="text-xs text-gray-400 mb-0.5">{shortName()}</p>
    <p class="text-base font-semibold text-gray-900">
      {formatBalance(account.currentBalance, account.isoCurrencyCode)}
    </p>
  </div>
</div>
