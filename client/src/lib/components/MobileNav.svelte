<script lang="ts">
  import { page } from "$app/stores";
  import { navItems, isActive } from "./nav-items";
</script>

<nav
  class="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-[var(--border)] bg-[var(--bg-translucent)] backdrop-blur"
  style="padding-bottom: env(safe-area-inset-bottom);"
>
  {#each navItems as item}
    {@const active = isActive($page.url.pathname, item.href)}
    <a
      href={item.href}
      class="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium {active
        ? 'text-[var(--text)]'
        : 'text-[var(--text-muted)]'}"
    >
      <item.icon class="h-5 w-5" />
      {item.label}
    </a>
  {/each}
</nav>
