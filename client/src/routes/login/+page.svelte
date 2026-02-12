<script lang="ts">
  import { authClient } from "$lib/auth-client";
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow">
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">Sign in</h1>
    <button
      class="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
      onclick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
    >
      Sign in with Google
    </button>
  </div>
</main>
