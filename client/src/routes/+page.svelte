<script lang="ts">
  import { authClient } from "$lib/auth-client";

  const session = authClient.useSession();
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="text-center">
    {#if $session.data}
      <h1 class="text-3xl font-bold text-gray-900">
        Welcome, {$session.data.user.name}
      </h1>
      <button
        class="mt-4 rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        onclick={() => authClient.signOut()}
      >
        Sign out
      </button>
    {:else}
      <p class="text-gray-500">Loading...</p>
    {/if}
  </div>
</main>
