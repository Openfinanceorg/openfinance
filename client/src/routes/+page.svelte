<script lang="ts">
  import { AccountList } from "$lib/accounts";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import ProfileDropdown from "$lib/components/ProfileDropdown.svelte";
  import { fetchAccounts } from "$lib/sync/api";
  import InstitutionSearchContainer from "$lib/sync/InstitutionSearchContainer.svelte";
  import PlaidLink from "$lib/sync/PlaidLink.svelte";
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
  let selectedInstitutionId = $state<string | undefined>();

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
      selectedInstitutionId = institution.plaidData?.institutionId;
      plaidLink.initiatePlaidLink(selectedInstitutionId);
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

<SyncBanner />

<InstitutionSearchContainer
  bind:isOpen={searchOpen}
  onProviderSelect={handleProviderSelect}
/>

{#if !$session.data}
  <main class="flex min-h-screen items-center justify-center">
    <p class="text-gray-500">Loading...</p>
  </main>
{:else}
  <main class="min-h-screen bg-white">
    <!-- Header -->
    <header
      class="flex items-center justify-between px-8 py-6 max-w-3xl mx-auto"
    >
      <span class="text-sm font-semibold tracking-tight text-gray-800"
        >OpenFinance</span
      >
      <ProfileDropdown />
    </header>

    <!-- Content -->
    <div class="max-w-3xl mx-auto px-8 pt-8">
      {#if loading}
        <div class="text-center py-20">
          <p class="text-gray-500 text-sm">Loading accounts...</p>
        </div>
      {:else if accounts.length === 0}
        <!-- Empty state -->
        <div class="text-center py-20">
          <p class="text-gray-900 text-xl font-medium mb-2">
            No accounts connected
          </p>
          <p class="text-gray-500 text-sm mb-8">
            Connect your bank account to get started.
          </p>
          <Button onclick={() => (searchOpen = true)}>
            <Plus class="h-4 w-4" />
            Connect bank account
          </Button>
        </div>
      {:else}
        <!-- Accounts list -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-sm font-medium text-gray-500">Accounts</h2>
          <Button
            variant="linkBlue"
            size="link"
            onclick={() => (searchOpen = true)}
          >
            <Plus class="h-3.5 w-3.5" />
            add account
          </Button>
        </div>

        <AccountList {accounts} />
      {/if}
    </div>
  </main>
{/if}
