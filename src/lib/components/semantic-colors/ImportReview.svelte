<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
  import { toCssColor } from '$lib/theme/color';
  import { ALL_TOKEN_IDS } from '$lib/theme/schema';
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

  const tokenOptions = $derived.by(() => [
    { value: '', label: 'Skip mapping' },
    ...ALL_TOKEN_IDS.map((tokenId) => ({ value: tokenId, label: tokenLabel(tokenId) }))
  ]);
</script>

<Card.Root
  class="gap-4 border border-[color:var(--shell-border)] bg-[color:var(--shell-panel-bg)] py-4 shadow-[var(--shell-shadow)] backdrop-blur-md"
>
  <Card.Header class="gap-3 px-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="eyebrow">Import and migration</p>
        <Card.Title>CSS review queue</Card.Title>
      </div>
      <Button onclick={confirmResetManifest} size="sm" variant="ghost">Reset manifest</Button>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4 px-4">
    <label class="grid gap-2 text-sm font-medium text-slate-700">
      <span>Source CSS path</span>
      <Input
        bind:value={config.importSourcePath}
        oninput={onPersistChange}
        placeholder="../project/src/app.css"
      />
    </label>

    <div class="flex flex-wrap gap-2">
      <Button disabled={isImporting || !config.importSourcePath} onclick={runImport}>
        {isImporting ? 'Importing...' : 'Scan CSS variables'}
      </Button>
      {#if importProposal}
        <Button onclick={applyImportReview} variant="secondary">Apply reviewed mappings</Button>
      {/if}
    </div>

    {#if importProposal}
      <div class="grid gap-3">
        {#each importProposal.candidates as candidate (candidate.sourceName)}
          <article
            class="grid gap-3 rounded-xl bg-slate-900/4 p-3 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center"
          >
            <div class="min-w-0 space-y-1">
              <strong class="block truncate text-sm text-slate-900">--{candidate.sourceName}</strong
              >
              <p class="text-sm text-slate-600">{candidate.rawValue}</p>
              <small class="text-xs leading-5 text-slate-500">{candidate.reason}</small>
            </div>
            <ShellSelect
              bind:value={importSelection[candidate.sourceName]}
              options={tokenOptions}
              placeholder="Skip mapping"
            />
            <div class="flex gap-2">
              <span
                class="inline-grid h-8 w-8 place-items-center rounded-md border border-slate-900/12 text-[0.7rem] font-bold"
                style={`background:${candidate.light ? toCssColor(candidate.light) : 'transparent'}`}
              >
                L
              </span>
              <span
                class="inline-grid h-8 w-8 place-items-center rounded-md border border-slate-900/12 text-[0.7rem] font-bold"
                style={`background:${candidate.dark ? toCssColor(candidate.dark) : 'transparent'}`}
              >
                D
              </span>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <p class="empty-state mt-0 rounded-xl bg-slate-900/4 px-4 py-4 text-sm">
        Add a source CSS file to scan your current variables, then review the suggested token
        mappings here before applying them.
      </p>
    {/if}
  </Card.Content>
</Card.Root>
