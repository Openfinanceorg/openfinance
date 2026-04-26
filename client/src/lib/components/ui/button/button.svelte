<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const buttonVariants = tv({
    base: "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]",
        secondary:
          "bg-[var(--bg-muted)] text-[var(--text)] hover:bg-[var(--card)]",
        ghost:
          "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]",
        link: "text-[var(--text-muted)] underline-offset-4 hover:underline hover:text-[var(--text)]",
        linkBlue:
          "cursor-pointer text-[#007AFF] hover:text-[#0051D5] h-auto min-h-0 font-normal dark:text-[#0A84FF] dark:hover:text-[#409CFF]",
        outline:
          "border border-[var(--border)] text-[var(--text)] hover:border-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)]",
        outlineRed:
          "border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-muted)] text-outline-red shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05)]",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        link: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
  export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
</script>

<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cn, type WithElementRef } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    variant = "default",
    size = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLButtonAttributes> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  } = $props();
</script>

<button
  bind:this={ref}
  type="button"
  data-slot="button"
  class={cn(buttonVariants({ variant, size }), className)}
  {...restProps}
>
  {@render children?.()}
</button>
