<script lang="ts">
  import InstitutionSearch from "./InstitutionSearch.svelte";
  import type {
    InstitutionType,
    SyncProvider,
    SearchInstitutionsResponse,
  } from "$lib/types/institution";

  // === PROPS ===
  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onProviderSelect?: (
      institution: InstitutionType,
      provider: SyncProvider,
    ) => void;
    connectedInstitutionIds?: Set<string>;
  }

  let {
    isOpen = $bindable(false),
    onClose = () => {},
    onProviderSelect = () => {},
    connectedInstitutionIds = new Set<string>(),
  }: Props = $props();

  // === STATE ===
  let searchQuery = $state("");
  let institutions = $state<InstitutionType[]>([]);
  let isSearching = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  let countryCache: string | null = null;

  // === EFFECTS ===
  $effect(() => {
    if (isOpen && !searchQuery.trim()) {
      loadTopInstitutions();
    }
  });

  // === API FUNCTIONS ===

  function getApiBaseUrl(): string {
    return "/api";
  }

  async function getCurrentCountry(): Promise<string> {
    if (countryCache) return countryCache;
    // Default to US; container can be enhanced with geolocation later
    countryCache = "US";
    return countryCache;
  }

  async function searchInstitutionsAPI(
    query: string,
    limit: number = 20,
    provider: string = "all",
    accountType: string = "all",
  ): Promise<SearchInstitutionsResponse> {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      provider,
      accountType,
    });
    const response = await fetch(
      `${getApiBaseUrl()}/institutions/search?${params}`,
    );
    return response.json();
  }

  async function getTopInstitutionsAPI(
    country: string,
    limit: number = 20,
    accountType: string = "all",
  ): Promise<SearchInstitutionsResponse> {
    const params = new URLSearchParams({
      country,
      limit: String(limit),
      accountType,
    });
    const response = await fetch(
      `${getApiBaseUrl()}/institutions/top?${params}`,
    );
    return response.json();
  }

  async function loadTopInstitutions() {
    try {
      isSearching = true;
      const country = await getCurrentCountry();
      const response = await getTopInstitutionsAPI(
        country,
        20,
        "all",
      );
      institutions = response.institutions;
    } catch {
      institutions = [];
    } finally {
      isSearching = false;
    }
  }

  // === HANDLERS ===

  function handleSearchInput(query: string) {
    searchQuery = query;

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query.trim()) {
      loadTopInstitutions();
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        isSearching = true;
        const response = await searchInstitutionsAPI(
          query.trim(),
          20,
          "all",
          "all",
        );
        institutions = response.institutions;
      } catch {
        institutions = [];
      } finally {
        isSearching = false;
      }
    }, 300);
  }

  function handleInstitutionSelect(institution: InstitutionType) {
    // Single provider - determine which and fire onProviderSelect
    if (institution.plaidData) {
      onProviderSelect(institution, "plaid");
    } else if (institution.mxData) {
      onProviderSelect(institution, "mx");
    }
  }

  function handleClose() {
    searchQuery = "";
    institutions = [];
    isOpen = false;
    onClose();
  }
</script>

<InstitutionSearch
  bind:isOpen
  {institutions}
  {isSearching}
  {searchQuery}
  {connectedInstitutionIds}
  onSearchInput={handleSearchInput}
  onInstitutionSelect={handleInstitutionSelect}
  onProviderSelect={onProviderSelect}
  onClose={handleClose}
/>
