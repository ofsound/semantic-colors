<script lang="ts">
  import WarningBadge from './WarningBadge.svelte';
  import { TOKEN_GROUP_ORDER, TOKENS_BY_GROUP } from '$lib/theme/schema';
  import { toCssColor } from '$lib/theme/color';
  import type { OklchColor, TokenId } from '$lib/theme/schema';

  let {
    selectedTokenId,
    currentColors,
    isSelectedUsage,
    hasWarnings,
    warningSummary,
    selectToken,
    tokenLabel
  }: {
    selectedTokenId: TokenId;
    currentColors: Record<TokenId, OklchColor>;
    isSelectedUsage: (tokenIds: TokenId[]) => boolean;
    hasWarnings: (tokenIds: TokenId[]) => boolean;
    warningSummary: (tokenIds: TokenId[]) => string;
    selectToken: (tokenId: TokenId) => void;
    tokenLabel: (tokenId: TokenId) => string;
  } = $props();
</script>

<article class="inventory">
  <div class="fixture-panel-header">
    <h3>Token inventory</h3>
    <span>Every shared token is visible and selectable here.</span>
  </div>

  {#each TOKEN_GROUP_ORDER as group (group)}
    <div class="inventory-group">
      <div class="inventory-group-header">
        <h4>{group}</h4>
        <span>{TOKENS_BY_GROUP[group].length} tokens</span>
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
    border: 1px solid var(--theme-border);
    border-radius: 1.25rem;
    padding: 1rem;
    background: var(--theme-surface);
    color: var(--theme-text);
  }

  .inventory {
    margin-top: 1rem;
  }

  .inventory-group + .inventory-group {
    margin-top: 1rem;
  }

  .inventory-group-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .inventory-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .inventory-card {
    display: grid;
    gap: 0.45rem;
    text-align: left;
    background: rgba(255, 255, 255, 0.04);
    color: var(--theme-text);
    border-color: var(--theme-border);
  }

  .inventory-swatch {
    height: 2.5rem;
    border-radius: 0.8rem;
    border: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent);
  }

  .inventory-title {
    font-weight: 700;
  }

  .inventory-card code {
    color: var(--theme-text-muted);
  }
</style>
