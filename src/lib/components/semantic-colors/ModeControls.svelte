<script lang="ts">
  import type { ThemeManifest, ThemeMode } from '$lib/theme/schema';

  let {
    manifest = $bindable(),
    activeMode,
    setTheme,
    updateAltDelta
  }: {
    manifest: ThemeManifest;
    activeMode: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    updateAltDelta: (channel: 'l' | 'c' | 'h', value: number) => void;
  } = $props();
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="eyebrow">Theme state</p>
      <h2>Mode controls</h2>
    </div>
  </div>

  <div class="mode-row">
    <button
      aria-pressed={activeMode === 'light'}
      class:active={activeMode === 'light'}
      onclick={() => setTheme('light')}
      type="button"
    >
      1 Light
    </button>
    <button
      aria-pressed={activeMode === 'dark'}
      class:active={activeMode === 'dark'}
      onclick={() => setTheme('dark')}
      type="button"
    >
      2 Dark
    </button>
    <button
      aria-pressed={activeMode === 'alt'}
      class:active={activeMode === 'alt'}
      onclick={() => setTheme('alt')}
      type="button"
    >
      3 Alt
    </button>
  </div>

  <label class="checkbox-row">
    <input bind:checked={manifest.alt.grayscalePreview} type="checkbox" />
    <span>Greyscale hierarchy overlay (`L`)</span>
  </label>

  <div class="field-grid alt-grid">
    <label class="field-block">
      <span>Alt base</span>
      <select bind:value={manifest.alt.source}>
        <option value="light">Derive from Light</option>
        <option value="dark">Derive from Dark</option>
      </select>
    </label>
    <label class="checkbox-row compact">
      <input bind:checked={manifest.alt.harmonyLock} type="checkbox" />
      <span>Lock harmony</span>
    </label>
  </div>

  <div class={`mode-block ${activeMode === 'alt' ? 'mode-block-promoted' : ''}`}>
    <div class="slider-row">
      <span>Hue shift</span>
      <input
        max="180"
        min="-180"
        step="1"
        type="range"
        value={manifest.alt.delta.h}
        oninput={(event) =>
          updateAltDelta('h', Number((event.currentTarget as HTMLInputElement).value))}
      />
      <input
        class="number-field"
        max="180"
        min="-180"
        step="1"
        type="number"
        bind:value={manifest.alt.delta.h}
      />
    </div>

    <div class="slider-row">
      <span>Chroma shift</span>
      <input
        max="0.16"
        min="-0.16"
        step="0.005"
        type="range"
        value={manifest.alt.delta.c}
        oninput={(event) =>
          updateAltDelta('c', Number((event.currentTarget as HTMLInputElement).value))}
      />
      <input
        class="number-field"
        max="0.16"
        min="-0.16"
        step="0.005"
        type="number"
        bind:value={manifest.alt.delta.c}
      />
    </div>

    <div class="slider-row">
      <span>Lightness shift</span>
      <input
        max="0.2"
        min="-0.2"
        step="0.01"
        type="range"
        value={manifest.alt.delta.l}
        oninput={(event) =>
          updateAltDelta('l', Number((event.currentTarget as HTMLInputElement).value))}
      />
      <input
        class="number-field"
        max="0.2"
        min="-0.2"
        step="0.01"
        type="number"
        bind:value={manifest.alt.delta.l}
      />
    </div>
  </div>
</section>

<style>
  .mode-row button.active {
    background: linear-gradient(135deg, #111827, #334155);
    color: white;
  }

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
