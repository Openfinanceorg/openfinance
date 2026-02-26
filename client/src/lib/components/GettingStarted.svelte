<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import Circle from "lucide-svelte/icons/circle";
  import CircleCheck from "lucide-svelte/icons/circle-check";
  import X from "lucide-svelte/icons/x";

  interface Props {
    onConnectAccount: () => void;
    onDismiss: () => void;
    accountConnected?: boolean;
    mcpLinked?: boolean;
  }

  let {
    onConnectAccount,
    onDismiss,
    accountConnected = false,
    mcpLinked = false,
  }: Props = $props();
</script>

<section class="mb-8">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-base font-semibold text-gray-700">Getting Started</h2>
    <Button
      variant="ghost"
      size="icon"
      class="text-gray-400 hover:text-gray-600 -mr-1"
      onclick={onDismiss}
      aria-label="Dismiss getting started"
    >
      <X class="h-4 w-4" />
    </Button>
  </div>
  <div class="space-y-1">
    <div
      class="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-3">
        {#if accountConnected}
          <CircleCheck class="h-4 w-4 text-green-500 shrink-0" />
        {:else}
          <Circle class="h-4 w-4 text-gray-300 shrink-0" />
        {/if}
        <div>
          <p
            class="text-sm font-medium text-gray-900"
            class:line-through={accountConnected}
            class:text-gray-400={accountConnected}
          >
            Connect an account
          </p>
          <p class="text-xs text-gray-500 mt-0.5">
            Link a bank to start tracking your finances.
          </p>
        </div>
      </div>
      {#if !accountConnected}
        <Button variant="outline" size="sm" onclick={onConnectAccount}
          >Connect</Button
        >
      {/if}
    </div>

    <div
      class="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-3">
        {#if mcpLinked}
          <CircleCheck class="h-4 w-4 text-green-500 shrink-0" />
        {:else}
          <Circle class="h-4 w-4 text-gray-300 shrink-0" />
        {/if}
        <div>
          <p
            class="text-sm font-medium text-gray-900"
            class:line-through={mcpLinked}
            class:text-gray-400={mcpLinked}
          >
            Link to your MCP server
          </p>
          <p class="text-xs text-gray-500 mt-0.5">
            Connect your accounts to AI via MCP.
          </p>
        </div>
      </div>
      {#if !mcpLinked}
        <Button variant="outline" size="sm" onclick={() => goto("/connect")}>
          Set up
        </Button>
      {/if}
    </div>
  </div>
</section>
