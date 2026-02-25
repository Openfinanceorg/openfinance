<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import ProfileDropdown from "$lib/components/ProfileDropdown.svelte";
  import { authClient } from "$lib/auth-client";
  import PlaidLink from "$lib/sync/PlaidLink.svelte";
  import MXLink from "$lib/sync/MXLink.svelte";
  import SyncBanner from "$lib/sync/SyncBanner.svelte";
  import InstitutionSearchContainer from "$lib/sync/InstitutionSearchContainer.svelte";
  import UpgradeModal from "$lib/billing/UpgradeModal.svelte";
  import { checkCanConnect } from "$lib/billing/api";
  import { triggerPoll } from "$lib/sync/sync-status";
  import { setLinkContext } from "$lib/sync/link-context";
  import {
    billingState,
    loadBillingState,
    refreshBillingState,
  } from "$lib/billing-state";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { Badge } from "$lib/components/ui/badge";
  import type {
    ConnectedAccount,
    InstitutionType,
    SyncProvider,
    PlanType,
  } from "@openfinance/shared";

  let { children } = $props();

  const session = authClient.useSession();

  let searchOpen = $state(false);
  let plaidLink: PlaidLink;
  let mxLink: MXLink;

  let accountLinkedCallback: (() => void) | undefined;

  // Billing state
  let upgradeModalOpen = $state(false);
  let upgradeRequiredPlan = $state<Exclude<PlanType, "free">>("plus");
  let hasExistingSubscription = $state(false);

  // Load user state (billing/plan) once session is available
  $effect(() => {
    if ($session.data) {
      loadBillingState();
    }
  });

  // Handle checkout return from Stripe
  $effect(() => {
    const checkoutParam = page.url.searchParams.get("checkout");
    if (checkoutParam === "success") {
      toast.success(
        "Subscription activated! You can now connect more accounts.",
      );
      refreshBillingState();
    } else if (checkoutParam === "cancel") {
      toast("Checkout cancelled.");
    }
    if (checkoutParam) {
      const url = new URL(page.url);
      url.searchParams.delete("checkout");
      replaceState(url, {});
    }
  });

  function handleProviderSelect(
    institution: InstitutionType,
    provider: SyncProvider,
  ) {
    searchOpen = false;
    launchProvider(institution, provider);
  }

  function launchProvider(
    institution: InstitutionType,
    provider: SyncProvider,
  ) {
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
    openSearch: async () => {
      try {
        const result = await checkCanConnect();
        if (!result.allowed) {
          upgradeRequiredPlan = (result.requiredPlan ?? "plus") as Exclude<
            PlanType,
            "free"
          >;
          hasExistingSubscription = result.currentPlan !== "free";
          upgradeModalOpen = true;
          return;
        }
      } catch {
        // If billing check fails, let them through (server will enforce)
      }
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

  <UpgradeModal
    bind:isOpen={upgradeModalOpen}
    requiredPlan={upgradeRequiredPlan}
    {hasExistingSubscription}
    onClose={() => {}}
  />

  <InstitutionSearchContainer
    bind:isOpen={searchOpen}
    onProviderSelect={handleProviderSelect}
  />

  <div class="min-h-screen bg-white">
    <div class="max-w-6xl mx-auto px-8">
      <header class="flex items-center py-6">
        <div
          class="w-48 shrink-0 text-center inline-flex items-center justify-center"
        >
          <span class="text-base font-semibold tracking-tight text-gray-800"
            >OpenFinance</span
          >{#if $billingState && $billingState.planType !== "free"}<Badge
              variant="pill"
              class="ml-1.5">{$billingState.planType}</Badge
            >{/if}
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
