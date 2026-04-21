<script lang="ts">
  import { ALL_TOKEN_IDS } from '$lib/theme/schema';
  import { toCssColor } from '$lib/theme/color';
  import type { ImportProposal, ProjectConfig, TokenId } from '$lib/theme/schema';

  let {
    config = $bindable(),
    importProposal,
    importSelection = $bindable(),
    isImporting,
    onPersistChange,
    tokenLabel,
    runImport,
    applyImportReview,
    confirmResetManifest
  }: {
    config: ProjectConfig;
    importProposal: ImportProposal | null;
    importSelection: Record<string, TokenId | ''>;
    isImporting: boolean;
    onPersistChange: () => void;
    tokenLabel: (tokenId: TokenId) => string;
    runImport: () => void | Promise<void>;
    applyImportReview: () => void;
    confirmResetManifest: () => void;
  } = $props();
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="eyebrow">Import and migration</p>
      <h2>CSS review queue</h2>
    </div>
    <button class="ghost-button" onclick={confirmResetManifest} type="button">Reset manifest</button
    >
  </div>

  <label class="field-block">
    <span>Source CSS path</span>
    <input
      bind:value={config.importSourcePath}
      oninput={onPersistChange}
      placeholder="../project/src/app.css"
    />
  </label>

  <div class="action-row">
    <button disabled={isImporting || !config.importSourcePath} onclick={runImport} type="button">
      {isImporting ? 'Importing...' : 'Scan CSS variables'}
    </button>
    {#if importProposal}
      <button class="secondary-button" onclick={applyImportReview} type="button">
        Apply reviewed mappings
      </button>
    {/if}
  </div>

  {#if importProposal}
    <div class="review-queue">
      {#each importProposal.candidates as candidate (candidate.sourceName)}
        <article class="review-card">
          <div>
            <strong>--{candidate.sourceName}</strong>
            <p>{candidate.rawValue}</p>
            <small>{candidate.reason}</small>
          </div>
          <select bind:value={importSelection[candidate.sourceName]}>
            <option value="">Skip mapping</option>
            {#each ALL_TOKEN_IDS as tokenId (tokenId)}
              <option value={tokenId}>{tokenLabel(tokenId)}</option>
            {/each}
          </select>
          <div class="review-swatches">
            <span
              class="mini-swatch"
              style={`background:${candidate.light ? toCssColor(candidate.light) : 'transparent'}`}
            >
              L
            </span>
            <span
              class="mini-swatch"
              style={`background:${candidate.dark ? toCssColor(candidate.dark) : 'transparent'}`}
            >
              D
            </span>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="empty-state">
      Add a source CSS file to scan your current variables, then review the suggested token mappings
      here before applying them.
    </p>
  {/if}
</section>

<style>
  .review-queue {
    display: grid;
    gap: 0.75rem;
  }

  .review-card {
    display: grid;
    gap: 0.75rem;
    padding: 0.8rem;
    border-radius: 1rem;
    background: rgba(15, 23, 42, 0.04);
    grid-template-columns: 1.3fr 1fr auto;
    align-items: center;
  }

  .review-card p {
    margin-top: 0.25rem;
    color: #4b5563;
    font-size: 0.82rem;
  }

  .review-swatches {
    display: flex;
    gap: 0.4rem;
  }

  .mini-swatch {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.7rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
    font-size: 0.7rem;
    font-weight: 700;
  }
</style>
