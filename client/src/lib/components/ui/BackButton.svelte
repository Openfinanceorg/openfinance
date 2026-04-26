<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";

  interface Props {
    href?: string;
    onclick?: () => void;
    position?: "absolute" | "relative";
    class?: string;
  }

  let {
    href = "/",
    onclick,
    position = "absolute",
    class: className = "",
  }: Props = $props();

  const positionClasses = $derived(
    position === "absolute" ? "absolute top-6 left-6 z-50" : "",
  );
</script>

<div class="{positionClasses} {className}">
  {#if onclick}
    <button
      type="button"
      {onclick}
      class="group inline-flex items-center justify-center p-3 hover:scale-110 transition-all duration-200 cursor-pointer"
    >
      <ArrowLeft
        size={24}
        class="text-[var(--text)] group-hover:translate-x-[-2px] transition-all duration-200"
      />
    </button>
  {:else}
    <a
      {href}
      class="group inline-flex items-center justify-center p-3 hover:scale-110 transition-all duration-200 cursor-pointer"
    >
      <ArrowLeft
        size={24}
        class="text-[var(--text)] group-hover:translate-x-[-2px] transition-all duration-200"
      />
    </a>
  {/if}
</div>
