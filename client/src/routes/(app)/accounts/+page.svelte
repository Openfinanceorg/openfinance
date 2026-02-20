<script lang="ts">
  import { AccountList } from "$lib/accounts";
  import EmptyAccountsState from "$lib/accounts/EmptyAccountsState.svelte";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import { fetchAccounts } from "$lib/accounts/api";
  import { setOnSyncComplete } from "$lib/sync/sync-status";
  import { getLinkContext } from "$lib/sync/link-context";
  import { Plus } from "lucide-svelte";
  import type { ConnectedAccount } from "@openfinance/shared";

  const session = authClient.useSession();
  const { openSearch, triggerReauth, onAccountLinked } = getLinkContext();

  let accounts = $state<ConnectedAccount[]>([]);
  let loading = $state(true);

  async function loadAccounts() {
    try {
      loading = true;
      const data = await fetchAccounts();
      accounts = data.accounts;
    } catch {
      accounts = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if ($session.data) {
      loadAccounts();
    }
  });

  $effect(() => {
    setOnSyncComplete((updatedAccounts) => {
      accounts = updatedAccounts;
    });
  });

  $effect(() => {
    onAccountLinked(loadAccounts);
  });
</script>

<div class="max-w-4xl mx-auto px-8 pt-2">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-base font-semibold text-gray-700">Accounts</h2>
    <Button variant="linkBlue" size="link" onclick={openSearch}>
      <Plus class="h-3.5 w-3.5" />
      add account
    </Button>
  </div>

  {#if !loading && accounts.length === 0}
    <EmptyAccountsState />
  {:else}
    <AccountList {accounts} onDelete={loadAccounts} onReauth={triggerReauth} />
  {/if}
</div>
