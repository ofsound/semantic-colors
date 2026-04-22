<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Separator } from '$lib/components/ui/separator';
  import AnchorColorPicker from '$lib/components/semantic-colors/AnchorColorPicker.svelte';
  import NumberSliderField from '$lib/components/semantic-colors/NumberSliderField.svelte';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
  import { toCssColor } from '$lib/theme/color';
  import { cn } from '$lib/utils.js';
  import type { OklchColor, ThemeManifest, ThemeMode, TokenId } from '$lib/theme/schema';

  const ALT_BEHAVIOR_OPTIONS = [
    { value: 'derive', label: 'Derive' },
    { value: 'pin', label: 'Pin to source anchor' },
    { value: 'exclude', label: 'Exclude from Alt' }
  ] as const;

  let {
    manifest = $bindable(),
    selectedTokenId,
    activeMode,
    currentTokenAlt,
    onPersistChange,
    selectedTokenNotes,
    setTheme,
    tokenLabel
  }: {
    manifest: ThemeManifest;
    selectedTokenId: TokenId;
    activeMode: ThemeMode;
    currentTokenAlt: OklchColor;
    onPersistChange: () => void;
    selectedTokenNotes: string[];
    setTheme: (mode: ThemeMode) => void;
    tokenLabel: (tokenId: TokenId) => string;
  } = $props();

  const selectedToken = $derived(manifest.tokens[selectedTokenId]);

  function modeButtonClass(mode: ThemeMode) {
    const on = activeMode === mode;
    return cn(
      'flex w-full min-w-0 flex-col items-stretch gap-2 rounded-[var(--shell-radius-outer)] px-2.5 py-2.5 text-left text-xs font-semibold tracking-[0.12em] text-slate-800 uppercase transition-[box-shadow,background-color,border-color] outline-none',
      on
        ? 'border border-sky-500/40 bg-sky-500/12 text-slate-900 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]'
        : 'border border-[color:var(--shell-border)] bg-[color:var(--shell-subtle-panel-bg)] hover:border-slate-300/70 hover:bg-white/95'
    );
  }
</script>

<Card.Root
  class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
>
  <Card.Header class="gap-0 px-4">
    <div
      class="rounded-[var(--shell-radius-outer)] border border-[color:var(--shell-field-border-strong)] bg-[color:var(--shell-field-bg)] p-3 shadow-[var(--shell-field-shadow)]"
    >
      <div class="flex items-start justify-between gap-3">
        <Card.Title class="leading-snug">{selectedToken.label}</Card.Title>
        <span
          class="shrink-0 rounded-full bg-slate-900/8 px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize"
        >
          {selectedToken.group}
        </span>
      </div>
      <p class="mt-1 text-sm leading-snug text-slate-600">{selectedToken.description}</p>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4 px-4">
    <div
      class="pt-2 sm:pt-2.5"
      role="group"
      aria-label="Theme for this token editor: Light, Dark, or Alt"
    >
      <div class="grid min-w-0 grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          class={cn(modeButtonClass('light'), 'focus-visible:ring-2 focus-visible:ring-sky-500/35')}
          aria-pressed={activeMode === 'light'}
          aria-label={`Preview ${selectedToken.label} in light mode: ${toCssColor(selectedToken.light)}`}
          onclick={() => setTheme('light')}
        >
          <span>Light</span>
          <span
            class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-slate-900/8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={`background:${toCssColor(selectedToken.light)}`}
            aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class={cn(modeButtonClass('dark'), 'focus-visible:ring-2 focus-visible:ring-sky-500/35')}
          aria-pressed={activeMode === 'dark'}
          aria-label={`Preview ${selectedToken.label} in dark mode: ${toCssColor(selectedToken.dark)}`}
          onclick={() => setTheme('dark')}
        >
          <span>Dark</span>
          <span
            class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-slate-900/8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={`background:${toCssColor(selectedToken.dark)}`}
            aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class={cn(modeButtonClass('alt'), 'focus-visible:ring-2 focus-visible:ring-sky-500/35')}
          aria-pressed={activeMode === 'alt'}
          aria-label={`Preview ${selectedToken.label} in alt mode: ${toCssColor(currentTokenAlt)}`}
          onclick={() => setTheme('alt')}
        >
          <span>Alt</span>
          <span
            class="h-10 w-full rounded-[var(--shell-radius-inner)] border border-slate-900/8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            style={`background:${toCssColor(currentTokenAlt)}`}
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>

    {#if activeMode === 'light'}
      <section class="space-y-4 rounded-xl border border-sky-500/35 bg-sky-500/7 p-4">
        <div class="flex items-center justify-between gap-3">
          <strong class="text-sm font-semibold text-slate-900">Light anchor</strong>
        </div>
        <div class="flex flex-col gap-4">
          <AnchorColorPicker
            bind:color={selectedToken.light}
            label="Light anchor"
            {onPersistChange}
          />
          <div class="flex min-w-0 flex-col gap-3">
            <NumberSliderField
              bind:value={selectedToken.light.l}
              class="w-full"
              label="Lightness"
              max={1}
              min={0}
              onChange={onPersistChange}
              step={0.005}
            />
            <NumberSliderField
              bind:value={selectedToken.light.c}
              class="w-full"
              label="Chroma"
              max={0.37}
              min={0}
              onChange={onPersistChange}
              step={0.005}
            />
            <NumberSliderField
              bind:value={selectedToken.light.h}
              class="w-full"
              label="Hue"
              max={360}
              min={0}
              onChange={onPersistChange}
              step={1}
            />
          </div>
        </div>
      </section>
    {/if}

    {#if activeMode === 'dark'}
      <section class="space-y-4 rounded-xl border border-sky-500/35 bg-sky-500/7 p-4">
        <div class="flex items-center justify-between gap-3">
          <strong class="text-sm font-semibold text-slate-900">Dark anchor</strong>
        </div>
        <div class="flex flex-col gap-4">
          <AnchorColorPicker
            bind:color={selectedToken.dark}
            label="Dark anchor"
            {onPersistChange}
          />
          <div class="flex min-w-0 flex-col gap-3">
            <NumberSliderField
              bind:value={selectedToken.dark.l}
              class="w-full"
              label="Lightness"
              max={1}
              min={0}
              onChange={onPersistChange}
              step={0.005}
            />
            <NumberSliderField
              bind:value={selectedToken.dark.c}
              class="w-full"
              label="Chroma"
              max={0.37}
              min={0}
              onChange={onPersistChange}
              step={0.005}
            />
            <NumberSliderField
              bind:value={selectedToken.dark.h}
              class="w-full"
              label="Hue"
              max={360}
              min={0}
              onChange={onPersistChange}
              step={1}
            />
          </div>
        </div>
      </section>
    {/if}

    {#if activeMode === 'alt'}
      <section class="space-y-4 rounded-xl border border-sky-500/35 bg-sky-500/7 p-4">
        <div class="flex items-center justify-between gap-3">
          <strong class="text-sm font-semibold text-slate-900">Alt exception</strong>
        </div>
        <div class="flex flex-col gap-4">
          <div class="alt-anchor-top-row" aria-label="Alt color and exception controls">
            <div
              aria-label={`Alt derived color: ${toCssColor(currentTokenAlt)}`}
              class="alt-anchor-swatch"
              style={`background-color: ${toCssColor(currentTokenAlt)};`}
            ></div>
            <div class="alt-anchor-side flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-3">
              <label class="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                <span>Alt behavior</span>
                <ShellSelect
                  bind:value={selectedToken.exception.altBehavior}
                  options={ALT_BEHAVIOR_OPTIONS as unknown as { value: string; label: string }[]}
                  placeholder="Choose Alt behavior"
                  onChange={onPersistChange}
                />
              </label>
              <label class="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                <span>Max chroma</span>
                <Input
                  bind:value={selectedToken.exception.maxChroma}
                  max={0.37}
                  min={0}
                  oninput={onPersistChange}
                  step={0.005}
                  type="number"
                />
              </label>
            </div>
          </div>

          {#if selectedToken.altParent}
            <p class="text-sm text-slate-600">
              Alt derives from parent token: <strong>{tokenLabel(selectedToken.altParent)}</strong>
            </p>
          {/if}
        </div>
      </section>
    {/if}

    <Separator />

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <p class="eyebrow mb-0">Validation</p>
        {#if selectedTokenNotes.length > 0}
          <span
            class="rounded-full bg-red-500/14 px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.08em] text-red-700 uppercase"
          >
            {selectedTokenNotes.length} warning(s)
          </span>
        {/if}
      </div>
      {#if selectedTokenNotes.length === 0}
        <p class="text-sm font-medium text-emerald-700">
          No warnings for this token in {activeMode} mode.
        </p>
      {:else}
        <div class="grid gap-2">
          {#each selectedTokenNotes as note (note)}
            <p
              class="rounded-lg border border-red-500/15 bg-red-500/6 px-3 py-2 text-sm text-red-900"
            >
              {note}
            </p>
          {/each}
        </div>
      {/if}
    </section>
  </Card.Content>
</Card.Root>

<style>
  .alt-anchor-top-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.75rem;
    min-width: 0;
    min-height: clamp(7.5rem, 24vw, 10rem);
  }

  .alt-anchor-swatch {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    border-radius: var(--shell-radius-inner);
    border: 1px solid rgba(15, 23, 42, 0.12);
  }
</style>
