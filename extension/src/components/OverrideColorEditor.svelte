<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
  import TokenColorAnchorSection from '$lib/components/semantic-colors/TokenColorAnchorSection.svelte';
  import TokenModeSwatches from '$lib/components/semantic-colors/TokenModeSwatches.svelte';

  import type { ExtensionOverrideColorState } from './override-color-state.svelte';
  import type { ThemeMode } from '../shared/types';

  type SelectOption = {
    value: string;
    label: string;
  };

  const OVERRIDE_MODE_OPTIONS: SelectOption[] = [
    { value: 'both', label: 'Light & Dark' },
    { value: 'light', label: 'Light only' },
    { value: 'dark', label: 'Dark only' }
  ];

  let {
    override,
    onClearOverrides,
    onColorChange,
    onOverrideModeChange,
    onPersistChange,
    onPushOverride,
    onSetTheme,
    onTokenChange
  }: {
    override: ExtensionOverrideColorState;
    onClearOverrides: () => void;
    onColorChange: () => void;
    onOverrideModeChange: (mode: 'light' | 'dark' | 'both') => void;
    onPersistChange: (persist: boolean) => void;
    onPushOverride: () => void;
    onSetTheme: (mode: ThemeMode) => void;
    onTokenChange: (tokenId: string) => void;
  } = $props();

  const token = $derived(
    override.snapshot && override.tokenId
      ? override.snapshot.manifest.tokens[override.tokenId]
      : null
  );
  const tokenOptions = $derived<SelectOption[]>(
    override.snapshot
      ? Object.values(override.snapshot.manifest.tokens).map((option) => ({
          value: option.id,
          label: `${option.label} (${option.id})`
        }))
      : []
  );
  const altColor = $derived(
    override.snapshot && override.tokenId
      ? override.snapshot.resolved.alt.colors[override.tokenId]
      : null
  );
  const colorTitle = $derived(
    override.activeMode === 'alt'
      ? 'Alt override'
      : `${override.activeMode[0].toUpperCase()}${override.activeMode.slice(1)} override`
  );
  const colorLabel = $derived(token ? `${token.label} override` : 'Override color');
</script>

<div class="semantic-colors-app extension-authoring">
  {#if !override.snapshot || !token}
    <Card.Root
      class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Content class="px-4">
        <p class="empty-state">Connect to the engine to use overrides.</p>
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root
      class="mb-3 gap-3 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Header class="gap-0 px-4">
        <Card.Title>Focused override</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3 px-4">
        <label
          class="grid gap-2 text-sm font-medium text-[color:var(--shell-color-text-secondary)]"
        >
          <span>Token</span>
          <ShellSelect
            value={override.tokenId}
            options={tokenOptions}
            placeholder="Choose token"
            onChange={onTokenChange}
          />
        </label>
        <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button variant="outline" class="justify-center" onclick={onClearOverrides}>
            Clear all
          </Button>
          <label
            class="flex items-center gap-2 text-sm font-medium text-[color:var(--shell-color-text-secondary)]"
          >
            <Checkbox
              checked={override.persistOverride}
              onCheckedChange={(checked) => onPersistChange(checked === true)}
            />
            <span>Persist to engine</span>
          </label>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root
      class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Header class="gap-0 px-4">
        <div
          class="rounded-[var(--shell-radius-outer)] border border-[color:var(--shell-field-border-strong)] bg-[color:var(--shell-field-bg)] p-3 shadow-[var(--shell-field-shadow)]"
        >
          <div class="flex items-start justify-between gap-3">
            <Card.Title class="leading-snug">{token.label}</Card.Title>
            <span
              class="shrink-0 rounded-full bg-[color:var(--shell-color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[color:var(--shell-color-text-secondary)] capitalize"
            >
              {token.group}
            </span>
          </div>
          <p class="mt-1 text-sm leading-snug text-[color:var(--shell-color-text-secondary)]">
            {token.description}
          </p>
        </div>
      </Card.Header>

      <Card.Content class="space-y-4 px-4">
        <TokenModeSwatches
          activeMode={override.activeMode}
          altColor={altColor ?? override.color}
          darkColor={token.dark}
          lightColor={token.light}
          setTheme={onSetTheme}
          tokenLabel={token.label}
        />

        <TokenColorAnchorSection
          bind:color={override.color}
          label={colorLabel}
          onPersistChange={onColorChange}
          onPreviewChange={onColorChange}
          title={colorTitle}
        />

        <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label
            class="grid gap-2 text-sm font-medium text-[color:var(--shell-color-text-secondary)]"
          >
            <span>Push target</span>
            <ShellSelect
              value={override.overrideMode}
              options={OVERRIDE_MODE_OPTIONS}
              placeholder="Choose push target"
              onChange={(value) => onOverrideModeChange(value as typeof override.overrideMode)}
            />
          </label>
          <Button class="self-end" onclick={onPushOverride}>Push override</Button>
        </div>

        <p class="hint text-sm">
          These overrides stay separate from draft authoring until you push them to the engine.
        </p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
