<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { headerControlClass, SHELL_THEME_TABS } from '$lib/theme/workspace-page-constants';
  import type { ThemeMode } from '$lib/theme/schema';

  let {
    setShellTheme,
    shellMode
  }: {
    setShellTheme: (mode: ThemeMode) => void;
    shellMode: ThemeMode;
  } = $props();
</script>

<div
  class="shell-theme-switcher flex flex-wrap items-center gap-1 rounded-[var(--shell-radius-outer)] border border-[color:var(--shell-color-border-subtle)] bg-[color:var(--shell-color-shell)] p-1 shadow-[var(--shell-shadow)] backdrop-blur-xl"
  role="toolbar"
  aria-label="Shell theme"
>
  {#each SHELL_THEME_TABS as tab (tab.id)}
    <Button
      aria-label={`${tab.label} shell theme`}
      aria-pressed={shellMode === tab.id}
      class={`h-8 min-h-8 px-2.5 text-xs ${headerControlClass(shellMode === tab.id)}`}
      onclick={() => setShellTheme(tab.id)}
      variant="outline"
    >
      {tab.label}
    </Button>
  {/each}
</div>
