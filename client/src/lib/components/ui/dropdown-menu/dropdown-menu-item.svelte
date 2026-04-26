<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = "default",
    ...restProps
  }: DropdownMenuPrimitive.ItemProps & {
    inset?: boolean;
    variant?: "default" | "destructive";
  } = $props();
</script>

<DropdownMenuPrimitive.Item
  bind:ref
  data-slot="dropdown-menu-item"
  data-inset={inset}
  data-variant={variant}
  class={cn(
    "data-highlighted:bg-[var(--bg-muted)] data-[variant=destructive]:text-red-600 dark:data-[variant=destructive]:text-red-400 data-[variant=destructive]:data-highlighted:bg-red-50 dark:data-[variant=destructive]:data-highlighted:bg-red-950/30 data-[variant=destructive]:*:[svg]:!text-red-600 dark:data-[variant=destructive]:*:[svg]:!text-red-400 [&_svg:not([class*='text-'])]:text-[var(--text-muted)] relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...restProps}
/>
