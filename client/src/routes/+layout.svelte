<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { authClient } from "$lib/auth-client";

  let { children } = $props();

  const session = authClient.useSession();

  $effect(() => {
    if (!$session.isPending && !$session.data && !$page.url.pathname.startsWith("/login")) {
      goto("/login");
    }
  });
</script>

{@render children()}
