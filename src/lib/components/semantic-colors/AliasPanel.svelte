<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
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

  const tokenOptions = $derived.by(() =>
    ALL_TOKEN_IDS.map((tokenId) => ({ value: tokenId, label: tokenLabel(tokenId) }))
  );
</script>

<Card.Root
  class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
>
  <Card.Header class="gap-3 px-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <Card.Title>Project-specific names</Card.Title>
      </div>
      <Button onclick={addAlias} size="sm" variant="outline">Add alias</Button>
    </div>
  </Card.Header>

  <Card.Content class="px-4">
    {#if manifest.aliases.length === 0}
      <p class="empty-state mt-0 rounded-xl bg-slate-900/4 px-4 py-4 text-sm">
        No project aliases yet. Add aliases when you need local CSS variable names mapped to the
        shared semantic tokens.
      </p>
    {:else}
      <div class="grid gap-3">
        {#each manifest.aliases as alias, index (`${alias.name}-${index}`)}
          <div
            class="grid gap-3 rounded-xl bg-slate-900/4 p-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center"
          >
            <Input
              value={alias.name}
              oninput={(event) =>
                updateAlias(index, { name: (event.currentTarget as HTMLInputElement).value })}
            />
            <ShellSelect
              options={tokenOptions}
              placeholder="Choose token"
              onChange={() => updateAlias(index, { tokenId: alias.tokenId })}
              bind:value={alias.tokenId}
            />
            <Button onclick={() => removeAlias(index)} variant="ghost">Remove</Button>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
