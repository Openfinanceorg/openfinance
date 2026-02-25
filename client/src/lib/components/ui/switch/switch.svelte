<script lang="ts">
  import { Switch as SwitchPrimitive } from "bits-ui";
  import { cn } from "$lib/utils";

  interface Props {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    onCheckedChange,
    disabled = false,
    class: className,
  }: Props = $props();
</script>

<SwitchPrimitive.Root
  bind:checked
  {onCheckedChange}
  {disabled}
  class={cn(
    "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
    checked ? "bg-gray-900" : "bg-gray-200",
    className,
  )}
>
  <SwitchPrimitive.Thumb
    class={cn(
      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
      checked ? "translate-x-4" : "translate-x-0",
    )}
  />
</SwitchPrimitive.Root>
