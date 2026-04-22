<script lang="ts">
  import WarningBadge from './WarningBadge.svelte';
  import { TOKEN_GROUP_ORDER, TOKENS_BY_GROUP } from '$lib/theme/schema';
  import { toCssColor } from '$lib/theme/color';
  import type { OklchColor, TokenId } from '$lib/theme/schema';

  let {
    selectedTokenId,
    currentColors,
    stageStyle,
    grayscalePreview,
    isSelectedUsage,
    hasWarnings,
    warningSummary,
    selectToken,
    tokenLabel
  }: {
    selectedTokenId: TokenId;
    currentColors: Record<TokenId, OklchColor>;
    stageStyle: string;
    grayscalePreview: boolean;
    isSelectedUsage: (tokenIds: TokenId[]) => boolean;
    hasWarnings: (tokenIds: TokenId[]) => boolean;
    warningSummary: (tokenIds: TokenId[]) => string;
    selectToken: (tokenId: TokenId) => void;
    tokenLabel: (tokenId: TokenId) => string;
  } = $props();
</script>

<article class="inventory" class:grayscale={grayscalePreview} style={stageStyle}>
  {#each TOKEN_GROUP_ORDER as group (group)}
    <div class="inventory-group">
      <div class="inventory-group-header">
        <h4>{group}</h4>
      </div>
      <div class="inventory-grid">
        {#each TOKENS_BY_GROUP[group] as tokenId (tokenId)}
          <button
            aria-pressed={selectedTokenId === tokenId}
            class:selected-usage={isSelectedUsage([tokenId])}
            class:warning={hasWarnings([tokenId])}
            class="inventory-card"
            onclick={() => selectToken(tokenId)}
            type="button"
          >
            <WarningBadge summary={warningSummary([tokenId])} visible={hasWarnings([tokenId])} />
            <span
              class="inventory-swatch"
              style={`background:${toCssColor(currentColors[tokenId])}`}
            ></span>
            <span class="inventory-title">{tokenLabel(tokenId)}</span>
            <code>{tokenId}</code>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</article>

<style>
  .inventory {
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--shell-radius-outer);
    padding: 1rem;
    background: var(--theme-app);
    color: var(--theme-text);
    transition:
      background-color 160ms ease,
      color 160ms ease,
      filter 160ms ease;
  }

  .inventory {
    margin-top: 1rem;
  }

  .inventory.grayscale {
    filter: grayscale(1);
  }

  .inventory-group-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 36px;
    margin-bottom: 0.75rem;
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    border-radius: var(--shell-radius-inner);
    padding: 0.6rem 0.7rem;
  }

  .inventory-card code {
    color: var(--theme-text-secondary);
  }

  .inventory-grid {
    grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
  }

  .inventory .inventory-card {
    display: grid;
    gap: 0.45rem;
    text-align: left;
    padding: 0.65rem 0.7rem;
    background: transparent;
    color: var(--theme-text);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    box-shadow: none;
  }

  .inventory .inventory-card:hover {
    background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  }

  .inventory .inventory-card:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--theme-accent) 72%, white);
    outline-offset: 2px;
  }

  .inventory-swatch {
    height: 2.5rem;
    border-radius: var(--shell-radius-inner);
    border: var(--preview-border-width, 0px) solid var(--preview-border-color, transparent);
    box-shadow: none;
  }

  .inventory .inventory-card.selected-usage {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent-strong) 20%, transparent);
  }

  .inventory-title {
    font-weight: 700;
  }
</style>
