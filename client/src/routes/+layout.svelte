<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authClient } from "$lib/auth-client";

  let { children } = $props();

  const session = authClient.useSession();

  $effect(() => {
    if ($session.isPending) return;

    const isLoginPage = $page.url.pathname.startsWith("/login");

    if (!$session.data && !isLoginPage) {
      goto("/login");
    } else if ($session.data && isLoginPage) {
      goto("/");
    }
  });
</script>

{#if $session.isPending}
  <div class="flex min-h-screen items-center justify-center">
    <div
      class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"
    ></div>
  </div>
{:else}
  {@render children()}
{/if}
