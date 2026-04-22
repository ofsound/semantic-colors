<script lang="ts">
  import type { ThemeManifest, ThemeMode } from '$lib/theme/schema';

  let {
    manifest = $bindable(),
    onPersistChange,
    activeMode,
    updateAltDelta
  }: {
    manifest: ThemeManifest;
    onPersistChange: () => void;
    activeMode: ThemeMode;
    updateAltDelta: (channel: 'l' | 'c' | 'h', value: number) => void;
  } = $props();

  function handleAltDeltaInput(
    channel: 'l' | 'c' | 'h',
    event: Event & { currentTarget: EventTarget & HTMLInputElement }
  ): void {
    updateAltDelta(channel, Number(event.currentTarget.value));
    onPersistChange();
  }
</script>

<section class="panel">
  <div class="panel-header">
    <h2>Alt</h2>
  </div>

  <div class="field-grid alt-grid">
    <div class="field-block">
      <select aria-label="Alt base" bind:value={manifest.alt.source} onchange={onPersistChange}>
        <option value="light">Derive from Light</option>
        <option value="dark">Derive from Dark</option>
      </select>
    </div>
    <label class="checkbox-row compact">
      <input bind:checked={manifest.alt.harmonyLock} onchange={onPersistChange} type="checkbox" />
      <span>Lock harmony</span>
    </label>
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
        oninput={onPersistChange}
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
        oninput={onPersistChange}
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
        oninput={onPersistChange}
      />
    </div>
  </div>
</section>

<style>
  .alt-grid {
    align-items: end;
  }

  .compact {
    align-self: end;
  }

  .mode-block {
    margin-top: 0.95rem;
    padding: 0.85rem;
    border-radius: 1rem;
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
