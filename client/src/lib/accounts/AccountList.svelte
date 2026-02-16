<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { groupAccounts, formatSubtotal, isLiabilityGroup } from "./utils";
  import AccountRow from "./AccountRow.svelte";

  interface Props {
    accounts: ConnectedAccount[];
  }

  let { accounts }: Props = $props();

  const groups = $derived(groupAccounts(accounts));
</script>

<div class="space-y-6">
  {#each groups as group (group.key)}
    <section>
      <div class="flex items-center justify-between mb-1 px-1">
        <h3 class="text-xs font-medium text-gray-500">
          {group.label}
          <span class="text-gray-500 ml-1">{group.accounts.length}</span>
        </h3>
      </div>
      <div class="divide-y divide-gray-100">
        {#each group.accounts as account (account.id)}
          <AccountRow {account} groupKey={group.key} />
        {/each}
      </div>
    </section>
  {/each}
</div>
