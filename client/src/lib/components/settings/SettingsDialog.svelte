<script lang="ts">
  import { Dialog, DialogContent } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import Settings2 from "lucide-svelte/icons/settings-2";
  import CreditCard from "lucide-svelte/icons/credit-card";
  import X from "lucide-svelte/icons/x";
  import Link from "lucide-svelte/icons/link";
  import GeneralTab from "./GeneralTab.svelte";
  import BillingTab from "./BillingTab.svelte";
  import ConnectionsTab from "./ConnectionsTab.svelte";
  import { loadBillingState } from "$lib/billing/state";

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = $bindable(false) }: Props = $props();
  let activeTab = $state("general");

  function handleOpenChange(open: boolean) {
    if (!open) {
      isOpen = false;
    }
    if (open) {
      loadBillingState();
    }
  }

  const sections = [
    {
      label: "General",
      items: [{ id: "general", label: "General", icon: Settings2 }],
    },
    {
      label: "Data",
      items: [{ id: "connections", label: "Connections", icon: Link }],
    },
    {
      label: "Account",
      items: [{ id: "billing", label: "Plans and Billing", icon: CreditCard }],
    },
  ];
</script>

<Dialog bind:open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="sm:max-w-4xl p-0 gap-0 overflow-hidden max-h-[70vh]"
    showCloseButton={false}
    overlayClass="bg-black/20 backdrop-blur-sm"
  >
    <div class="flex flex-row h-[70vh]">
      <!-- Left Sidebar -->
      <div
        class="w-56 border-r border-[var(--border)] flex flex-col shrink-0 bg-[var(--bg-muted)]/50"
      >
        <div class="p-6 border-b border-[var(--border)]">
          <h2 class="text-lg font-semibold text-[var(--text)]">Settings</h2>
        </div>

        <div class="flex-1 p-4">
          {#each sections as section, i}
            <div class={i > 0 ? "mt-6" : ""}>
              <h3
                class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2"
              >
                {section.label}
              </h3>
              <div class="space-y-1">
                {#each section.items as item}
                  <button
                    class="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-sm font-medium transition-colors {activeTab ===
                    item.id
                      ? 'bg-[var(--bg-muted)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]'}"
                    onclick={() => (activeTab = item.id)}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Right Content -->
      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex justify-end p-4">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => (isOpen = false)}
            class="h-8 w-8 p-0 rounded-lg hover:bg-[var(--bg-muted)]"
          >
            <X size={18} />
          </Button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 pb-6">
          {#if activeTab === "general"}
            <GeneralTab />
          {:else if activeTab === "connections"}
            <ConnectionsTab />
          {:else if activeTab === "billing"}
            <BillingTab />
          {/if}
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
