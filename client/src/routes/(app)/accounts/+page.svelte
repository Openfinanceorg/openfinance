<script lang="ts">
  import { AccountList } from "$lib/accounts";
  import EmptyAccountsState from "$lib/accounts/EmptyAccountsState.svelte";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import { fetchAccounts } from "$lib/accounts/api";
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

<div class="max-w-4xl mx-auto px-8 pt-2">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-base font-semibold text-gray-700">Accounts</h2>
    <Button variant="linkBlue" size="link" onclick={() => (searchOpen = true)}>
      <Plus class="h-3.5 w-3.5" />
      add account
    </Button>
  </div>

  {#if !loading && accounts.length === 0}
    <EmptyAccountsState />
  {:else}
    <AccountList {accounts} onDelete={loadAccounts} />
  {/if}
</div>
