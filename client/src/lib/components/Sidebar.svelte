<script lang="ts">
  import { page } from "$app/stores";
  import { navItems, isActive } from "./nav-items";
</script>

<nav class="w-48 pt-2 space-y-1.5">
  {#each navItems as item}
    {@const active = isActive($page.url.pathname, item.href)}
    <a
      href={item.href}
      class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-full transition-colors {active
        ? 'bg-[var(--bg-muted)] text-[var(--text)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]'}"
    >
      <item.icon class="h-5 w-5" />
      {item.label}
    </a>
  {/each}
</nav>
