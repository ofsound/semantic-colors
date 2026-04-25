<script lang="ts">
  import type { Snippet } from 'svelte';

  import WarningBadge from './WarningBadge.svelte';
  import type { TokenId } from '$lib/theme/schema';

  let {
    children,
    class: className = '',
    hasWarnings,
    isSelectedUsage,
    selectToken,
    selectedTokenId,
    tokenId,
    tokenIds,
    warningSummary
  }: {
    children?: Snippet;
    class?: string;
    hasWarnings: (tokenIds: TokenId[]) => boolean;
    isSelectedUsage: (tokenIds: TokenId[]) => boolean;
    selectToken: (tokenId: TokenId) => void;
    selectedTokenId: TokenId;
    tokenId: TokenId;
    tokenIds: TokenId[];
    warningSummary: (tokenIds: TokenId[]) => string;
  } = $props();

  const warningVisible = $derived(hasWarnings(tokenIds));
</script>

<button
  aria-pressed={selectedTokenId === tokenId}
  class={className}
  class:selected-usage={isSelectedUsage(tokenIds)}
  class:warning={warningVisible}
  onclick={() => selectToken(tokenId)}
  type="button"
>
  <WarningBadge summary={warningSummary(tokenIds)} visible={warningVisible} />
  {@render children?.()}
</button>
