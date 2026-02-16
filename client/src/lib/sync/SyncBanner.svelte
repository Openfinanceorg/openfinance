<script lang="ts">
  import { LoaderCircle, Check, X } from "lucide-svelte";
  import { syncStatus, dismiss } from "./sync-status";
</script>

{#if $syncStatus.syncing}
  <div
    class="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50"
  >
    <LoaderCircle class="animate-spin h-4 w-4 text-gray-500" />
    <span class="text-sm text-gray-600">
      Syncing{$syncStatus.syncingInstitutions.length > 0
        ? ` ${$syncStatus.syncingInstitutions.join(", ")}`
        : ""}...
    </span>
  </div>
{:else if $syncStatus.completed}
  <div
    class="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50"
  >
    <Check class="h-4 w-4 text-green-500" />
    <span class="text-sm text-gray-600">Account sync completed</span>
    <button
      class="text-gray-400 hover:text-gray-600 ml-1"
      onclick={dismiss}
      aria-label="Dismiss"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
{/if}
