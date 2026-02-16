<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import { fetchAccounts } from "$lib/sync/api";
  import InstitutionSearchContainer from "$lib/sync/InstitutionSearchContainer.svelte";
  import PlaidLink from "$lib/sync/PlaidLink.svelte";
  import type {
    ConnectedAccount,
    InstitutionType,
    SyncProvider,
  } from "@shared/types";

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

<PlaidLink bind:this={plaidLink} onAccountLinked={handleAccountLinked} />

<InstitutionSearchContainer
  bind:isOpen={searchOpen}
  onProviderSelect={handleProviderSelect}
/>

{#if !$session.data}
  <main class="flex min-h-screen items-center justify-center">
    <p class="text-gray-400">Loading...</p>
  </main>
{:else}
  <main class="min-h-screen bg-white">
    <!-- Header -->
    <header
      class="flex items-center justify-between px-8 py-6 max-w-3xl mx-auto"
    >
      <h1 class="text-lg font-medium text-gray-900">
        {$session.data.user.name}
      </h1>
      <button
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        onclick={() => authClient.signOut()}
      >
        Sign out
      </button>
    </header>

    <!-- Content -->
    <div class="max-w-3xl mx-auto px-8 pt-8">
      {#if loading}
        <div class="text-center py-20">
          <p class="text-gray-400 text-sm">Loading accounts...</p>
        </div>
      {:else if accounts.length === 0}
        <!-- Empty state -->
        <div class="text-center py-20">
          <p class="text-gray-900 text-xl font-medium mb-2">
            No accounts connected
          </p>
          <p class="text-gray-400 text-sm mb-8">
            Connect your bank account to get started.
          </p>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            onclick={() => (searchOpen = true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            Connect bank account
          </button>
        </div>
      {:else}
        <!-- Accounts list -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Accounts
          </h2>
          <button
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            onclick={() => (searchOpen = true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            Add account
          </button>
        </div>

        <div class="space-y-3">
          {#each accounts as account (account.id)}
            <div
              class="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm text-gray-400 mb-1">
                    {account.institutionName}
                  </p>
                  <p class="text-base font-medium text-gray-900">
                    {account.name}
                    {#if account.mask}
                      <span class="text-gray-400 font-normal"
                        >····{account.mask}</span
                      >
                    {/if}
                  </p>
                  <p class="text-sm text-gray-400 mt-0.5">
                    {formatAccountType(account.type, account.subtype)}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-base font-medium text-gray-900">
                    {formatBalance(
                      account.currentBalance,
                      account.isoCurrencyCode,
                    )}
                  </p>
                  {#if account.availableBalance && account.availableBalance !== account.currentBalance}
                    <p class="text-sm text-gray-400 mt-0.5">
                      {formatBalance(
                        account.availableBalance,
                        account.isoCurrencyCode,
                      )} available
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </main>
{/if}
