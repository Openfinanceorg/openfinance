<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import ProfileDropdown from "$lib/components/ProfileDropdown.svelte";
  import { authClient } from "$lib/auth-client";
  import PlaidLink from "$lib/sync/PlaidLink.svelte";
  import MXLink from "$lib/sync/MXLink.svelte";
  import SyncBanner from "$lib/sync/SyncBanner.svelte";
  import InstitutionSearchContainer from "$lib/sync/InstitutionSearchContainer.svelte";
  import { triggerPoll } from "$lib/sync/sync-status";
  import { setLinkContext } from "$lib/sync/link-context";
  import type {
    ConnectedAccount,
    InstitutionType,
    SyncProvider,
  } from "@openfinance/shared";

  let { children } = $props();

  const session = authClient.useSession();

  let searchOpen = $state(false);
  let plaidLink: PlaidLink;
  let mxLink: MXLink;

  let accountLinkedCallback: (() => void) | undefined;

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
    accountLinkedCallback?.();
  }

  function handleSyncStarted() {
    triggerPoll();
  }

  function triggerReauth(account: ConnectedAccount) {
    if (account.provider === "mx") {
      mxLink.initiateReauthentication(account.id);
    } else if (account.provider === "plaid") {
      plaidLink.initiateReauthentication(account.id);
    }
  }

  setLinkContext({
    openSearch: () => {
      searchOpen = true;
    },
    triggerReauth,
    onAccountLinked: (cb: () => void) => {
      accountLinkedCallback = cb;
    },
  });
</script>

{#if $session.data}
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

  <div class="min-h-screen bg-white">
    <div class="max-w-6xl mx-auto px-8">
      <header class="flex items-center py-6">
        <div class="w-48 shrink-0 text-center">
          <span class="text-base font-semibold tracking-tight text-gray-800"
            >OpenFinance</span
          >
        </div>
        <div class="flex-1 flex justify-end">
          <ProfileDropdown />
        </div>
      </header>
      <div class="flex gap-12">
        <Sidebar />
        <main class="flex-1 min-w-0">
          {@render children()}
        </main>
      </div>
    </div>
  </div>
{/if}
