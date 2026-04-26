<script lang="ts">
  interface Props {
    logoUrl: string | null;
    name: string;
    variant?: "disabled" | "active";
  }

  let { logoUrl, name, variant = "active" }: Props = $props();

  const fallbackClasses = $derived(
    variant === "disabled"
      ? "bg-[var(--card)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]"
      : "bg-[var(--bg-muted)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]",
  );
  const hiddenFallbackClasses = $derived(
    variant === "disabled"
      ? "bg-[var(--card)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]"
      : "bg-[var(--bg-muted)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]",
  );
</script>

{#if logoUrl}
  <img
    src={logoUrl}
    alt={name}
    class="w-8 h-8 rounded-lg object-contain"
    onerror={(e) => {
      const target = e.currentTarget as HTMLImageElement;
      const fallback = target.nextElementSibling as HTMLElement;
      target.style.display = "none";
      if (fallback) fallback.style.display = "flex";
    }}
  />
  <div
    class="w-8 h-8 rounded-lg {hiddenFallbackClasses}"
    style="display: none;"
  >
    {name.charAt(0)}
  </div>
{:else}
  <div class="w-8 h-8 rounded-lg {fallbackClasses}">
    {name.charAt(0)}
  </div>
{/if}
