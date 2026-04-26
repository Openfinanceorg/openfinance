<script lang="ts">
  import { setMode, resetMode, userPrefersMode } from "mode-watcher";
</script>

<div
  class="inline-flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] p-1"
>
  <button
    type="button"
    onclick={() => setMode('dark')}
    class="flex h-7 w-7 items-center justify-center rounded-full transition-colors
      {userPrefersMode.current === 'dark'
        ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
        : 'text-[var(--text-muted)] hover:text-[var(--text)]'}"
    aria-label="Dark theme"
  >
    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  </button>

  <button
    type="button"
    onclick={() => setMode('light')}
    class="flex h-7 w-7 items-center justify-center rounded-full transition-colors
      {userPrefersMode.current === 'light'
        ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
        : 'text-[var(--text-muted)] hover:text-[var(--text)]'}"
    aria-label="Light theme"
  >
    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  </button>

  <button
    type="button"
    onclick={() => resetMode()}
    class="flex h-7 items-center justify-center rounded-full px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors
      {userPrefersMode.current === 'system'
        ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
        : 'text-[var(--text-muted)] hover:text-[var(--text)]'}"
    aria-label="System theme"
  >
    System
  </button>
</div>
