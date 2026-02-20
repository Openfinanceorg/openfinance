<script lang="ts">
  import { AccountCarousel } from "$lib/accounts";
  import EmptyAccountsState from "$lib/accounts/EmptyAccountsState.svelte";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import { fetchAccounts } from "$lib/accounts/api";

  import RecentTransactions from "$lib/transactions/RecentTransactions.svelte";
  import InstitutionSearchContainer from "$lib/sync/InstitutionSearchContainer.svelte";
  import PlaidLink from "$lib/sync/PlaidLink.svelte";
  import MXLink from "$lib/sync/MXLink.svelte";
  import SyncBanner from "$lib/sync/SyncBanner.svelte";
  import { triggerPoll, setOnSyncComplete } from "$lib/sync/sync-status";
  import { Plus } from "lucide-svelte";
  import type {
    ConnectedAccount,
    InstitutionType,
    SyncProvider,
  } from "@openfinance/shared";

  const session = authClient.useSession();

  let accounts = $state<ConnectedAccount[]>([]);
  let loading = $state(true);
  let searchOpen = $state(false);
  let plaidLink: PlaidLink;
  let mxLink: MXLink;

  async function loadAccounts() {
    try {
      loading = true;
      const data = await fetchAccounts();
      accounts = data.accounts;
    } catch {
      accounts = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if ($session.data) {
      loadAccounts();
    }
  });

  $effect(() => {
    setOnSyncComplete((updatedAccounts) => {
      accounts = updatedAccounts;
    });
  });

  function handleProviderSelect(
    institution: InstitutionType,
    provider: SyncProvider,
  ) {
    searchOpen = false;
    if (provider === "plaid") {
      plaidLink.initiatePlaidLink(institution.plaidData?.institutionId);
    } else if (provider === "mx") {
      mxLink.initiateMXLink(institution.mxData?.institutionCode);
    }
  }

  let totalBalanceFormatted = $derived.by(() => {
    const totals: Record<string, number> = {};
    for (const a of accounts) {
      const cur = a.isoCurrencyCode ?? "USD";
      totals[cur] = (totals[cur] ?? 0) + parseFloat(a.currentBalance ?? "0");
    }
    const [currency, amount] = Object.entries(totals).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? ["USD", 0];
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  });

  function handleAccountLinked() {
    loadAccounts();
  }

  function handleSyncStarted() {
    triggerPoll();
  }
</script>

<PlaidLink
  bind:this={plaidLink}
  onAccountLinked={handleAccountLinked}
  onSyncStarted={handleSyncStarted}
/>

<MXLink
  bind:this={mxLink}
  onAccountLinked={handleAccountLinked}
  onSyncStarted={handleSyncStarted}
/>

<SyncBanner />

<InstitutionSearchContainer
  bind:isOpen={searchOpen}
  onProviderSelect={handleProviderSelect}
/>

<div class="max-w-4xl mx-auto px-8 pt-2 space-y-8">
  {#if !loading}
    {#if accounts.length === 0}
      <EmptyAccountsState />
    {:else}
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs text-gray-500">Total balance</p>
            <p class="text-2xl font-semibold text-gray-900">
              {totalBalanceFormatted}
            </p>
          </div>
          <Button
            variant="linkBlue"
            size="link"
            onclick={() => (searchOpen = true)}
          >
            <Plus class="h-3.5 w-3.5" />
            add account
          </Button>
        </div>
        <AccountCarousel {accounts} />
      </section>

      <RecentTransactions />
    {/if}
  {/if}
</div>
