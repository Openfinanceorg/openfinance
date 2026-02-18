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
  import * as Tabs from "$lib/components/ui/tabs";
  import { Plus, Download, Copy, Terminal } from "lucide-svelte";
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
  let codexCopied = $state(false);

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

  const codexCommand = `codex mcp add openfinance -e OPENFINANCE_API_KEY=sk-... -e OPENFINANCE_URL=${DEFAULT_OPENFINANCE_URL} -- npx -y ${MCP_PACKAGE_NAME}`;

  async function handleCopyCodex() {
    await navigator.clipboard.writeText(codexCommand);
    codexCopied = true;
    setTimeout(() => (codexCopied = false), 2000);
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
              Generate a key, then install the MCP server in Claude or Codex.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onclick={handleCreateKey}
            disabled={generatingKey}
          >
            {generatingKey ? "Generating..." : "New key"}
          </Button>
        </div>

        {#if revealedKey}
          <div class="mb-4 bg-amber-50 rounded-lg p-4">
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
          <p class="mb-4 text-sm text-red-600">{keyError}</p>
        {/if}

        <Tabs.Root value="claude">
          <Tabs.List class="flex gap-1 border-b border-gray-200 mb-4">
            <Tabs.Trigger
              value="claude"
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:text-gray-900 data-[state=active]:border-gray-900 transition-colors cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
                ><path
                  d="M17.308 6.062a2.091 2.091 0 0 0-2.107.346L12 9.196l-3.2-2.788a2.091 2.091 0 0 0-2.108-.346 2.07 2.07 0 0 0-1.283 1.907v7.415c0 .838.502 1.593 1.283 1.908a2.091 2.091 0 0 0 2.107-.346L12 14.158l3.2 2.788a2.091 2.091 0 0 0 2.108.346 2.07 2.07 0 0 0 1.283-1.908V7.97a2.07 2.07 0 0 0-1.283-1.908"
                /></svg
              >
              Claude
            </Tabs.Trigger>
            <Tabs.Trigger
              value="codex"
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:text-gray-900 data-[state=active]:border-gray-900 transition-colors cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
                ><path
                  d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073M13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.602 1.5v2.999l-2.602 1.5-2.602-1.5z"
                /></svg
              >
              Codex
            </Tabs.Trigger>
            <Tabs.Trigger
              value="other"
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:text-gray-900 data-[state=active]:border-gray-900 transition-colors cursor-pointer"
            >
              <Terminal class="h-4 w-4" />
              Other
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content
            value="claude"
            class="rounded-lg border border-gray-200 p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-700">Claude Desktop</h3>
              <a
                href="/api/mcp-bundle"
                download="openfinance.mcpb"
                class="inline-flex items-center gap-1.5 rounded-md bg-[#E87B35] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D16A2A] transition-colors"
              >
                <Download class="h-3.5 w-3.5" />
                Add to Claude
              </a>
            </div>
            <p class="text-xs text-gray-500">
              Downloads an <code>.mcpb</code> bundle. Double-click to install. You'll
              be prompted for your API key during setup.
            </p>
          </Tabs.Content>

          <Tabs.Content
            value="codex"
            class="rounded-lg border border-gray-200 p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-700">Codex</h3>
              <Button variant="secondary" size="sm" onclick={handleCopyCodex}>
                <Copy class="h-3.5 w-3.5 mr-1" />
                {codexCopied ? "Copied" : "Copy command"}
              </Button>
            </div>
            <pre
              class="text-xs bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"><code
                >{codexCommand}</code
              ></pre>
            <p class="text-xs text-gray-500 mt-2">
              Replace <code>sk-...</code> with your API key.
            </p>
          </Tabs.Content>

          <Tabs.Content
            value="other"
            class="rounded-lg border border-gray-200 p-4"
          >
            <h3 class="text-sm font-medium text-gray-700 mb-2">
              Manual config
            </h3>
            <p class="text-xs text-gray-500 mb-2">
              Paste into <code>claude_desktop_config.json</code>. Uses
              <code>{MCP_PACKAGE_NAME}</code>.
            </p>
            <pre
              class="text-xs bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"><code
                >{mcpConfigSnippet}</code
              ></pre>
          </Tabs.Content>
        </Tabs.Root>
      </section>
    </div>
  </main>
{/if}
