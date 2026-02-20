<script lang="ts">
  import type { ConnectedAccount } from "@openfinance/shared";
  import { formatBalance, isLiabilityGroup } from "./utils";
  import { deleteAccount } from "./api";
  import { toast } from "svelte-sonner";
  import { Trash2 } from "lucide-svelte";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";

  export interface Props {
    account: ConnectedAccount;
    groupKey: string;
    onDelete?: () => void;
    onReauth?: (account: ConnectedAccount) => void;
    isConnectorLoading?: boolean;
  }

  let {
    account,
    groupKey,
    onDelete = undefined,
    onReauth = undefined,
    isConnectorLoading = false,
  }: Props = $props();

  let dialogOpen = $state(false);
  let deleting = $state(false);

  const logoDevKey = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as
    | string
    | undefined;

  const logoUrl = $derived.by(() => {
    if (!logoDevKey || !account.institutionUrl) return null;
    try {
      const url = account.institutionUrl.startsWith("http")
        ? account.institutionUrl
        : `https://${account.institutionUrl}`;
      const domain = new URL(url).hostname;
      return `https://img.logo.dev/${domain}?token=${logoDevKey}&size=64&format=png`;
    } catch {
      return null;
    }
  });

  const isLiability = $derived(isLiabilityGroup(groupKey));

  const displayBalance = $derived.by(() => {
    if (!account.currentBalance) return "--";
    const num = parseFloat(account.currentBalance);
    const value = isLiability ? -Math.abs(num) : num;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: account.isoCurrencyCode || "USD",
    }).format(value);
  });

  async function handleDelete() {
    deleting = true;
    try {
      await deleteAccount(account.id);
      dialogOpen = false;
      toast.success(`${account.name} deleted`);
      onDelete?.();
    } catch (e) {
      toast.error("Failed to delete account");
    } finally {
      deleting = false;
    }
  }
</script>

{#snippet syncErrorReconnect()}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <button
          class="flex-shrink-0 p-1.5 rounded-md text-amber-600 hover:bg-amber-100 transition-colors"
          onclick={() => {
            if (!isConnectorLoading) onReauth?.(account);
          }}
          disabled={isConnectorLoading}
          aria-label="Reconnect account"
        >
          {#if isConnectorLoading}
            <Loader2Icon class="w-4 h-4 animate-spin" />
          {:else}
            <AlertTriangleIcon class="w-4 h-4" />
          {/if}
        </button>
      </TooltipTrigger>
      <TooltipContent>Account disconnected</TooltipContent>
    </Tooltip>
  </TooltipProvider>
{/snippet}

<div
  class="group flex items-center gap-3 py-2.5 px-1 rounded-lg {account.syncError
    ? 'border border-red-200 bg-red-50'
    : ''}"
>
  <div
    class="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
  >
    {#if logoUrl}
      <img
        src={logoUrl}
        alt={account.institutionName}
        class="w-full h-full object-contain"
      />
    {:else}
      <span class="text-gray-500 font-medium text-sm" aria-hidden="true">
        {account.institutionName.charAt(0).toUpperCase()}
      </span>
    {/if}
    {#if account.isSyncing}
      <div
        class="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg"
      >
        <Loader2Icon class="w-4 h-4 text-gray-500 animate-spin" />
      </div>
    {/if}
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 truncate">
      {account.name}
      {#if account.mask}
        <span class="text-gray-500 font-normal">····{account.mask}</span>
      {/if}
    </p>
    <p class="text-xs text-gray-500 truncate">{account.institutionName}</p>
  </div>
  <div class="flex-shrink-0 text-sm font-medium text-gray-900">
    {displayBalance}
  </div>
  {#if account.syncError}
    {@render syncErrorReconnect()}
  {/if}
  <button
    class="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
    onclick={() => (dialogOpen = true)}
    aria-label="Delete account"
  >
    <Trash2 class="w-4 h-4" />
  </button>
</div>

<Dialog bind:open={dialogOpen}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Account</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete {account.name}? This action cannot be
        undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="ghost"
        disabled={deleting}
        onclick={() => (dialogOpen = false)}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        class="border-red-300 text-red-600 hover:bg-red-50"
        onclick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Delete"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
