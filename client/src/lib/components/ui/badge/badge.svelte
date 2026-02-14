<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const badgeVariants = tv({
    base: "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
    variants: {
      variant: {
        default: "bg-gray-900 text-white border-transparent dark:bg-gray-900 dark:border-current",
        secondary: "bg-gray-100 text-gray-700 border-transparent dark:bg-gray-800 dark:text-gray-300",
        destructive: "bg-red-500 border-transparent text-white",
        outline: "text-gray-900 dark:text-gray-100",
        blue: "bg-blue-100 text-blue-700 border-transparent dark:bg-gray-900 dark:text-blue-400 dark:border-blue-400",
        amber: "bg-amber-100 text-amber-700 border-transparent dark:bg-gray-900 dark:text-amber-400 dark:border-amber-400",
        green: "bg-green-100 text-green-700 border-transparent dark:bg-gray-900 dark:text-green-400 dark:border-green-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
</script>

<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    href,
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant;
  } = $props();
</script>

<svelte:element
  this={href ? "a" : "span"}
  bind:this={ref}
  data-slot="badge"
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>
