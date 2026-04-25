<script lang="ts">
  import { toCssColor } from '$lib/theme/color';
  import { cn } from '$lib/utils.js';
  import type { OklchColor, ThemeMode } from '$lib/theme/schema';

  let {
    activeMode,
    altColor,
    darkColor,
    lightColor,
    setTheme,
    tokenLabel
  }: {
    activeMode: ThemeMode;
    altColor: OklchColor;
    darkColor: OklchColor;
    lightColor: OklchColor;
    setTheme: (mode: ThemeMode) => void;
    tokenLabel: string;
  } = $props();

  function modeButtonClass(mode: ThemeMode) {
    const on = activeMode === mode;
    return cn(
      'flex w-full min-w-0 flex-col items-stretch gap-2 rounded-[var(--shell-radius-outer)] px-2.5 py-2.5 text-left text-xs font-semibold tracking-[0.12em] text-[color:var(--shell-color-text-secondary)] uppercase transition-[box-shadow,background-color,border-color] outline-none',
      on
        ? 'border border-[color:var(--shell-color-control-active-border)] bg-[color:var(--shell-color-control-active)] text-[color:var(--shell-color-control-active-text)] shadow-[var(--shell-control-active-shadow)]'
        : 'border border-[color:var(--shell-color-border-subtle)] bg-[color:var(--shell-color-surface-subtle)] hover:border-[color:var(--shell-color-border-strong)] hover:bg-[color:var(--shell-color-control-hover)]'
    );
  }
</script>

<div
  class="pt-2 sm:pt-2.5"
  role="group"
  aria-label="Theme for this token editor: Light, Dark, or Alt"
>
  <div class="grid min-w-0 grid-cols-3 gap-2.5 sm:gap-3">
    <button
      type="button"
      class={cn(
        modeButtonClass('light'),
        'focus-visible:ring-2 focus-visible:ring-[color:var(--shell-color-focus-ring)]'
      )}
      aria-pressed={activeMode === 'light'}
      aria-label={`Preview ${tokenLabel} in light mode: ${toCssColor(lightColor)}`}
      onclick={() => setTheme('light')}
    >
      <span>Light</span>
      <span
        class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-[color:var(--shell-color-border-subtle)] shadow-[var(--shell-field-shadow)]"
        style={`background:${toCssColor(lightColor)}`}
        aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class={cn(
        modeButtonClass('dark'),
        'focus-visible:ring-2 focus-visible:ring-[color:var(--shell-color-focus-ring)]'
      )}
      aria-pressed={activeMode === 'dark'}
      aria-label={`Preview ${tokenLabel} in dark mode: ${toCssColor(darkColor)}`}
      onclick={() => setTheme('dark')}
    >
      <span>Dark</span>
      <span
        class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-[color:var(--shell-color-border-subtle)] shadow-[var(--shell-field-shadow)]"
        style={`background:${toCssColor(darkColor)}`}
        aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class={cn(
        modeButtonClass('alt'),
        'focus-visible:ring-2 focus-visible:ring-[color:var(--shell-color-focus-ring)]'
      )}
      aria-pressed={activeMode === 'alt'}
      aria-label={`Preview ${tokenLabel} in alt mode: ${toCssColor(altColor)}`}
      onclick={() => setTheme('alt')}
    >
      <span>Alt</span>
      <span
        class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-[color:var(--shell-color-border-subtle)] shadow-[var(--shell-field-shadow)]"
        style={`background:${toCssColor(altColor)}`}
        aria-hidden="true"
      ></span>
    </button>
  </div>
</div>
