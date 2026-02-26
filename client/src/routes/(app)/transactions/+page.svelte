<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { fetchAccounts } from "$lib/accounts/api";
  import { getAccountLogoUrl } from "$lib/accounts/utils";
  import TransactionsList from "$lib/transactions/TransactionsList.svelte";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Search, ChevronDown } from "lucide-svelte";

  let searchText = $state("");
  let selectedAccountId = $state<number | undefined>(undefined);
  let accounts = $state<ConnectedAccount[]>([]);

  $effect(() => {
    fetchAccounts().then((data) => {
      accounts = data.accounts;
    });
  });

  let selectedAccount = $derived(
    selectedAccountId !== undefined
      ? (accounts.find((a) => a.id === selectedAccountId) ?? null)
      : null,
  );

  let selectedAccountLabel = $derived(
    selectedAccount ? selectedAccount.name : "All accounts",
  );
</script>

<div class="max-w-4xl mx-auto px-8 pt-2">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-base font-semibold text-gray-700">Transactions</h2>

    <div class="flex items-center gap-3">
      <div class="relative">
        <Search
          class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        />
        <Input
          type="text"
          placeholder="Search transactions..."
          bind:value={searchText}
          class="pl-9 w-56 h-8 text-sm"
        />
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-sm gap-1.5"
              {...props}
            >
              {#if selectedAccount}
                <span
                  class="w-5 h-5 rounded flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center"
                >
                  {#if getAccountLogoUrl(selectedAccount.institutionUrl, 32)}
                    <img
                      src={getAccountLogoUrl(
                        selectedAccount.institutionUrl,
                        32,
                      )!}
                      alt=""
                      class="w-full h-full object-contain"
                    />
                  {:else}
                    <span
                      class="text-gray-500 font-medium text-xs"
                      aria-hidden="true"
                    >
                      {selectedAccount.institutionName.charAt(0).toUpperCase()}
                    </span>
                  {/if}
                </span>
              {/if}
              <span>{selectedAccountLabel}</span>
              <ChevronDown class="ml-0.5 h-3.5 w-3.5 text-gray-400" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onclick={() => (selectedAccountId = undefined)}>
            All accounts
          </DropdownMenu.Item>
          {#if accounts.length > 0}
            <DropdownMenu.Separator />
            {#each accounts as account}
              <DropdownMenu.Item
                onclick={() => (selectedAccountId = account.id)}
                class="flex items-center gap-2"
              >
                <span
                  class="w-5 h-5 rounded flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center"
                >
                  {#if getAccountLogoUrl(account.institutionUrl, 32)}
                    <img
                      src={getAccountLogoUrl(account.institutionUrl, 32)!}
                      alt=""
                      class="w-full h-full object-contain"
                    />
                  {:else}
                    <span
                      class="text-gray-500 font-medium text-xs"
                      aria-hidden="true"
                    >
                      {account.institutionName.charAt(0).toUpperCase()}
                    </span>
                  {/if}
                </span>
                <span>{account.name}</span>
                {#if account.mask}
                  <span class="text-gray-400 ml-1">...{account.mask}</span>
                {/if}
              </DropdownMenu.Item>
            {/each}
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <TransactionsList
    {searchText}
    accountId={selectedAccountId}
    {accounts}
    onAccountClick={(id) => (selectedAccountId = id)}
  />
</div>
