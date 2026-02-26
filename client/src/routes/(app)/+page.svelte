<script lang="ts">
  import { AccountCarousel } from "$lib/accounts";
  import EmptyAccountsState from "$lib/accounts/EmptyAccountsState.svelte";
  import { Button } from "$lib/components/ui/button";
  import { dismissOnboarding } from "$lib/accounts/api";
  import { accountsState, refreshAccountsState } from "$lib/accounts/state";

  import RecentTransactions from "$lib/transactions/RecentTransactions.svelte";
  import { getLinkContext } from "$lib/sync/link-context";
  import GettingStarted from "$lib/components/GettingStarted.svelte";
  import Tasks from "$lib/tasks/Tasks.svelte";
  import { fetchTasks, type Task } from "$lib/tasks/api";
  import { Plus } from "lucide-svelte";
  import { authClient } from "$lib/auth-client";
  import { goto } from "$app/navigation";

  const session = authClient.useSession();
  const { openSearch, onAccountLinked, triggerReauth } = getLinkContext();

  let tasks = $state<Task[]>([]);
  let tasksLoading = $state(true);

  $effect(() => {
    if ($session.data) {
      fetchTasks()
        .then((data) => (tasks = data))
        .catch(() => (tasks = []))
        .finally(() => (tasksLoading = false));
    }
  });

  $effect(() => {
    onAccountLinked(() => refreshAccountsState());
  });

  let accounts = $derived($accountsState?.accounts ?? []);
  let onboarding = $derived(
    $accountsState?.onboarding ?? {
      accountConnected: false,
      mcpLinked: false,
      dismissed: false,
    },
  );

  let totalBalanceFormatted = $derived.by(() => {
    const totals: Record<string, number> = {};
    for (const a of accounts) {
      const cur = a.isoCurrencyCode ?? "USD";
      const balance = parseFloat(a.currentBalance ?? "0");
      const isLiability = a.type === "credit" || a.type === "loan";
      totals[cur] = (totals[cur] ?? 0) + (isLiability ? -balance : balance);
    }
    const [currency, amount] = Object.entries(totals).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? ["USD", 0];
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  });

  async function handleDismissOnboarding() {
    accountsState.update((s) =>
      s ? { ...s, onboarding: { ...s.onboarding, dismissed: true } } : s,
    );
    await dismissOnboarding();
  }

  function handleReconnect(accountId: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (account) triggerReauth(account);
  }

  function handleAccountClick(accountId: number) {
    goto(`/transactions?accountId=${accountId}`);
  }
</script>

<div class="max-w-4xl mx-auto px-8 pt-2 space-y-8">
  {#if $accountsState}
    {#if !onboarding.dismissed}
      <GettingStarted
        onConnectAccount={openSearch}
        accountConnected={onboarding.accountConnected}
        mcpLinked={onboarding.mcpLinked}
        onDismiss={handleDismissOnboarding}
      />
    {/if}

    {#if accounts.length === 0}
      <EmptyAccountsState />
    {:else}
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs text-gray-500">Total balance</p>
            <p class="text-2xl font-semibold text-gray-900">
              {totalBalanceFormatted}
            </p>
          </div>
          <Button variant="linkBlue" size="link" onclick={openSearch}>
            <Plus class="h-3.5 w-3.5" />
            add account
          </Button>
        </div>
        <AccountCarousel
          {accounts}
          onReauth={triggerReauth}
          onAccountClick={handleAccountClick}
        />
      </section>

      <Tasks {tasks} onReconnect={handleReconnect} />

      <RecentTransactions />
    {/if}
  {/if}
</div>
