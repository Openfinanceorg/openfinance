<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogHeader,
    DialogFooter,
    DialogDescription,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { changePlan, cancelSubscription } from "$lib/billing/api";
  import { refreshBillingState } from "$lib/billing-state";
  import { PLAN_LIMITS, PLAN_PRICES, type PlanType } from "@openfinance/shared";
  import type { ConnectedAccount } from "@openfinance/shared";
  import AlertTriangle from "lucide-svelte/icons/triangle-alert";

  interface Props {
    isOpen?: boolean;
    targetPlan: PlanType;
    currentPlan: PlanType;
    connections: ConnectedAccount[];
    onClose?: () => void;
    onComplete?: () => void;
  }

  let {
    isOpen = $bindable(false),
    targetPlan,
    currentPlan,
    connections,
    onClose = () => {},
    onComplete = () => {},
  }: Props = $props();

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const targetLimit = $derived(PLAN_LIMITS[targetPlan]);

  // Count unique connections (accounts are grouped by connectionId)
  const connectionCount = $derived(
    new Set(connections.map((a) => a.connectionId)).size,
  );
  const excessCount = $derived(Math.max(0, connectionCount - targetLimit));
  const hasExcessConnections = $derived(excessCount > 0);

  const targetPrice = $derived(
    targetPlan === "free" ? "Free" : `$${PLAN_PRICES[targetPlan]}/mo`,
  );

  function handleOpenChange(open: boolean) {
    if (!open) {
      isOpen = false;
      error = null;
      onClose();
    }
  }

  async function handleDowngrade() {
    isLoading = true;
    error = null;

    try {
      if (targetPlan === "free") {
        await cancelSubscription();
      } else {
        await changePlan(targetPlan as Exclude<PlanType, "free">);
      }
      await refreshBillingState();
      isOpen = false;
      onComplete();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to downgrade plan";
    } finally {
      isLoading = false;
    }
  }
</script>

<Dialog bind:open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md bg-white">
    <DialogHeader>
      <DialogTitle
        >Downgrade to {targetPlan.charAt(0).toUpperCase() +
          targetPlan.slice(1)}</DialogTitle
      >
      <DialogDescription>
        {targetPrice} &middot; {targetLimit} connection{targetLimit === 1
          ? ""
          : "s"}
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4 py-2">
      {#if hasExcessConnections}
        <div class="p-3">
          <div class="flex items-start gap-2">
            <AlertTriangle class="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div class="text-sm">
              <p class="text-amber-700">
                You have {connectionCount} connection{connectionCount === 1
                  ? ""
                  : "s"} but the {targetPlan} plan allows {targetLimit}. Please
                disconnect {excessCount} account{excessCount === 1 ? "" : "s"} before
                downgrading.
              </p>
            </div>
          </div>
        </div>
      {:else}
        <p class="text-sm text-gray-600">
          Your current connections fit within the {targetPlan} plan limit. No connections
          will be affected.
        </p>
      {/if}

      {#if currentPlan !== "free" && targetPlan !== "free"}
        <p class="text-xs text-gray-500">
          The plan change takes effect immediately and your billing will be
          adjusted.
        </p>
      {:else if targetPlan === "free"}
        <p class="text-xs text-gray-500">
          Your subscription will be cancelled at the end of your current billing
          period.
        </p>
      {/if}

      {#if error}
        <p class="text-sm text-red-600">{error}</p>
      {/if}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => (isOpen = false)}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button
        variant="default"
        onclick={handleDowngrade}
        disabled={isLoading || hasExcessConnections}
      >
        {isLoading
          ? "Downgrading..."
          : `Downgrade to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}`}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
