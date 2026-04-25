<script lang="ts">
  import TokenPreviewButton from './TokenPreviewButton.svelte';
  import WarningBadge from './WarningBadge.svelte';
  import { TOKENS_BY_GROUP } from '$lib/theme/schema';
  import type { ThemeMode, TokenId } from '$lib/theme/schema';

  let {
    activeMode,
    selectedTokenId,
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

  function handlePrimarySurfaceCardClick(event: MouseEvent): void {
    if (event.target instanceof HTMLElement && event.target.closest('button')) {
      return;
    }

    selectToken('surface');
  }

  function handlePrimarySurfaceCardKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    selectToken('surface');
  }

  const statusPairStems = ['success', 'warning', 'danger', 'info'] as const;
  type StatusPairStem = (typeof statusPairStems)[number];

  function handleStatusCardSurfaceClick(event: MouseEvent, stem: StatusPairStem): void {
    if (event.target instanceof HTMLElement && event.target.closest('button')) {
      return;
    }
    selectToken(`${stem}-surface` as TokenId);
  }

  function handleStatusCardSurfaceKeydown(event: KeyboardEvent, stem: StatusPairStem): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectToken(`${stem}-surface` as TokenId);
  }
</script>

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
    <TokenPreviewButton
      class="surface-card surface-card-app"
      {hasWarnings}
      {isSelectedUsage}
      {selectedTokenId}
      {selectToken}
      tokenId="app"
      tokenIds={['app']}
      {warningSummary}
    >
      <span class="fixture-label">App</span>
    </TokenPreviewButton>

    <TokenPreviewButton
      class="surface-card surface-card-shell"
      {hasWarnings}
      {isSelectedUsage}
      {selectedTokenId}
      {selectToken}
      tokenId="shell"
      tokenIds={['shell']}
      {warningSummary}
    >
      <span class="fixture-label">Shell</span>
    </TokenPreviewButton>

    <div
      aria-pressed={selectedTokenId === 'surface'}
      class:selected-usage={isSelectedUsage(['surface', 'surface-raised', 'border', 'text'])}
      class:warning={hasWarnings(['surface', 'surface-raised', 'border', 'text'])}
      class="surface-card surface-card-panel surface-card-panel-interactive"
      onclick={handlePrimarySurfaceCardClick}
      onkeydown={handlePrimarySurfaceCardKeydown}
      role="button"
      tabindex="0"
    >
      <WarningBadge
        summary={warningSummary(['surface', 'surface-raised', 'border', 'text'])}
        visible={hasWarnings(['surface', 'surface-raised', 'border', 'text'])}
      />
      <span class="fixture-label">Primary surface</span>
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
    </div>
  </div>

  <div class="fixture-shell-wrap" aria-label="Token samples shown on shell background">
    <div class="fixture-grid">
      <article class="fixture-panel">
        <div class="fixture-panel-header">
          <h3>Text hierarchy</h3>
        </div>
        <div class="text-stack">
          {#each textInventory as tokenId (tokenId)}
            <TokenPreviewButton
              class={`text-sample text-sample-${tokenId}`}
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              {tokenId}
              tokenIds={[tokenId]}
              {warningSummary}
            >
              <span>{tokenLabel(tokenId)}</span>
              <strong>The quick brown fox jumps over the lazy dog.</strong>
            </TokenPreviewButton>
          {/each}
        </div>
      </article>

      <article class="fixture-panel">
        <div class="fixture-panel-header">
          <h3>Accent and links</h3>
        </div>
        <div class="accent-grid">
          {#each accentInventory as tokenId (tokenId)}
            <TokenPreviewButton
              class={`accent-sample accent-sample-${tokenId}`}
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              {tokenId}
              tokenIds={[tokenId]}
              {warningSummary}
            >
              <span>{tokenLabel(tokenId)}</span>
            </TokenPreviewButton>
          {/each}
        </div>
      </article>

      <div
        class="fixture-samples-2x2"
        aria-label="Controls, borders, status pairs, and overlay scrim samples"
      >
        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Controls</h3>
          </div>
          <div class="control-grid">
            <TokenPreviewButton
              class="control-primary"
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              tokenId="control-primary"
              tokenIds={['control-primary', 'control-primary-text']}
              {warningSummary}
            >
              Primary action
            </TokenPreviewButton>
            <TokenPreviewButton
              class="control-secondary"
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              tokenId="control-secondary"
              tokenIds={['control-secondary', 'control-secondary-border', 'control-secondary-text']}
              {warningSummary}
            >
              Secondary
            </TokenPreviewButton>
            <TokenPreviewButton
              class="control-ghost"
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              tokenId="control-ghost-hover"
              tokenIds={['control-ghost-hover']}
              {warningSummary}
            >
              Ghost hover
            </TokenPreviewButton>
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
          </div>
          <div class="border-grid">
            {#each borderInventory as tokenId (tokenId)}
              <TokenPreviewButton
                class={`border-sample border-sample-${tokenId}`}
                {hasWarnings}
                {isSelectedUsage}
                {selectedTokenId}
                {selectToken}
                {tokenId}
                tokenIds={[tokenId]}
                {warningSummary}
              >
                {tokenLabel(tokenId)}
              </TokenPreviewButton>
            {/each}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Status pairs</h3>
          </div>
          <div class="status-grid">
            {#each statusPairStems as stem (stem)}
              <div
                role="button"
                tabindex="0"
                class={`status-card status-card-${stem}`}
                class:selected-usage={isSelectedUsage([
                  stem as TokenId,
                  `${stem}-surface` as TokenId
                ])}
                class:warning={hasWarnings([stem as TokenId, `${stem}-surface` as TokenId])}
                aria-pressed={selectedTokenId === (`${stem}-surface` as TokenId)}
                aria-label={`Select ${tokenLabel(`${stem}-surface` as TokenId)}`}
                onclick={(e) => handleStatusCardSurfaceClick(e, stem)}
                onkeydown={(e) => handleStatusCardSurfaceKeydown(e, stem)}
              >
                <WarningBadge
                  summary={warningSummary([stem as TokenId, `${stem}-surface` as TokenId])}
                  visible={hasWarnings([stem as TokenId, `${stem}-surface` as TokenId])}
                />
                <button
                  aria-pressed={selectedTokenId === (stem as TokenId)}
                  class="status-card-text"
                  onclick={() => selectToken(stem as TokenId)}
                  type="button"
                >
                  <strong>{stem}</strong>
                  <span>{tokenLabel(stem as TokenId)}</span>
                </button>
              </div>
            {/each}
          </div>
        </article>

        <article class="fixture-panel fixture-panel-overlay">
          <div class="fixture-panel-header">
            <h3>Overlay and scrim</h3>
          </div>
          <div class="overlay-demo">
            <div class="scrim"></div>
            <TokenPreviewButton
              class="overlay-card"
              {hasWarnings}
              {isSelectedUsage}
              {selectedTokenId}
              {selectToken}
              tokenId="surface-overlay"
              tokenIds={['surface-overlay', 'text', 'border']}
              {warningSummary}
            >
              <strong>Overlay surface</strong>
              <p>Modal, popover, or detached chrome should read from the same semantic surface.</p>
            </TokenPreviewButton>
          </div>
        </article>
      </div>
    </div>
  </div>
</section>

<style>
  .fixture-panel,
  .status-banner {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: var(--shell-radius-outer);
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
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
    border-radius: var(--shell-radius-outer);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    background: var(--theme-app);
    color: var(--theme-text);
    /* Tailwind preflight resets `* { padding: 0 }` and `button { border-radius: 0 }` */
    --fixture-control-radius: var(--shell-radius-inner);
    --fixture-control-pad-block: 0.65rem;
    --fixture-control-pad-inline: 0.8rem;
    --preview-hover-ring-color: color-mix(in srgb, var(--theme-focus-ring) 72%, white 16%);
    --preview-hover-ring-soft: color-mix(in srgb, var(--theme-focus-ring) 30%, transparent);
    --preview-hover-shadow: color-mix(in srgb, var(--theme-focus-ring) 42%, transparent);
    transition:
      background-color 160ms ease,
      color 160ms ease,
      filter 160ms ease;
  }

  .stage.grayscale {
    filter: grayscale(1);
  }

  .stage :is(button, [role='button'], .input-preview) {
    position: relative;
    cursor: pointer;
    transition:
      box-shadow 160ms ease,
      border-color 160ms ease,
      filter 160ms ease,
      background-color 160ms ease,
      color 160ms ease;
  }

  .stage :is(button, [role='button'], .input-preview):is(:hover, :focus-visible),
  .stage .input-preview:focus-within {
    box-shadow:
      0 0 0 1px var(--preview-hover-ring-color),
      0 0 0 0.42rem var(--preview-hover-ring-soft),
      0 1.1rem 2.2rem -1.2rem var(--preview-hover-shadow);
    filter: saturate(1.08) brightness(1.03);
  }

  .stage :is(button, [role='button'], .input-preview):hover {
    animation: preview-target-hover-pulse 880ms ease-in-out infinite alternate;
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
    border-radius: var(--shell-radius-inner);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
  }

  .surface-card-app {
    background: var(--theme-app);
    text-align: left;
    justify-items: start;
  }

  .surface-card-shell {
    background: var(--theme-shell);
    text-align: left;
    justify-items: start;
  }

  .surface-card-panel {
    background: var(--theme-surface);
  }

  .surface-card-panel-interactive {
    cursor: pointer;
  }

  .fixture-label,
  .fixture-panel-header h3 {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: inherit;
  }

  .inner-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: 0.65rem;
  }

  .nested-surface {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 2.5rem;
    background: var(--theme-surface-raised);
    color: var(--theme-text);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
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

  .fixture-shell-wrap {
    background: var(--theme-shell);
    color: var(--theme-text);
    border-radius: var(--shell-radius-outer);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    padding: 1.1rem;
  }

  .fixture-grid {
    --fixture-col-gap: 1.25rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem var(--fixture-col-gap);
  }

  .fixture-samples-2x2 {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem var(--fixture-col-gap);
    align-items: start;
  }

  .fixture-samples-2x2 .fixture-panel {
    min-width: 0;
  }

  @media (max-width: 52rem) {
    .fixture-samples-2x2 {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .fixture-panel {
    padding: 1rem;
    border-radius: var(--shell-radius-outer);
    background: var(--theme-surface);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
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
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
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
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
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
  }

  .accent-sample-link-hover {
    background: transparent;
    color: var(--theme-link-hover);
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-card {
    position: relative;
    display: grid;
    align-content: start;
    gap: 0.25rem;
    min-height: 4.5rem;
    text-align: left;
    cursor: pointer;
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
  }

  .status-card-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    text-align: left;
    width: fit-content;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
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
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
  }

  .control-secondary {
    background: var(--theme-control-secondary);
    color: var(--theme-control-secondary-text);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
  }

  .control-ghost {
    background: var(--theme-control-ghost-hover);
    color: var(--theme-text);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
  }

  .input-preview {
    display: grid;
    gap: 0.45rem;
    padding: 0.8rem;
    border-radius: var(--shell-radius-inner);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    background: var(--theme-input);
    color: var(--theme-text);
  }

  .input-preview input {
    background: var(--theme-input);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    color: var(--theme-text);
    cursor: pointer;
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
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
    padding: var(--fixture-control-pad-block) var(--fixture-control-pad-inline);
  }

  .border-sample-focus-ring {
    border-color: var(--preview-border-color, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--theme-focus-ring) 25%, transparent);
  }

  .overlay-demo {
    position: relative;
    margin-top: 0.9rem;
    min-height: 11rem;
    border-radius: var(--shell-radius-inner);
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
    border-radius: inherit;
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
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--fixture-control-radius);
  }

  @keyframes preview-target-hover-pulse {
    from {
      box-shadow:
        0 0 0 1px var(--preview-hover-ring-color),
        0 0 0 0.32rem color-mix(in srgb, var(--preview-hover-ring-soft) 92%, transparent),
        0 0.95rem 1.9rem -1.3rem color-mix(in srgb, var(--preview-hover-shadow) 88%, transparent);
    }

    to {
      box-shadow:
        0 0 0 1px var(--preview-hover-ring-color),
        0 0 0 0.56rem color-mix(in srgb, var(--preview-hover-ring-soft) 128%, transparent),
        0 1.3rem 2.45rem -1.05rem color-mix(in srgb, var(--preview-hover-shadow) 128%, transparent);
    }
  }
</style>
