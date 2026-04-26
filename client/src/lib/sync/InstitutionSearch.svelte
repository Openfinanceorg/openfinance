<script lang="ts">
  import { Search, X, Lock, HelpCircle } from "lucide-svelte";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import BackButton from "$lib/components/ui/BackButton.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import InstitutionLogo from "$lib/components/InstitutionLogo.svelte";
  import ProviderLogo from "./ProviderLogo.svelte";
  import type { InstitutionType, SyncProvider } from "@openfinance/shared";
  import { extractBaseDomain } from "$lib/url";

  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as
    | string
    | undefined;

  const PROVIDER_LOGO_DOMAINS: Record<SyncProvider, string> = {
    plaid: "plaid.com",
    mx: "mx.com",
    quiltt: "mastercard.com",
  };

  function getProviderLogoUrl(provider: SyncProvider): string | null {
    if (!logoDevKey) return null;
    const domain = PROVIDER_LOGO_DOMAINS[provider];
    return `https://img.logo.dev/${domain}?token=${logoDevKey}&size=64&format=png`;
  }

  // Provider display name mapping
  const PROVIDER_DISPLAY_NAMES: Record<SyncProvider, string> = {
    plaid: "Plaid",
    mx: "MX",
    quiltt: "Quiltt",
  };

  // Connection health thresholds
  const PLAID_DISABLE_THRESHOLD = 0.8;
  const PLAID_WARNING_THRESHOLD = 0.95;

  // === PROPS ===
  interface Props {
    isOpen?: boolean;
    institutions: InstitutionType[];
    isSearching: boolean;
    searchQuery: string;
    connectedInstitutionIds: Set<string>;
    onSearchInput: (query: string) => void;
    onInstitutionSelect: (institution: InstitutionType) => void;
    onProviderSelect: (
      institution: InstitutionType,
      provider: SyncProvider,
    ) => void;
    onClose: () => void;
  }

  let {
    isOpen = $bindable(false),
    institutions,
    isSearching,
    searchQuery,
    connectedInstitutionIds,
    onSearchInput,
    onInstitutionSelect,
    onProviderSelect,
    onClose,
  }: Props = $props();

  // === LOCAL STATE ===
  let showProviderSelection = $state(false);
  let selectedInstitution = $state<InstitutionType | null>(null);

  // === HELPERS ===

  function isInstitutionConnected(institution: InstitutionType): boolean {
    if (institution.plaidData?.institutionId) {
      return connectedInstitutionIds.has(institution.plaidData.institutionId);
    }
    if (institution.mxData?.institutionCode) {
      return connectedInstitutionIds.has(institution.mxData.institutionCode);
    }
    if (institution.mastercardData?.institutionId) {
      return connectedInstitutionIds.has(
        institution.mastercardData.institutionId,
      );
    }
    return false;
  }

  function getProviderDisplayInfo(institution: InstitutionType) {
    const providers = institution.providers || [];
    const hasMultipleProviders = providers.length > 1;

    let providerNames: string[] = [];
    if (providers.length > 0) {
      providerNames = providers.map((p) => PROVIDER_DISPLAY_NAMES[p]);
    } else if (institution.plaidData) {
      providerNames = [PROVIDER_DISPLAY_NAMES.plaid];
    } else if (institution.mxData) {
      providerNames = [PROVIDER_DISPLAY_NAMES.mx];
    } else if (institution.mastercardData) {
      providerNames = [PROVIDER_DISPLAY_NAMES.quiltt];
    }

    let tooltipText = "";
    if (hasMultipleProviders) {
      tooltipText = `You can connect to ${institution.name} through more than one secure provider. You'll choose your preferred method on the next step.`;
    } else if (providerNames.length === 1) {
      tooltipText = `This bank connects securely using ${providerNames[0]}.`;
    }

    return { hasMultipleProviders, providerNames, tooltipText };
  }

  function getProviderStatus(institution: InstitutionType) {
    const plaidHealth = institution.plaidData?.connectionHealth;
    const loginSuccessRate = plaidHealth?.item_logins?.breakdown?.success ?? 1;
    const txnSuccessRate =
      plaidHealth?.transactions_updates?.breakdown?.success ?? 1;

    const loginDisabled = loginSuccessRate < PLAID_DISABLE_THRESHOLD;
    const txnDisabled = txnSuccessRate < PLAID_DISABLE_THRESHOLD;
    const plaidDisabled = loginDisabled || txnDisabled;

    const loginWarning =
      loginSuccessRate < PLAID_WARNING_THRESHOLD && !loginDisabled;
    const txnWarning = txnSuccessRate < PLAID_WARNING_THRESHOLD && !txnDisabled;
    const plaidHasWarning = loginWarning || txnWarning;

    let plaidIssueDescription = "";
    if (plaidDisabled) {
      plaidIssueDescription =
        "Some users experience connection issues. May be slower to connect.";
    } else if (plaidHasWarning) {
      plaidIssueDescription =
        "Generally reliable, but some issues have been reported.";
    }

    return {
      plaid: {
        available: !!institution.plaidData,
        hasIssues: plaidDisabled,
        hasWarning: plaidHasWarning || plaidDisabled,
        issueDescription: plaidIssueDescription,
        recommended: isProviderRecommended(
          "plaid",
          institution,
          plaidDisabled,
          plaidHasWarning,
        ),
      },
      mx: {
        available: !!institution.mxData,
        hasIssues: false,
        hasWarning: false,
        recommended: isProviderRecommended(
          "mx",
          institution,
          plaidDisabled,
          plaidHasWarning,
        ),
      },
      quiltt: {
        available: !!institution.mastercardData,
        hasIssues: false,
        hasWarning: false,
        recommended: isProviderRecommended(
          "quiltt",
          institution,
          plaidDisabled,
          plaidHasWarning,
        ),
      },
    };
  }

  function isProviderRecommended(
    provider: SyncProvider,
    institution: InstitutionType,
    plaidDisabled: boolean,
    plaidHasWarning: boolean,
  ): boolean {
    switch (provider) {
      case "plaid":
        return (
          (!!institution.plaidData && !plaidDisabled && !plaidHasWarning) ||
          (!!institution.plaidData && !institution.mxData)
        );
      case "mx":
        return (
          (!!institution.mxData && (plaidDisabled || plaidHasWarning)) ||
          (!!institution.mxData && !institution.plaidData)
        );
      case "quiltt":
        return (
          !!institution.mastercardData &&
          !institution.plaidData &&
          !institution.mxData
        );
    }
  }

  function getProviderList(institution: InstitutionType) {
    const status = getProviderStatus(institution);

    const providers = [
      {
        type: "plaid" as const,
        ...status.plaid,
        name: "Plaid",
        disabled: false,
        description:
          status.plaid.issueDescription ||
          "2 years of transaction history. Single authentication.",
      },
      {
        type: "mx" as const,
        ...status.mx,
        name: "MX",
        disabled: false,
        description: status.mx.recommended
          ? "Most stable connection available"
          : "Requires 2FA twice but very reliable",
      },
      {
        type: "quiltt" as const,
        ...status.quiltt,
        name: "Mastercard",
        disabled: false,
        description: "Powered by Quiltt",
      },
    ]
      .filter((p) => p.available)
      .sort((a, b) => {
        if (a.disabled && !b.disabled) return 1;
        if (!a.disabled && b.disabled) return -1;
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        if (!a.hasIssues && b.hasIssues) return -1;
        if (a.hasIssues && !b.hasIssues) return 1;
        return 0;
      });

    return providers;
  }

  // === ACTIONS ===

  function handleInstitutionClick(institution: InstitutionType) {
    if (institution.providers && institution.providers.length > 1) {
      selectedInstitution = institution;
      showProviderSelection = true;
    } else {
      onInstitutionSelect(institution);
    }
  }

  function handleProviderSelection(provider: SyncProvider) {
    if (selectedInstitution) {
      showProviderSelection = false;
      onProviderSelect(selectedInstitution, provider);
      selectedInstitution = null;
    }
  }

  function goBackToSearch() {
    showProviderSelection = false;
    selectedInstitution = null;
  }

  function handleSearchInputEvent(event: Event) {
    const target = event.target as HTMLInputElement;
    onSearchInput(target.value);
  }

  function clearSearch() {
    onSearchInput("");
  }

  function closeModal() {
    showProviderSelection = false;
    selectedInstitution = null;
    isOpen = false;
    onClose();
  }
</script>

<Dialog bind:open={isOpen} onOpenChange={closeModal}>
  <DialogContent class="sm:max-w-3xl max-w-full">
    <DialogHeader class="pb-4">
      <DialogTitle>
        {#if showProviderSelection}
          <div class="flex items-center gap-2">
            <BackButton onclick={goBackToSearch} position="relative" />
            Choose a provider
          </div>
        {:else}
          <span>Add Account</span>
        {/if}
      </DialogTitle>
    </DialogHeader>

    <div class="space-y-3">
      {#if showProviderSelection && selectedInstitution}
        <!-- Provider Selection View -->
        <div class="flex items-center gap-3 p-3 bg-[var(--bg-muted)] rounded-lg">
          <InstitutionLogo institution={selectedInstitution} size="lg" />
          <div>
            <div class="font-medium text-[var(--text)]">
              {selectedInstitution.name}
            </div>
            <div class="text-sm text-[var(--text-muted)]">Select how to connect</div>
          </div>
        </div>

        {@const providers = getProviderList(selectedInstitution)}

        <div class="space-y-3">
          {#each providers as provider}
            {#if provider.disabled}
              {@const logoUrl = getProviderLogoUrl(provider.type)}
              <div
                class="w-full flex items-center justify-between p-4 border rounded-lg border-[var(--border)] bg-[var(--bg-muted)] opacity-60 cursor-not-allowed"
              >
                <div class="flex items-center gap-3">
                  <ProviderLogo
                    {logoUrl}
                    name={provider.name}
                    variant="disabled"
                  />
                  <div class="text-left">
                    <div
                      class="font-medium text-[var(--text-muted)] flex items-center gap-2"
                    >
                      {provider.name}
                      <Badge variant="secondary">Unavailable</Badge>
                    </div>
                    <div class="text-sm text-[var(--text-muted)]">
                      {provider.description}
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              {@const logoUrl = getProviderLogoUrl(provider.type)}
              <button
                onclick={() => handleProviderSelection(provider.type)}
                class="w-full flex items-center justify-between p-4 border rounded-lg transition-colors group {provider.hasIssues
                  ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300'
                  : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg-muted)]'}"
              >
                <div class="flex items-center gap-3">
                  <ProviderLogo
                    {logoUrl}
                    name={provider.name}
                    variant="active"
                  />
                  <div class="text-left">
                    <div
                      class="font-medium text-[var(--text)] flex items-center gap-2"
                    >
                      {provider.name}
                      {#if provider.hasWarning}
                        <Badge variant="amber">
                          {provider.hasIssues
                            ? "Lower Success Rate"
                            : "Some Issues"}
                        </Badge>
                      {/if}
                    </div>
                    <div class="text-sm text-[var(--text-muted)]">
                      {provider.description}
                    </div>
                  </div>
                </div>
                {#if !provider.hasIssues}
                  <div class="text-[var(--text-muted)] group-hover:text-[var(--text-muted)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 12L10 8L6 4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                {/if}
              </button>
            {/if}
          {/each}
        </div>

        <div class="border-t border-[var(--border)] pt-4 mt-4 px-4 sm:px-8">
          <p
            class="text-xs text-[var(--text-muted)] text-center flex items-center justify-center gap-1"
          >
            <Lock size={12} class="inline" />
            We never store your banking credentials. All connections are read-only.
          </p>
        </div>
      {:else}
        <!-- Search View -->
        <!-- Search Input -->
        <div class="relative">
          <Search
            size={16}
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            placeholder="Search for your bank or financial institution..."
            value={searchQuery}
            oninput={handleSearchInputEvent}
            class="pl-10 pr-10"
          />
          {#if searchQuery}
            <button
              onclick={clearSearch}
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
              type="button"
            >
              <X size={16} />
            </button>
          {/if}
        </div>

        <!-- Content Area -->
        <div class="min-h-[280px] sm:min-h-[400px]">
          {#if isSearching && institutions.length === 0}
            <div class="flex items-center justify-center py-4">
              <div class="text-sm text-[var(--text-muted)]">Searching...</div>
            </div>
          {/if}

          {#if institutions.length > 0}
            <div class="max-h-80 sm:max-h-96 overflow-y-auto space-y-1 w-full">
              <TooltipProvider>
                {#each institutions as institution}
                  {@const isConnected = isInstitutionConnected(institution)}
                  {@const displayInfo = getProviderDisplayInfo(institution)}
                  <div
                    class="flex items-start gap-2 p-2 rounded-lg transition-colors w-full hover:bg-[var(--bg-muted)] cursor-pointer"
                    onclick={() => handleInstitutionClick(institution)}
                    role="button"
                    tabindex={0}
                    onkeydown={(e) =>
                      e.key === "Enter" && handleInstitutionClick(institution)}
                  >
                    <InstitutionLogo {institution} size="md" />

                    <div class="flex-1 min-w-0 overflow-hidden">
                      <div
                        class="text-sm font-medium text-[var(--text)] break-words leading-tight"
                      >
                        {institution.name}
                      </div>
                      {#if institution.url}
                        <div
                          class="text-xs text-[var(--text-muted)] truncate mt-1 max-w-full"
                        >
                          {extractBaseDomain(institution.url)}
                        </div>
                      {/if}
                    </div>

                    <div class="flex gap-1 flex-shrink-0 items-center">
                      {#if isConnected}
                        <span
                          class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium"
                        >
                          Connected
                        </span>
                      {:else if displayInfo.hasMultipleProviders}
                        <Tooltip>
                          <TooltipTrigger>
                            <span class="text-xs text-[var(--text-muted)]">
                              Multiple options
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            class="bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] shadow-md p-2"
                          >
                            <p class="max-w-xs text-xs">
                              {displayInfo.tooltipText}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      {:else if displayInfo.tooltipText}
                        <Tooltip>
                          <TooltipTrigger>
                            <div class="text-[var(--text-muted)] hover:text-[var(--text-muted)]">
                              <HelpCircle size={14} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            class="bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] shadow-md p-2"
                          >
                            <p class="max-w-xs text-xs">
                              {displayInfo.tooltipText}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      {/if}
                    </div>
                  </div>
                {/each}
              </TooltipProvider>
            </div>
          {:else if searchQuery.trim() && !isSearching}
            <div class="text-center py-4 text-sm text-[var(--text-muted)]">
              No available institutions found. Try a different search term.
            </div>
          {:else if !searchQuery.trim() && !isSearching && institutions.length === 0}
            <div class="text-center py-4 text-sm text-[var(--text-muted)]">
              Start typing to search for your bank or financial institution.
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </DialogContent>
</Dialog>
