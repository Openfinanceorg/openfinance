<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Plus } from "lucide-svelte";

  let { onAddAccount }: { onAddAccount?: () => void } = $props();
</script>

<div class="flex flex-col items-center py-16 px-4">
  <!-- Stacked account cards illustration -->
  <svg
    width="120"
    height="90"
    viewBox="0 0 120 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="mb-6"
  >
    <!-- Back card -->
    <rect x="16" y="4" width="88" height="56" rx="8" fill="#E5E7EB" />
    <!-- Middle card -->
    <rect x="8" y="14" width="88" height="56" rx="8" fill="#D1D5DB" />
    <!-- Front card -->
    <rect x="0" y="24" width="88" height="56" rx="8" fill="#9CA3AF" />
    <!-- Card chip dots -->
    <circle cx="20" cy="44" r="3" fill="#D1D5DB" />
    <circle cx="30" cy="44" r="3" fill="#D1D5DB" />
    <circle cx="40" cy="44" r="3" fill="#D1D5DB" />
    <circle cx="50" cy="44" r="3" fill="#D1D5DB" />
    <!-- Card line -->
    <rect x="20" y="56" width="40" height="4" rx="2" fill="#D1D5DB" />
  </svg>

  <div class="max-w-xs">
    <p class="text-sm text-gray-500 mb-6">
      Connect your bank accounts to start tracking your finances. Your balances
      and transactions will appear here once linked.
    </p>
  </div>

  <Button variant="outline" onclick={onAddAccount}>
    <Plus class="h-4 w-4" />
    Add account
  </Button>
</div>
