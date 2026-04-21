<script lang="ts">
  import { ALL_TOKEN_IDS } from '$lib/theme/schema';
  import type { LocalAlias, ThemeManifest, TokenId } from '$lib/theme/schema';

  let {
    manifest,
    tokenLabel,
    addAlias,
    removeAlias,
    updateAlias
  }: {
    manifest: ThemeManifest;
    tokenLabel: (tokenId: TokenId) => string;
    addAlias: () => void;
    removeAlias: (index: number) => void;
    updateAlias: (index: number, patch: Partial<LocalAlias>) => void;
  } = $props();
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="eyebrow">Local aliases</p>
      <h2>Project-specific names</h2>
    </div>
    <button class="ghost-button" onclick={addAlias} type="button">Add alias</button>
  </div>

  <div class="alias-list">
    {#if manifest.aliases.length === 0}
      <p class="empty-state">
        No project aliases yet. Add aliases when you need local CSS variable names mapped to the
        shared semantic tokens.
      </p>
    {:else}
      {#each manifest.aliases as alias, index (`${alias.name}-${index}`)}
        <div class="alias-row">
          <input
            value={alias.name}
            oninput={(event) =>
              updateAlias(index, { name: (event.currentTarget as HTMLInputElement).value })}
          />
          <select
            value={alias.tokenId}
            oninput={(event) =>
              updateAlias(index, {
                tokenId: (event.currentTarget as HTMLSelectElement).value as TokenId
              })}
          >
            {#each ALL_TOKEN_IDS as tokenId (tokenId)}
              <option value={tokenId}>{tokenLabel(tokenId)}</option>
            {/each}
          </select>
          <button class="ghost-button" onclick={() => removeAlias(index)} type="button"
            >Remove</button
          >
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .alias-list {
    display: grid;
    gap: 0.75rem;
  }

  .alias-row {
    display: grid;
    gap: 0.75rem;
    padding: 0.8rem;
    border-radius: 1rem;
    background: rgba(15, 23, 42, 0.04);
    grid-template-columns: 1.4fr 1fr auto;
    align-items: center;
  }
</style>
