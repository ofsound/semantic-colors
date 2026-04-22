<script lang="ts">
  import AnchorColorPicker from '$lib/components/semantic-colors/AnchorColorPicker.svelte';
  import { toCssColor } from '$lib/theme/color';
  import type { OklchColor, ThemeManifest, ThemeMode, TokenId } from '$lib/theme/schema';

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
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="eyebrow">Token editor</p>
      <h2>{selectedToken.label}</h2>
    </div>
    <span class="token-group">{selectedToken.group}</span>
  </div>

  <p class="description">{selectedToken.description}</p>

  <div class="swatch-row">
    <button
      aria-label={`Preview ${selectedToken.label} in light mode: ${toCssColor(selectedToken.light)}`}
      class="swatch-card"
      onclick={() => setTheme('light')}
      type="button"
    >
      <span>Light</span>
      <span class="swatch" style={`background:${toCssColor(selectedToken.light)}`}></span>
    </button>
    <button
      aria-label={`Preview ${selectedToken.label} in dark mode: ${toCssColor(selectedToken.dark)}`}
      class="swatch-card"
      onclick={() => setTheme('dark')}
      type="button"
    >
      <span>Dark</span>
      <span class="swatch" style={`background:${toCssColor(selectedToken.dark)}`}></span>
    </button>
    <button
      aria-label={`Preview ${selectedToken.label} in alt mode: ${toCssColor(currentTokenAlt)}`}
      class="swatch-card"
      onclick={() => setTheme('alt')}
      type="button"
    >
      <span>Alt</span>
      <span class="swatch" style={`background:${toCssColor(currentTokenAlt)}`}></span>
    </button>
  </div>

  {#if activeMode === 'light'}
    <div class="anchor-editor anchor-editor-active">
      <div class="anchor-header">
        <strong>Light anchor</strong>
      </div>
      <div class="anchor-layout">
        <AnchorColorPicker
          bind:color={selectedToken.light}
          label="Light anchor"
          {onPersistChange}
        />
        <div class="channel-grid">
          <label class="channel">
            <span>L</span>
            <input
              bind:value={selectedToken.light.l}
              max="1"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="range"
            />
            <input
              class="number-field"
              max="1"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="number"
              bind:value={selectedToken.light.l}
            />
          </label>
          <label class="channel">
            <span>C</span>
            <input
              bind:value={selectedToken.light.c}
              max="0.37"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="range"
            />
            <input
              class="number-field"
              max="0.37"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="number"
              bind:value={selectedToken.light.c}
            />
          </label>
          <label class="channel">
            <span>H</span>
            <input
              bind:value={selectedToken.light.h}
              max="360"
              min="0"
              oninput={onPersistChange}
              step="1"
              type="range"
            />
            <input
              class="number-field"
              max="360"
              min="0"
              oninput={onPersistChange}
              step="1"
              type="number"
              bind:value={selectedToken.light.h}
            />
          </label>
        </div>
      </div>
    </div>
  {/if}

  {#if activeMode === 'dark'}
    <div class="anchor-editor anchor-editor-active">
      <div class="anchor-header">
        <strong>Dark anchor</strong>
      </div>
      <div class="anchor-layout">
        <AnchorColorPicker bind:color={selectedToken.dark} label="Dark anchor" {onPersistChange} />
        <div class="channel-grid">
          <label class="channel">
            <span>L</span>
            <input
              bind:value={selectedToken.dark.l}
              max="1"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="range"
            />
            <input
              class="number-field"
              max="1"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="number"
              bind:value={selectedToken.dark.l}
            />
          </label>
          <label class="channel">
            <span>C</span>
            <input
              bind:value={selectedToken.dark.c}
              max="0.37"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="range"
            />
            <input
              class="number-field"
              max="0.37"
              min="0"
              oninput={onPersistChange}
              step="0.005"
              type="number"
              bind:value={selectedToken.dark.c}
            />
          </label>
          <label class="channel">
            <span>H</span>
            <input
              bind:value={selectedToken.dark.h}
              max="360"
              min="0"
              oninput={onPersistChange}
              step="1"
              type="range"
            />
            <input
              class="number-field"
              max="360"
              min="0"
              oninput={onPersistChange}
              step="1"
              type="number"
              bind:value={selectedToken.dark.h}
            />
          </label>
        </div>
      </div>
    </div>
  {/if}

  {#if activeMode === 'alt'}
    <div class="anchor-editor anchor-editor-active">
      <div class="anchor-header">
        <strong>Alt exception</strong>
      </div>
      <div class="field-grid">
        <label class="field-block">
          <span>Alt behavior</span>
          <select bind:value={selectedToken.exception.altBehavior} onchange={onPersistChange}>
            <option value="derive">Derive</option>
            <option value="pin">Pin to source anchor</option>
            <option value="exclude">Exclude from Alt</option>
          </select>
        </label>
        <label class="field-block">
          <span>Max chroma</span>
          <input
            bind:value={selectedToken.exception.maxChroma}
            max="0.37"
            min="0"
            oninput={onPersistChange}
            step="0.005"
            type="number"
          />
        </label>
      </div>

      {#if selectedToken.altParent}
        <p class="microcopy">
          Alt derives from parent token: <strong>{tokenLabel(selectedToken.altParent)}</strong>
        </p>
      {/if}
    </div>
  {/if}

  <div class="validation-list">
    <div class="validation-header">
      <p class="eyebrow">Validation</p>
      {#if selectedTokenNotes.length > 0}
        <span class="validation-count">{selectedTokenNotes.length} warning(s)</span>
      {/if}
    </div>
    {#if selectedTokenNotes.length === 0}
      <p class="validation-ok">No warnings for this token in {activeMode} mode.</p>
    {:else}
      {#each selectedTokenNotes as note (note)}
        <p class="validation-issue">{note}</p>
      {/each}
    {/if}
  </div>
</section>

<style>
  .token-group {
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.08);
    font-size: 0.76rem;
    text-transform: capitalize;
  }

  .description,
  .microcopy {
    color: #4b5563;
  }

  .swatch-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 0.8rem;
  }

  .swatch-card {
    display: grid;
    gap: 0.5rem;
    text-align: left;
  }

  .swatch {
    height: 2.5rem;
    border-radius: var(--shell-radius-inner);
    border: 1px solid rgba(15, 23, 42, 0.12);
  }

  .anchor-editor {
    margin-top: 0.95rem;
    padding: 0.85rem;
    border-radius: var(--shell-radius-inner);
    background: rgba(15, 23, 42, 0.04);
  }

  .anchor-editor-active {
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.07);
  }

  .anchor-header,
  .validation-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.8rem;
    align-items: center;
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .anchor-layout {
    display: grid;
    gap: 0.85rem;
  }

  .number-field {
    min-width: 0;
  }

  .validation-list {
    margin-top: 1rem;
  }

  .validation-count {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: rgba(239, 68, 68, 0.14);
    color: #b91c1c;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .validation-ok {
    color: #047857;
  }

  .validation-issue {
    color: #991b1b;
  }

  @media (min-width: 900px) {
    .anchor-layout {
      grid-template-columns: minmax(0, 1.05fr) minmax(16rem, 1fr);
      align-items: start;
    }
  }
</style>
