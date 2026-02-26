<script lang="ts">
  import { getAccountLogoUrl } from "./utils";
  import { cn } from "$lib/utils";

  interface Props {
    institutionUrl: string | null;
    institutionName: string;
    size?: "sm" | "md" | "lg";
    class?: string;
  }

  const SIZE_CONFIG = {
    sm: { container: "w-5 h-5 rounded", apiSize: 32, text: "text-xs" },
    md: { container: "w-8 h-8 rounded-lg", apiSize: 64, text: "text-sm" },
    lg: { container: "w-9 h-9 rounded-lg", apiSize: 64, text: "text-sm" },
  } as const;

  let {
    institutionUrl,
    institutionName,
    size = "sm",
    class: className,
  }: Props = $props();

  const config = $derived(SIZE_CONFIG[size]);
  const logoUrl = $derived(getAccountLogoUrl(institutionUrl, config.apiSize));
</script>

<span
  class={cn(
    "flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center",
    config.container,
    className,
  )}
>
  {#if logoUrl}
    <img
      src={logoUrl}
      alt={institutionName}
      class="w-full h-full object-contain"
    />
  {:else}
    <span
      class={cn("text-gray-500 font-medium", config.text)}
      aria-hidden="true"
    >
      {institutionName.charAt(0).toUpperCase()}
    </span>
  {/if}
</span>
