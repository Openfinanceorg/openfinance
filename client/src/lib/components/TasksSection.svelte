<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Circle from "lucide-svelte/icons/circle";

  interface Props {
    onConnectAccount: () => void;
  }

  let { onConnectAccount }: Props = $props();
</script>

<section class="mb-8">
  <h2 class="text-base font-semibold text-gray-700 mb-4">Tasks</h2>
  <div class="space-y-1">
    <div
      class="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-3">
        <Circle class="h-4 w-4 text-gray-300 shrink-0" />
        <div>
          <p class="text-sm font-medium text-gray-900">Connect an account</p>
          <p class="text-xs text-gray-500 mt-0.5">
            Link a bank to start tracking your finances.
          </p>
        </div>
      </div>
      <Button size="sm" onclick={onConnectAccount}>Connect</Button>
    </div>

    <div
      class="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-3">
        <Circle class="h-4 w-4 text-gray-300 shrink-0" />
        <div>
          <p class="text-sm font-medium text-gray-900">
            Link to your MCP server
          </p>
          <p class="text-xs text-gray-500 mt-0.5">
            Connect your accounts to AI via MCP.
          </p>
        </div>
      </div>
      <a
        href="/connect"
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
        >Set up</a
      >
    </div>
  </div>
</section>
