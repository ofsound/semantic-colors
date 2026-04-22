<script lang="ts">
  import type { ThemeManifest, ThemeMode } from '$lib/theme/schema';

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

  function handleAltDeltaInput(
    channel: 'l' | 'c' | 'h',
    event: Event & { currentTarget: EventTarget & HTMLInputElement }
  ): void {
    updateAltDelta(channel, Number(event.currentTarget.value));
    persistAltChange();
  }
</script>

<section class="panel">
  <div class="panel-header">
    <h2>Alt</h2>
  </div>

  <div class="field-grid alt-grid">
    <div class="field-block">
      <select aria-label="Alt base" bind:value={manifest.alt.source} onchange={persistAltChange}>
        <option value="light">Derive from Light</option>
        <option value="dark">Derive from Dark</option>
      </select>
    </div>
  </div>

  <div class={`mode-block ${activeMode === 'alt' ? 'mode-block-promoted' : ''}`}>
    <div class="slider-row">
      <span>Hue shift</span>
      <input
        max="180"
        min="-180"
        value={manifest.alt.delta.h}
        oninput={(event) => handleAltDeltaInput('h', event)}
        step="1"
        type="range"
      />
      <input
        class="number-field"
        max="180"
        min="-180"
        step="1"
        type="number"
        bind:value={manifest.alt.delta.h}
        oninput={persistAltChange}
      />
    </div>

    <div class="slider-row">
      <span>Chroma shift</span>
      <input
        max="0.16"
        min="-0.16"
        value={manifest.alt.delta.c}
        oninput={(event) => handleAltDeltaInput('c', event)}
        step="0.005"
        type="range"
      />
      <input
        class="number-field"
        max="0.16"
        min="-0.16"
        step="0.005"
        type="number"
        bind:value={manifest.alt.delta.c}
        oninput={persistAltChange}
      />
    </div>

    <div class="slider-row">
      <span>Lightness shift</span>
      <input
        max="0.2"
        min="-0.2"
        value={manifest.alt.delta.l}
        oninput={(event) => handleAltDeltaInput('l', event)}
        step="0.01"
        type="range"
      />
      <input
        class="number-field"
        max="0.2"
        min="-0.2"
        step="0.01"
        type="number"
        bind:value={manifest.alt.delta.l}
        oninput={persistAltChange}
      />
    </div>

    <label class="harmony-lock-row">
      <input bind:checked={manifest.alt.harmonyLock} onchange={persistAltChange} type="checkbox" />
      <span class="harmony-lock-copy">
        <span class="harmony-lock-title">Lock harmony</span>
        <small>Keep accent, links, and focus ring on one shared hue in Alt mode.</small>
      </span>
    </label>
  </div>
</section>

<style>
  .alt-grid {
    align-items: start;
    justify-items: start;
  }

  .harmony-lock-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.45rem;
    text-align: left;
    margin-top: 0.85rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
  }

  .harmony-lock-copy {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    text-align: left;
  }

  .harmony-lock-title {
    line-height: 1.25;
  }

  .harmony-lock-copy small {
    color: var(--color-text-muted, #52606d);
    line-height: 1.35;
  }

  .mode-block {
    margin-top: 0.95rem;
    padding: 0.85rem;
    border-radius: var(--shell-radius-inner);
    background: rgba(15, 23, 42, 0.04);
  }

  .mode-block-promoted {
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.07);
  }

  .slider-row {
    display: grid;
    grid-template-columns: 5rem 1fr 5rem;
    gap: 0.75rem;
    align-items: center;
  }

  .slider-row + .slider-row {
    margin-top: 0.75rem;
  }

  .number-field {
    min-width: 0;
  }
</style>
