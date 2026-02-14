<script lang="ts">
  import type { InstitutionType } from "@shared/types";

  interface Props {
    institution: InstitutionType;
    size?: "sm" | "md" | "lg";
    class?: string;
  }

  let { institution, size = "md", class: className = "" }: Props = $props();

  const sizeConfig = {
    sm: { container: "w-6 h-6", text: "text-xs" },
    md: { container: "w-8 h-8", text: "text-xs" },
    lg: { container: "w-10 h-10", text: "text-sm" },
  };

  const config = $derived(sizeConfig[size]);

  // Only use institution.logo if it's a base64 string (Plaid format)
  const logoSrc = $derived.by(() => {
    if (!institution.logo) return null;
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
</script>

{#if logoSrc}
  <img
    src={logoSrc}
    alt={institution.name}
    class="{config.container} rounded-lg object-cover flex-shrink-0 {className}"
  />
{:else if institution.logoUrl}
  <img
    src={institution.logoUrl}
    alt={institution.name}
    class="{config.container} rounded-lg object-cover flex-shrink-0 {className}"
  />
{:else}
  <div
    class="{config.container} rounded-lg flex items-center justify-center text-white {config.text} font-medium flex-shrink-0 {className}"
    style="background-color: {institution.primaryColor || '#6b7280'}"
  >
    {institution.name.charAt(0).toUpperCase()}
  </div>
{/if}
