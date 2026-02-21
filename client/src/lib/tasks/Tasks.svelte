<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import AlertTriangle from "lucide-svelte/icons/triangle-alert";
  import type { Task } from "./api";

  interface Props {
    tasks: Task[];
    onReconnect: (accountId: number) => void;
  }

  let { tasks, onReconnect }: Props = $props();
</script>

{#if tasks.length > 0}
  <section>
    <h2 class="text-base font-semibold text-gray-700 mb-4">Tasks</h2>
    <div class="space-y-1">
      {#each tasks as task (task.id)}
        <div
          class="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <AlertTriangle class="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p class="text-sm font-medium text-gray-900">{task.title}</p>
              <p class="text-xs text-gray-500 mt-0.5">{task.description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onclick={() => onReconnect(task.accountId)}>Reconnect</Button
          >
        </div>
      {/each}
    </div>
  </section>
{/if}
