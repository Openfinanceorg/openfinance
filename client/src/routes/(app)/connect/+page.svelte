<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { getApiKey, resetApiKey, type ApiKey } from "$lib/sync/api";
  import * as Tabs from "$lib/components/ui/tabs";
  import {
    Download,
    Copy,
    Terminal,
    Eye,
    EyeOff,
    RefreshCw,
  } from "lucide-svelte";

  let existingKey = $state<ApiKey | null>(null);
  let fullKey = $state<string | null>(null);
  let keyRevealed = $state(false);
  let resetting = $state(false);
  let keyError = $state<string | null>(null);
  let keyCopied = $state(false);
  let codexCopied = $state(false);
  let keyLoaded = $state(false);

  const MCP_PACKAGE_NAME = "@openfinance/mcp-server";
  const DEFAULT_OPENFINANCE_URL = "http://localhost:3000";

  const mcpConfigSnippet = $derived(
    JSON.stringify(
      {
        mcpServers: {
          openfinance: {
            command: "npx",
            args: ["-y", MCP_PACKAGE_NAME],
            env: {
              OPENFINANCE_API_KEY: fullKey ?? "sk-...",
              OPENFINANCE_URL: DEFAULT_OPENFINANCE_URL,
            },
          },
        },
      },
      null,
      2,
    ),
  );

  const codexCommand = `codex mcp add openfinance -e OPENFINANCE_API_KEY=sk-... -e OPENFINANCE_URL=${DEFAULT_OPENFINANCE_URL} -- npx -y ${MCP_PACKAGE_NAME}`;

  // Load existing key on mount
  $effect(() => {
    loadKey();
  });

  async function loadKey() {
    try {
      const { key } = await getApiKey();
      existingKey = key;
    } catch {
      // ignore
    } finally {
      keyLoaded = true;
    }
  }

  const displayKey = $derived.by(() => {
    if (fullKey) {
      if (keyRevealed) return fullKey;
      return fullKey.slice(0, 5) + "..." + fullKey.slice(-6);
    }
    if (existingKey) {
      return existingKey.prefix + "...";
    }
    return null;
  });

  async function handleReset() {
    resetting = true;
    keyError = null;
    keyCopied = false;
    try {
      const created = await resetApiKey();
      fullKey = created.key;
      existingKey = {
        id: created.id,
        prefix: created.prefix,
        name: created.name,
        createdAt: created.createdAt,
        lastUsedAt: null,
      };
      keyRevealed = true;
    } catch {
      keyError = "Failed to reset key. Please try again.";
    } finally {
      resetting = false;
    }
  }

  async function handleCopyKey() {
    if (!fullKey) return;
    await navigator.clipboard.writeText(fullKey);
    keyCopied = true;
    setTimeout(() => (keyCopied = false), 2000);
  }

  async function handleCopyCodex() {
    await navigator.clipboard.writeText(codexCommand);
    codexCopied = true;
    setTimeout(() => (codexCopied = false), 2000);
  }
</script>

<div class="max-w-4xl mx-auto px-8 pt-8">
  <section class="p-2">
    <div class="mb-4">
      <h2 class="text-base font-semibold text-gray-700">
        Connect accounts to your AI
      </h2>
      <p class="text-sm text-gray-600 mt-1">
        Install the MCP server in Claude or Codex, then use your API key to
        connect.
      </p>
    </div>

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

      <Tabs.Content value="codex" class="rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-700">Codex</h3>
          <Button variant="secondary" size="sm" onclick={handleCopyCodex}>
            <Copy class="h-3.5 w-3.5 mr-1" />
            {codexCopied ? "Copied" : "Copy command"}
          </Button>
        </div>
        <pre
          class="text-xs text-gray-800 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"><code
            >{codexCommand}</code
          ></pre>
        <p class="text-xs text-gray-500 mt-2">
          Replace <code>sk-...</code> with your API key.
        </p>
      </Tabs.Content>

      <Tabs.Content value="other" class="rounded-lg border border-gray-200 p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">Manual config</h3>
        <p class="text-xs text-gray-500 mb-2">
          Paste into <code>claude_desktop_config.json</code>. Uses
          <code>{MCP_PACKAGE_NAME}</code>.
        </p>
        <pre
          class="text-xs text-gray-800 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"><code
            >{mcpConfigSnippet}</code
          ></pre>
      </Tabs.Content>
    </Tabs.Root>

    <!-- API Key Section -->
    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700">API Key</h3>
      <p class="text-xs text-gray-500 mt-1">
        Your API key for OpenFinance. Use this key to connect your AI tools.
      </p>

      {#if keyError}
        <p class="mt-3 text-sm text-red-600">{keyError}</p>
      {/if}

      {#if displayKey}
        <div class="mt-3 flex items-center gap-2">
          <div
            class="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <code class="flex-1 text-sm text-gray-800 break-all"
              >{displayKey}</code
            >
            {#if fullKey}
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600 transition-colors"
                onclick={() => (keyRevealed = !keyRevealed)}
              >
                {#if keyRevealed}
                  <EyeOff class="h-4 w-4" />
                {:else}
                  <Eye class="h-4 w-4" />
                {/if}
              </button>
            {/if}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!fullKey}
            onclick={handleCopyKey}
          >
            <Copy class="h-3.5 w-3.5 mr-1" />
            {keyCopied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onclick={handleReset}
          >
            <RefreshCw
              class="h-3.5 w-3.5 mr-1 {resetting ? 'animate-spin' : ''}"
            />
            Reset
          </Button>
        </div>
      {:else if keyLoaded}
        <div class="mt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onclick={handleReset}
          >
            <RefreshCw
              class="h-3.5 w-3.5 mr-1 {resetting ? 'animate-spin' : ''}"
            />
            Generate Key
          </Button>
        </div>
      {:else}
        <div class="mt-3">
          <p class="text-xs text-gray-400">Loading...</p>
        </div>
      {/if}
    </div>
  </section>
</div>
