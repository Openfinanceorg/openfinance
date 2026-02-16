<script lang="ts">
  import { AccountList } from "$lib/accounts";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import ProfileDropdown from "$lib/components/ProfileDropdown.svelte";
  import { createApiKey, fetchAccounts } from "$lib/sync/api";
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
  let generatingKey = $state(false);
  let revealedKey = $state<string | null>(null);
  let keyError = $state<string | null>(null);
  let keyCopied = $state(false);

  const MCP_PACKAGE_NAME = "@openfinance/mcp-server";
  const MCP_BIN_NAME = "openfinance-mcp";
  const DEFAULT_OPENFINANCE_URL = "http://localhost:3000";

  const mcpInstallCommand = `npx -y ${MCP_PACKAGE_NAME}`;

  const mcpConfigSnippet = $derived(
    JSON.stringify(
      {
        mcpServers: {
          openfinance: {
            command: "npx",
            args: ["-y", MCP_PACKAGE_NAME],
            env: {
              OPENFINANCE_API_KEY: revealedKey ?? "sk-...",
              OPENFINANCE_URL: DEFAULT_OPENFINANCE_URL,
            },
          },
        },
      },
      null,
      2,
    ),
  );

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

  async function handleCreateKey() {
    generatingKey = true;
    keyError = null;
    keyCopied = false;
    try {
      const created = await createApiKey("Claude Desktop");
      revealedKey = created.key;
    } catch {
      keyError = "Failed to generate key. Please try again.";
    } finally {
      generatingKey = false;
    }
  }

  async function handleCopyKey() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    keyCopied = true;
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

      <section class="mt-14 p-2">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 class="text-sm font-medium text-gray-500">
              Connect accounts to your AI
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              Generate a key, then paste this into
              <code class="text-xs">claude_desktop_config.json</code>.
            </p>
          </div>
          <Button onclick={handleCreateKey} disabled={generatingKey}>
            {generatingKey ? "Generating..." : "New key"}
          </Button>
        </div>

        <p class="text-xs text-gray-500 mb-4">
          Uses <code>{MCP_PACKAGE_NAME}</code> / <code>{MCP_BIN_NAME}</code>.
        </p>

        <pre
          class="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all"><code
            >{mcpConfigSnippet}</code
          ></pre>

        {#if revealedKey}
          <div class="mt-4 bg-amber-50 rounded-lg p-4">
            <p class="text-xs text-amber-900">Save this key now.</p>
            <div class="mt-2 flex items-center gap-2">
              <code
                class="text-xs text-amber-950 bg-white rounded px-2 py-1 break-all"
                >{revealedKey}</code
              >
              <Button variant="secondary" size="sm" onclick={handleCopyKey}
                >{keyCopied ? "Copied" : "Copy"}</Button
              >
            </div>
          </div>
        {/if}

        {#if keyError}
          <p class="mt-4 text-sm text-red-600">{keyError}</p>
        {/if}
      </section>
    </div>
  </main>
{/if}
