<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { deleteUserAccount } from "$lib/accounts/api";

  const session = authClient.useSession();

  let showDeleteDialog = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function handleDeleteAccount() {
    isDeleting = true;
    deleteError = null;
    try {
      await deleteUserAccount();
      await authClient.signOut();
      window.location.href = "/";
    } catch (err) {
      deleteError =
        err instanceof Error ? err.message : "Failed to delete account";
      isDeleting = false;
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h3 class="text-sm font-medium text-gray-900">Profile</h3>
    <div class="mt-3 space-y-4">
      <div>
        <p class="text-sm text-gray-500">Display name</p>
        <p class="mt-1 text-sm text-gray-900">
          {$session.data?.user?.name ?? "—"}
        </p>
      </div>
      <div>
        <p class="text-sm text-gray-500">Email</p>
        <p class="mt-1 text-sm text-gray-900">
          {$session.data?.user?.email ?? "—"}
        </p>
      </div>
    </div>
  </div>

  <div class="border-t border-gray-200 pt-6">
    <p class="mt-1 text-sm text-gray-500">
      Permanently delete your account and all associated user data.
    </p>
    <Button
      variant="outlineRed"
      class="mt-3"
      onclick={() => (showDeleteDialog = true)}
    >
      Delete account
    </Button>
  </div>
</div>

<Dialog bind:open={showDeleteDialog}>
  <DialogContent class="sm:max-w-md bg-white">
    <DialogHeader>
      <DialogTitle>Delete account</DialogTitle>
    </DialogHeader>

    <div class="py-4 text-sm text-gray-600 space-y-2">
      <p>Deleting your account will permanently remove:</p>
      <ul class="list-disc pl-5 space-y-1">
        <li>All connected financial accounts and transaction history</li>
        <li>API keys and MCP configurations</li>
        <li>Your subscription and billing information</li>
      </ul>
    </div>

    {#if deleteError}
      <p class="text-sm text-red-600">{deleteError}</p>
    {/if}

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => (showDeleteDialog = false)}
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button
        variant="outlineRed"
        onclick={handleDeleteAccount}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete account"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
