<script lang="ts">
  import { AccountList } from "$lib/accounts";
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

<div class="max-w-3xl mx-auto px-8 pt-8">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-sm font-medium text-gray-500">Accounts</h2>
    <Button variant="linkBlue" size="link" onclick={() => (searchOpen = true)}>
      <Plus class="h-3.5 w-3.5" />
      add account
    </Button>
  </div>

  {#if loading}
    <div class="text-center py-20">
      <p class="text-gray-500 text-sm">Loading accounts...</p>
    </div>
  {:else if accounts.length === 0}
    <div class="text-center py-10">
      <p class="text-gray-500 text-sm">No accounts connected yet.</p>
    </div>
  {:else}
    <AccountList {accounts} onDelete={loadAccounts} />
  {/if}
</div>
