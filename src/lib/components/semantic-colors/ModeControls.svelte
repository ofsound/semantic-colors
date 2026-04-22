<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Separator } from '$lib/components/ui/separator';
  import NumberSliderField from '$lib/components/semantic-colors/NumberSliderField.svelte';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
  import type { ThemeManifest, ThemeMode } from '$lib/theme/schema';

  const ALT_SOURCE_OPTIONS = [
    { value: 'light', label: 'Derive from Light' },
    { value: 'dark', label: 'Derive from Dark' }
  ] as const;

  let {
    manifest = $bindable(),
    onPersistChange,
    onActivateAltPreview,
    activeMode,
    updateAltDelta
  }: {
    manifest: ThemeManifest;
    onPersistChange: () => void;
    onActivateAltPreview: () => void;
    activeMode: ThemeMode;
    updateAltDelta: (channel: 'l' | 'c' | 'h', value: number) => void;
  } = $props();

  function persistAltChange(): void {
    onActivateAltPreview();
    onPersistChange();
  }

  function handleAltDeltaChange(channel: 'l' | 'c' | 'h', value: number): void {
    updateAltDelta(channel, value);
    persistAltChange();
  }
</script>

<Card.Root
  class="gap-4 border-0 ring-0 shadow-none bg-[color:var(--shell-panel-bg)] py-4 backdrop-blur-md"
>
  <Card.Header class="gap-3 px-4">
    <Card.Title>Alt</Card.Title>
  </Card.Header>

  <Card.Content class="space-y-4 px-4">
    <label class="grid gap-2 text-sm font-medium text-slate-700">
      <span>Alt base</span>
      <ShellSelect
        bind:value={manifest.alt.source}
        options={ALT_SOURCE_OPTIONS as unknown as { value: string; label: string }[]}
        placeholder="Choose Alt source"
        onChange={persistAltChange}
      />
    </label>

    <section
      class={`space-y-3 rounded-xl border p-4 ${activeMode === 'alt' ? 'border-sky-500/35 bg-sky-500/7' : 'border-[color:var(--shell-border)] bg-[color:var(--shell-subtle-panel-bg)]'}`}
    >
      <NumberSliderField
        label="Hue"
        max={180}
        min={-180}
        onChange={() => handleAltDeltaChange('h', manifest.alt.delta.h)}
        step={1}
        bind:value={manifest.alt.delta.h}
      />
      <NumberSliderField
        label="Chroma"
        max={0.16}
        min={-0.16}
        onChange={() => handleAltDeltaChange('c', manifest.alt.delta.c)}
        step={0.005}
        bind:value={manifest.alt.delta.c}
      />
      <NumberSliderField
        label="Lightness"
        max={0.2}
        min={-0.2}
        onChange={() => handleAltDeltaChange('l', manifest.alt.delta.l)}
        step={0.01}
        bind:value={manifest.alt.delta.l}
      />

      <Separator class="my-1" />

      <label class="flex items-start gap-3 rounded-lg px-1 py-1 text-left">
        <Checkbox bind:checked={manifest.alt.harmonyLock} onchange={persistAltChange} />
        <span class="grid gap-1">
          <span class="text-sm font-medium text-slate-900">Lock harmony</span>
          <small class="text-sm leading-5 text-slate-600">
            Keep accent, links, and focus ring on one shared hue in Alt mode.
          </small>
        </span>
      </label>
    </section>
  </Card.Content>
</Card.Root>
