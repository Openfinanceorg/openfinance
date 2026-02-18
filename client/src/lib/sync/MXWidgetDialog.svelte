<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import { X } from "lucide-svelte";

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    isLoading?: boolean;
    isPollingConnection?: boolean;
  }

  let {
    isOpen = $bindable(false),
    onClose = () => {},
    isLoading = false,
    isPollingConnection = false,
  }: Props = $props();

  function handleClose() {
    onClose();
    isOpen = false;
  }

  function handleOpenChange(open: boolean) {
    if (!open && isOpen) {
      handleClose();
    }
  }
</script>

<Dialog bind:open={isOpen} onOpenChange={handleOpenChange}>
  <DialogContent
    class="sm:max-w-md max-w-[80vw] h-auto max-h-[90vh] p-0 bg-white overflow-hidden"
    showCloseButton={false}
    interactOutsideBehavior="ignore"
  >
    <DialogTitle class="sr-only">Connect Your Bank Account</DialogTitle>

    <button
      onclick={handleClose}
      class="absolute right-4 top-4 z-20 rounded-sm opacity-70 transition-opacity hover:opacity-100"
      aria-label="Close dialog"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>

    <div
      id="mx-widget-container"
      class="w-full min-h-[500px] bg-white rounded-lg relative flex items-center justify-center pt-10 overflow-hidden"
      style="width: 100%;"
    >
      {#if isLoading || isPollingConnection}
        <div
          class="absolute inset-0 flex items-center justify-center bg-white z-10"
        >
          <div class="flex flex-col items-center justify-center gap-3">
            <div
              class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="text-sm text-gray-600">
              {isPollingConnection
                ? "Finishing connection..."
                : "Connecting..."}
            </p>
          </div>
        </div>
      {/if}
    </div>
  </DialogContent>
</Dialog>
