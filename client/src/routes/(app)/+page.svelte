<script lang="ts">
  import { AccountCarousel } from "$lib/accounts";
  import EmptyAccountsState from "$lib/accounts/EmptyAccountsState.svelte";
  import { authClient } from "$lib/auth-client";
  import { Button } from "$lib/components/ui/button";
  import { fetchAccounts, dismissOnboarding } from "$lib/accounts/api";
  import type { OnboardingState } from "$lib/accounts/api";

  import RecentTransactions from "$lib/transactions/RecentTransactions.svelte";
  import { setOnSyncComplete } from "$lib/sync/sync-status";
  import { getLinkContext } from "$lib/sync/link-context";
  import GettingStarted from "$lib/components/GettingStarted.svelte";
  import Tasks from "$lib/tasks/Tasks.svelte";
  import { fetchTasks, type Task } from "$lib/tasks/api";
  import { Plus } from "lucide-svelte";
  import type { ConnectedAccount } from "@openfinance/shared";

  const session = authClient.useSession();
  const { openSearch, onAccountLinked, triggerReauth } = getLinkContext();

  let accounts = $state<ConnectedAccount[]>([]);
  let tasks = $state<Task[]>([]);
  let onboarding = $state<OnboardingState>({
    accountConnected: false,
    mcpLinked: false,
    dismissed: false,
  });
  let loading = $state(true);

  async function loadAccounts() {
    try {
      loading = true;
      const [data, taskData] = await Promise.all([
        fetchAccounts(),
        fetchTasks().catch(() => [] as Task[]),
      ]);
      accounts = data.accounts;
      onboarding = data.onboarding;
      tasks = taskData;
    } catch {
      accounts = [];
      tasks = [];
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
    onboarding = { ...onboarding, dismissed: true };
    await dismissOnboarding();
  }

  function handleReconnect(accountId: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (account) triggerReauth(account);
  }
</script>

<div class="max-w-4xl mx-auto px-8 pt-2 space-y-8">
  {#if !loading}
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
        <AccountCarousel {accounts} onReauth={triggerReauth} />
      </section>

      <Tasks {tasks} onReconnect={handleReconnect} />

      <RecentTransactions />
    {/if}
  {/if}
</div>
