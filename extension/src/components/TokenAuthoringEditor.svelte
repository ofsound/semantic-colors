<script lang="ts">
  import TokenEditor from '$lib/components/semantic-colors/TokenEditor.svelte';
  import { updateTokenColor, updateTokenException, validationNotes } from '../shared/draft';
  import type { BridgeDraftCommand, BridgeSnapshot, OklchColor, ThemeMode } from '../shared/types';
  import type { ThemeManifest, TokenException, TokenId } from '$lib/theme/schema';

  let {
    activeMode,
    onApplyDraft,
    onError,
    onSetTheme,
    selectedTokenId,
    snapshot
  }: {
    activeMode: ThemeMode;
    onApplyDraft: (commands: BridgeDraftCommand[]) => Promise<void>;
    onError: (message: string) => void;
    onSetTheme: (mode: ThemeMode) => void;
    selectedTokenId: string;
    snapshot: BridgeSnapshot;
  } = $props();

  // svelte-ignore state_referenced_locally
  let manifest = $state(structuredClone(snapshot.manifest) as ThemeManifest);

  const typedSelectedTokenId = $derived(selectedTokenId as TokenId);
  const currentTokenAlt = $derived<OklchColor>(snapshot.resolved.alt.colors[typedSelectedTokenId]);
  const selectedTokenNotes = $derived<string[]>(
    validationNotes(snapshot, typedSelectedTokenId, activeMode)
  );

  function sameColor(a: OklchColor, b: OklchColor): boolean {
    return a.l === b.l && a.c === b.c && a.h === b.h && (a.alpha ?? 1) === (b.alpha ?? 1);
  }

  function normalizedMaxChroma(value: TokenException['maxChroma']): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function sameException(a: TokenException, b: TokenException): boolean {
    return (
      a.altBehavior === b.altBehavior &&
      normalizedMaxChroma(a.maxChroma) === normalizedMaxChroma(b.maxChroma)
    );
  }

  async function persistTokenChanges(): Promise<void> {
    const before = snapshot.manifest.tokens[typedSelectedTokenId];
    const after = manifest.tokens[typedSelectedTokenId];
    if (!before || !after) {
      return;
    }

    const commands: BridgeDraftCommand[] = [];
    if (!sameColor(before.light, after.light)) {
      commands.push(updateTokenColor(typedSelectedTokenId, 'light', after.light));
    }
    if (!sameColor(before.dark, after.dark)) {
      commands.push(updateTokenColor(typedSelectedTokenId, 'dark', after.dark));
    }
    if (!sameException(before.exception, after.exception)) {
      commands.push(
        updateTokenException(typedSelectedTokenId, {
          altBehavior: after.exception.altBehavior,
          maxChroma: normalizedMaxChroma(after.exception.maxChroma)
        })
      );
    }

    if (commands.length === 0) {
      return;
    }

    try {
      await onApplyDraft(commands);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'token update failed');
    }
  }

  function handlePersistChange(): void {
    void persistTokenChanges();
  }

  function handleSetTheme(mode: ThemeMode): void {
    onSetTheme(mode);
  }
</script>

<TokenEditor
  bind:manifest
  {activeMode}
  {currentTokenAlt}
  onPersistChange={handlePersistChange}
  selectedTokenId={typedSelectedTokenId}
  {selectedTokenNotes}
  setTheme={handleSetTheme}
  tokenLabel={(tokenId) => manifest.tokens[tokenId]?.label ?? tokenId}
/>
