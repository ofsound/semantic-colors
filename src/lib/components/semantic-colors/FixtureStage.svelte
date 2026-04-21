<script lang="ts">
  import WarningBadge from './WarningBadge.svelte';
  import { TOKENS_BY_GROUP } from '$lib/theme/schema';
  import type { ThemeMode, TokenId } from '$lib/theme/schema';

  let {
    activeMode,
    selectedTokenId,
    selectedTokenLabel,
    saveState,
    saveMessage,
    stageStyle,
    grayscalePreview,
    isSelectedUsage,
    hasWarnings,
    warningSummary,
    selectToken,
    tokenLabel
  }: {
    activeMode: ThemeMode;
    selectedTokenId: TokenId;
    selectedTokenLabel: string;
    saveState: 'idle' | 'saving' | 'saved' | 'error';
    saveMessage: string;
    stageStyle: string;
    grayscalePreview: boolean;
    isSelectedUsage: (tokenIds: TokenId[]) => boolean;
    hasWarnings: (tokenIds: TokenId[]) => boolean;
    warningSummary: (tokenIds: TokenId[]) => string;
    selectToken: (tokenId: TokenId) => void;
    tokenLabel: (tokenId: TokenId) => string;
  } = $props();

  const textInventory = TOKENS_BY_GROUP.text;
  const accentInventory = TOKENS_BY_GROUP.accent;
  const borderInventory = TOKENS_BY_GROUP.borders;
</script>

<header class="stage-header">
  <div>
    <p class="eyebrow">Preview harness</p>
    <h2>Standalone fixture app + live token inventory</h2>
  </div>
  <div class="stage-meta">
    <span>Mode: {activeMode}</span>
    <span>Selected: {selectedTokenLabel}</span>
  </div>
</header>

{#if saveState === 'error'}
  <div class="status-banner status-banner-error" role="alert">
    <strong>Autosave needs attention.</strong>
    <span>{saveMessage}</span>
  </div>
{/if}

<section
  id="preview-stage"
  class:grayscale={grayscalePreview}
  class="stage"
  data-theme={activeMode}
  style={stageStyle}
>
  <div class="hero-grid">
    <button
      aria-pressed={selectedTokenId === 'app'}
      class:selected-usage={isSelectedUsage(['app'])}
      class:warning={hasWarnings(['app'])}
      class="surface-card surface-card-app"
      onclick={() => selectToken('app')}
      type="button"
    >
      <WarningBadge summary={warningSummary(['app'])} visible={hasWarnings(['app'])} />
      <span class="fixture-label">App background</span>
      <small>{tokenLabel('app')}</small>
    </button>

    <button
      aria-pressed={selectedTokenId === 'shell'}
      class:selected-usage={isSelectedUsage(['shell'])}
      class:warning={hasWarnings(['shell'])}
      class="surface-card surface-card-shell"
      onclick={() => selectToken('shell')}
      type="button"
    >
      <WarningBadge summary={warningSummary(['shell'])} visible={hasWarnings(['shell'])} />
      <span class="fixture-label">Shell</span>
      <small>{tokenLabel('shell')}</small>
    </button>

    <article
      class:selected-usage={isSelectedUsage(['surface', 'surface-raised', 'border', 'text'])}
      class:warning={hasWarnings(['surface', 'surface-raised', 'border', 'text'])}
      class="surface-card surface-card-panel"
    >
      <WarningBadge
        summary={warningSummary(['surface', 'surface-raised', 'border', 'text'])}
        visible={hasWarnings(['surface', 'surface-raised', 'border', 'text'])}
      />
      <span class="fixture-label">Primary surface</span>
      <h3>Depth stack</h3>
      <p>Use the preview to judge visual weight in-place while themes swap.</p>
      <button
        aria-pressed={selectedTokenId === 'surface'}
        class="card-select-button"
        onclick={() => selectToken('surface')}
        type="button"
      >
        Select surface token
      </button>
      <div class="inner-stack">
        <button
          aria-pressed={selectedTokenId === 'surface-raised'}
          class:selected-usage={isSelectedUsage(['surface-raised'])}
          class="nested-surface"
          onclick={() => selectToken('surface-raised')}
          type="button"
        >
          Raised
        </button>
        <button
          aria-pressed={selectedTokenId === 'surface-muted'}
          class:selected-usage={isSelectedUsage(['surface-muted'])}
          class="nested-surface nested-muted"
          onclick={() => selectToken('surface-muted')}
          type="button"
        >
          Muted
        </button>
        <button
          aria-pressed={selectedTokenId === 'surface-subtle'}
          class:selected-usage={isSelectedUsage(['surface-subtle'])}
          class="nested-surface nested-subtle"
          onclick={() => selectToken('surface-subtle')}
          type="button"
        >
          Subtle
        </button>
        <button
          aria-pressed={selectedTokenId === 'field'}
          class:selected-usage={isSelectedUsage(['field', 'input'])}
          class="nested-surface nested-field"
          onclick={() => selectToken('field')}
          type="button"
        >
          Field
        </button>
      </div>
    </article>
  </div>

  <div class="fixture-grid">
    <article class="fixture-panel">
      <div class="fixture-panel-header">
        <h3>Text hierarchy</h3>
        <span>Primary, secondary, muted, faint, inverse</span>
      </div>
      <div class="text-stack">
        {#each textInventory as tokenId (tokenId)}
          <button
            aria-pressed={selectedTokenId === tokenId}
            class:selected-usage={isSelectedUsage([tokenId])}
            class:warning={hasWarnings([tokenId])}
            class={`text-sample text-sample-${tokenId}`}
            onclick={() => selectToken(tokenId)}
            type="button"
          >
            <WarningBadge summary={warningSummary([tokenId])} visible={hasWarnings([tokenId])} />
            <span>{tokenLabel(tokenId)}</span>
            <strong>The quick brown fox jumps over the lazy dog.</strong>
          </button>
        {/each}
      </div>
    </article>

    <article class="fixture-panel">
      <div class="fixture-panel-header">
        <h3>Accent and links</h3>
        <span>Interactive emphasis and tinting</span>
      </div>
      <div class="accent-grid">
        {#each accentInventory as tokenId (tokenId)}
          <button
            aria-pressed={selectedTokenId === tokenId}
            class:selected-usage={isSelectedUsage([tokenId])}
            class:warning={hasWarnings([tokenId])}
            class={`accent-sample accent-sample-${tokenId}`}
            onclick={() => selectToken(tokenId)}
            type="button"
          >
            <WarningBadge summary={warningSummary([tokenId])} visible={hasWarnings([tokenId])} />
            <span>{tokenLabel(tokenId)}</span>
          </button>
        {/each}
      </div>
    </article>

    <article class="fixture-panel">
      <div class="fixture-panel-header">
        <h3>Status pairs</h3>
        <span>Surface + text combinations</span>
      </div>
      <div class="status-grid">
        {#each ['success', 'warning', 'danger', 'info'] as stem (stem)}
          <button
            aria-pressed={selectedTokenId === (stem as TokenId)}
            class:selected-usage={isSelectedUsage([stem as TokenId, `${stem}-surface` as TokenId])}
            class:warning={hasWarnings([stem as TokenId, `${stem}-surface` as TokenId])}
            class={`status-card status-card-${stem}`}
            onclick={() => selectToken(stem as TokenId)}
            type="button"
          >
            <WarningBadge
              summary={warningSummary([stem as TokenId, `${stem}-surface` as TokenId])}
              visible={hasWarnings([stem as TokenId, `${stem}-surface` as TokenId])}
            />
            <strong>{stem}</strong>
            <span>{tokenLabel(stem as TokenId)}</span>
          </button>
        {/each}
      </div>
    </article>

    <article class="fixture-panel">
      <div class="fixture-panel-header">
        <h3>Controls</h3>
        <span>Primary, secondary, ghost, and field states</span>
      </div>
      <div class="control-grid">
        <button
          aria-pressed={selectedTokenId === 'control-primary'}
          class:selected-usage={isSelectedUsage(['control-primary', 'control-primary-text'])}
          class:warning={hasWarnings(['control-primary', 'control-primary-text'])}
          class="control-primary"
          onclick={() => selectToken('control-primary')}
          type="button"
        >
          <WarningBadge
            summary={warningSummary(['control-primary', 'control-primary-text'])}
            visible={hasWarnings(['control-primary', 'control-primary-text'])}
          />
          Primary action
        </button>
        <button
          aria-pressed={selectedTokenId === 'control-secondary'}
          class:selected-usage={isSelectedUsage([
            'control-secondary',
            'control-secondary-border',
            'control-secondary-text'
          ])}
          class:warning={hasWarnings([
            'control-secondary',
            'control-secondary-border',
            'control-secondary-text'
          ])}
          class="control-secondary"
          onclick={() => selectToken('control-secondary')}
          type="button"
        >
          <WarningBadge
            summary={warningSummary([
              'control-secondary',
              'control-secondary-border',
              'control-secondary-text'
            ])}
            visible={hasWarnings([
              'control-secondary',
              'control-secondary-border',
              'control-secondary-text'
            ])}
          />
          Secondary
        </button>
        <button
          aria-pressed={selectedTokenId === 'control-ghost-hover'}
          class:selected-usage={isSelectedUsage(['control-ghost-hover'])}
          class:warning={hasWarnings(['control-ghost-hover'])}
          class="control-ghost"
          onclick={() => selectToken('control-ghost-hover')}
          type="button"
        >
          <WarningBadge
            summary={warningSummary(['control-ghost-hover'])}
            visible={hasWarnings(['control-ghost-hover'])}
          />
          Ghost hover
        </button>
        <label
          class:selected-usage={isSelectedUsage(['input', 'input-border', 'input-placeholder'])}
          class:warning={hasWarnings(['input', 'input-border', 'input-placeholder'])}
          class="input-preview"
        >
          <WarningBadge
            summary={warningSummary(['input', 'input-border', 'input-placeholder'])}
            visible={hasWarnings(['input', 'input-border', 'input-placeholder'])}
          />
          <span>Input field</span>
          <input
            onfocus={() => selectToken('input')}
            onclick={() => selectToken('input')}
            placeholder="Input placeholder"
          />
        </label>
      </div>
    </article>

    <article class="fixture-panel">
      <div class="fixture-panel-header">
        <h3>Borders and focus</h3>
        <span>Quiet, default, strong, and focus treatments</span>
      </div>
      <div class="border-grid">
        {#each borderInventory as tokenId (tokenId)}
          <button
            aria-pressed={selectedTokenId === tokenId}
            class:selected-usage={isSelectedUsage([tokenId])}
            class:warning={hasWarnings([tokenId])}
            class={`border-sample border-sample-${tokenId}`}
            onclick={() => selectToken(tokenId)}
            type="button"
          >
            <WarningBadge summary={warningSummary([tokenId])} visible={hasWarnings([tokenId])} />
            {tokenLabel(tokenId)}
          </button>
        {/each}
      </div>
    </article>

    <article class="fixture-panel fixture-panel-overlay">
      <div class="fixture-panel-header">
        <h3>Overlay and scrim</h3>
        <span>Shared overlay pattern with only core tokens</span>
      </div>
      <div class="overlay-demo">
        <div class="scrim"></div>
        <button
          aria-pressed={selectedTokenId === 'surface-overlay'}
          class:selected-usage={isSelectedUsage(['surface-overlay', 'text', 'border'])}
          class:warning={hasWarnings(['surface-overlay', 'text', 'border'])}
          class="overlay-card"
          onclick={() => selectToken('surface-overlay')}
          type="button"
        >
          <WarningBadge
            summary={warningSummary(['surface-overlay', 'text', 'border'])}
            visible={hasWarnings(['surface-overlay', 'text', 'border'])}
          />
          <strong>Overlay surface</strong>
          <p>Modal, popover, or detached chrome should read from the same semantic surface.</p>
        </button>
      </div>
    </article>
  </div>
</section>

<style>
  .stage-header,
  .fixture-panel,
  .status-banner {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 40px -28px rgba(15, 23, 42, 0.25);
  }

  .stage-header {
    padding: 1rem 1.1rem;
    align-items: center;
  }

  .stage-meta {
    display: flex;
    gap: 0.8rem;
    color: #4b5563;
    font-size: 0.85rem;
  }

  .status-banner {
    margin-top: 0;
    padding: 0.85rem;
  }

  .status-banner strong {
    display: block;
    margin-bottom: 0.4rem;
  }

  .status-banner-error {
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(254, 226, 226, 0.9);
    color: #7f1d1d;
  }

  .stage {
    overflow-y: auto;
    padding: 1.1rem;
    border-radius: 1.5rem;
    background: var(--theme-app);
    color: var(--theme-text);
    transition:
      background-color 160ms ease,
      color 160ms ease,
      filter 160ms ease;
  }

  .stage.grayscale {
    filter: grayscale(1);
  }

  .hero-grid {
    grid-template-columns: 0.7fr 0.7fr 1.3fr;
    margin-bottom: 1rem;
  }

  .surface-card,
  .fixture-panel {
    color: inherit;
  }

  .surface-card {
    min-height: 10rem;
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 1rem;
    border-radius: 1.25rem;
    border: 1px solid var(--theme-border);
    box-shadow: 0 20px 40px -30px rgba(15, 23, 42, 0.45);
  }

  .surface-card-app {
    background: var(--theme-app);
  }

  .surface-card-shell {
    background: var(--theme-shell);
  }

  .surface-card-panel {
    background: var(--theme-surface);
  }

  .fixture-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .card-select-button {
    justify-self: start;
    margin-top: 0.2rem;
    background: linear-gradient(135deg, #111827, #334155);
    color: white;
  }

  .inner-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: 0.65rem;
  }

  .nested-surface {
    background: var(--theme-surface-raised);
    color: var(--theme-text);
    border: 1px solid var(--theme-border);
  }

  .nested-muted {
    background: var(--theme-surface-muted);
  }

  .nested-subtle {
    background: var(--theme-surface-subtle);
  }

  .nested-field {
    background: var(--theme-field);
  }

  .fixture-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .fixture-panel {
    padding: 1rem;
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
  }

  .text-stack {
    display: grid;
    gap: 0.7rem;
    margin-top: 0.9rem;
  }

  .text-sample {
    display: grid;
    gap: 0.2rem;
    text-align: left;
    background: transparent;
  }

  .text-sample-text {
    color: var(--theme-text);
  }

  .text-sample-text-secondary {
    color: var(--theme-text-secondary);
  }

  .text-sample-text-muted {
    color: var(--theme-text-muted);
  }

  .text-sample-text-faint {
    color: var(--theme-text-faint);
  }

  .text-sample-text-inverse {
    color: var(--theme-text-inverse);
    background: var(--theme-accent-strong);
  }

  .accent-grid,
  .status-grid,
  .control-grid,
  .border-grid {
    margin-top: 0.9rem;
  }

  .accent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .accent-sample {
    min-height: 4.2rem;
    text-align: left;
    font-weight: 700;
  }

  .accent-sample-accent {
    background: var(--theme-accent);
    color: var(--theme-text-inverse);
  }

  .accent-sample-accent-strong {
    background: var(--theme-accent-strong);
    color: var(--theme-text-inverse);
  }

  .accent-sample-accent-surface {
    background: var(--theme-accent-surface);
    color: var(--theme-text);
  }

  .accent-sample-link {
    background: transparent;
    color: var(--theme-link);
    border-color: var(--theme-link);
  }

  .accent-sample-link-hover {
    background: transparent;
    color: var(--theme-link-hover);
    border-color: var(--theme-link-hover);
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-card {
    display: grid;
    gap: 0.25rem;
    min-height: 4.5rem;
    text-align: left;
  }

  .status-card-success {
    background: var(--theme-success-surface);
    color: var(--theme-success);
  }

  .status-card-warning {
    background: var(--theme-warning-surface);
    color: var(--theme-warning);
  }

  .status-card-danger {
    background: var(--theme-danger-surface);
    color: var(--theme-danger);
  }

  .status-card-info {
    background: var(--theme-info-surface);
    color: var(--theme-info);
  }

  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .control-primary {
    background: var(--theme-control-primary);
    color: var(--theme-control-primary-text);
  }

  .control-secondary {
    background: var(--theme-control-secondary);
    color: var(--theme-control-secondary-text);
    border-color: var(--theme-control-secondary-border);
  }

  .control-ghost {
    background: var(--theme-control-ghost-hover);
    color: var(--theme-text);
  }

  .input-preview {
    display: grid;
    gap: 0.45rem;
    padding: 0.8rem;
    border-radius: 1rem;
    border: 1px solid var(--theme-input-border);
    background: var(--theme-input);
    color: var(--theme-text);
  }

  .input-preview input {
    background: var(--theme-input);
    border-color: var(--theme-input-border);
    color: var(--theme-text);
  }

  .input-preview input::placeholder {
    color: var(--theme-input-placeholder);
  }

  .border-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .border-sample {
    min-height: 4rem;
    text-align: left;
    background: var(--theme-surface-raised);
    color: var(--theme-text);
  }

  .border-sample-border {
    border-color: var(--theme-border);
  }

  .border-sample-border-subtle {
    border-color: var(--theme-border-subtle);
  }

  .border-sample-border-strong {
    border-color: var(--theme-border-strong);
  }

  .border-sample-focus-ring {
    border-color: var(--theme-focus-ring);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--theme-focus-ring) 25%, transparent);
  }

  .fixture-panel-overlay {
    grid-column: 1 / -1;
  }

  .overlay-demo {
    position: relative;
    margin-top: 0.9rem;
    min-height: 11rem;
    border-radius: 1rem;
    overflow: hidden;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--theme-accent) 35%, var(--theme-surface-subtle)),
      var(--theme-surface-muted)
    );
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, black 35%, transparent);
  }

  .overlay-card {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    width: min(22rem, calc(100% - 2.5rem));
    padding: 1rem;
    background: var(--theme-surface-overlay);
    color: var(--theme-text);
    border: 1px solid var(--theme-border);
  }
</style>
