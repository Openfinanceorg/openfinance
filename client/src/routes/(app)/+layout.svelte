<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import ProfileDropdown from "$lib/components/ProfileDropdown.svelte";
  import { authClient } from "$lib/auth-client";

  let { children } = $props();

  const session = authClient.useSession();
</script>

{#if $session.data}
  <div class="min-h-screen bg-white">
    <div class="max-w-6xl mx-auto px-8">
      <header class="flex items-center py-6">
        <div class="w-48 shrink-0 text-center">
          <span class="text-base font-semibold tracking-tight text-gray-800"
            >OpenFinance</span
          >
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
