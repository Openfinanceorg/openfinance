<script lang="ts">
  import type { InstitutionType } from "@openfinance/shared";
  import { getAccountLogoUrl } from "$lib/accounts/utils";
  import { cn } from "$lib/utils";

  interface Props {
    /** Object mode: pass a full institution (for InstitutionSearch with base64/logoUrl) */
    institution?: InstitutionType;
    /** String mode: pass url + name (for accounts, transactions, notifications) */
    institutionUrl?: string | null;
    institutionName?: string;
    size?: "sm" | "md" | "lg";
    class?: string;
  }

  const SIZE_CONFIG = {
    sm: { container: "w-5 h-5 rounded", apiSize: 32, text: "text-xs" },
    md: { container: "w-8 h-8 rounded-lg", apiSize: 64, text: "text-xs" },
    lg: { container: "w-10 h-10 rounded-lg", apiSize: 64, text: "text-sm" },
  } as const;

  let {
    institution,
    institutionUrl,
    institutionName,
    size = "sm",
    class: className,
  }: Props = $props();

  const config = $derived(SIZE_CONFIG[size]);

  const name = $derived(institution?.name ?? institutionName ?? "?");

  // Object mode: base64 logo from Plaid
  const base64Src = $derived.by(() => {
    if (!institution?.logo) return null;
    const logo = institution.logo;
    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:")
    ) {
      return null;
    }
    return `data:image/png;base64,${logo}`;
  });

  // Object mode: logoUrl (e.g. MX medium logo)
  const objectLogoUrl = $derived(institution?.logoUrl ?? null);

  // String mode: logo.dev URL
  const logoDevUrl = $derived(
    !institution
      ? getAccountLogoUrl(institutionUrl ?? null, config.apiSize)
      : null,
  );

  // Final resolved image src: base64 → logoUrl → logo.dev
  const imgSrc = $derived(base64Src ?? objectLogoUrl ?? logoDevUrl);

  const primaryColor = $derived(institution?.primaryColor ?? null);
</script>

<span
  class={cn(
    "flex-shrink-0 overflow-hidden flex items-center justify-center",
    imgSrc ? "" : "bg-[var(--bg-muted)]",
    config.container,
    className,
  )}
  style={!imgSrc && primaryColor
    ? `background-color: ${primaryColor}`
    : undefined}
>
  {#if imgSrc}
    <img src={imgSrc} alt={name} class="w-full h-full object-contain" />
  {:else}
    <span
      class={cn(
        "font-medium",
        primaryColor ? "text-white" : "text-[var(--text-muted)]",
        config.text,
      )}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  {/if}
</span>
