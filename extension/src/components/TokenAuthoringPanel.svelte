<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import ShellSelect from '$lib/components/semantic-colors/ShellSelect.svelte';
  import TokenAuthoringEditor from './TokenAuthoringEditor.svelte';
  import type { ExtensionAuthoringState } from './authoring-state.svelte';
  import type { BridgeDraftCommand, BridgeSnapshot, ThemeMode } from '../shared/types';

  type TokenOption = {
    value: string;
    label: string;
  };

  let {
    authoring,
    onApplyDraft,
    onFocusToken,
    onPreviewManifestChange,
    onSetTheme,
    onError
  }: {
    authoring: ExtensionAuthoringState;
    onApplyDraft: (commands: BridgeDraftCommand[]) => Promise<void>;
    onFocusToken: (tokenId: string) => void;
    onPreviewManifestChange: (manifest: BridgeSnapshot['manifest']) => void;
    onSetTheme: (mode: ThemeMode) => void;
    onError: (message: string) => void;
  } = $props();

  const snapshot = $derived(authoring.snapshot);
  const previewSnapshot = $derived(authoring.previewSnapshot);
  const displaySnapshot = $derived(previewSnapshot ?? snapshot);
  const activeMode = $derived(authoring.activeMode);
  const tokenOptions = $derived<TokenOption[]>(
    displaySnapshot
      ? Object.values(displaySnapshot.manifest.tokens).map((token) => ({
          value: token.id,
          label: `${token.label} (${token.id})`
        }))
      : []
  );
  const selectedTokenValue = $derived(
    getSelectedTokenValue(displaySnapshot, authoring.focusedTokenId)
  );

  function handleTokenChange(tokenId: string): void {
    onFocusToken(tokenId);
  }

  function getSelectedTokenValue(value: BridgeSnapshot | null, focusedTokenId: string): string {
    if (!value) {
      return '';
    }

    return focusedTokenId && focusedTokenId in value.manifest.tokens
      ? focusedTokenId
      : (Object.keys(value.manifest.tokens)[0] ?? '');
  }
</script>

<div class="semantic-colors-app extension-authoring">
  {#if !snapshot || !displaySnapshot || !selectedTokenValue}
    <Card.Root
      class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Content class="px-4">
        <p class="empty-state">Connect to the engine to edit tokens.</p>
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root
      class="mb-3 gap-3 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Header class="gap-0 px-4">
        <Card.Title>Focused token</Card.Title>
      </Card.Header>
      <Card.Content class="px-4">
        <label
          class="grid gap-2 text-sm font-medium text-[color:var(--shell-color-text-secondary)]"
        >
          <span>Token</span>
          <ShellSelect
            value={selectedTokenValue}
            options={tokenOptions}
            placeholder="Choose token"
            onChange={handleTokenChange}
          />
        </label>
      </Card.Content>
    </Card.Root>

    {#key `${snapshot.version}:${selectedTokenValue}:${authoring.previewResetRevision}`}
      <TokenAuthoringEditor
        {activeMode}
        {onApplyDraft}
        {onError}
        {onSetTheme}
        selectedTokenId={selectedTokenValue}
        baseSnapshot={snapshot}
        snapshot={displaySnapshot}
        {onPreviewManifestChange}
      />
    {/key}
  {/if}
</div>
