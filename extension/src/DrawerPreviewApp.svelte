<script lang="ts">
  import { onMount } from 'svelte';

  import FixtureStage from '$lib/components/semantic-colors/FixtureStage.svelte';

  import {
    applyInpageHostFontFamily,
    applyInpageRootTheme,
    buildFixtureStagePropsFromBridge
  } from '$lib/semantic-colors/inpage-fixture-bridge';
  import type { ThemeMode, TokenId } from '$lib/theme/schema';

  import {
    parseInPageDrawerToFrameMessage,
    toInPageDrawerEnvelope
  } from './shared/inpage-drawer-messaging';
  import type { BridgeSnapshot } from './shared/types';

  import '$lib/styles/semantic-colors-shell.css';

  let snapshot = $state<BridgeSnapshot | null>(null);
  let mode = $state<ThemeMode>('light');
  let focusedTokenId = $state<TokenId | null>(null);
  let hostPageFontFamily = $state('');

  const effectiveToken = $derived((focusedTokenId ?? 'surface') as TokenId);

  const fixtureProps = $derived(
    snapshot ? buildFixtureStagePropsFromBridge(snapshot, mode, effectiveToken) : null
  );

  function syncRootTheme(): void {
    applyInpageRootTheme(document, snapshot, mode);
    applyInpageHostFontFamily(document, hostPageFontFamily);
  }

  function selectToken(tokenId: TokenId): void {
    focusedTokenId = tokenId;
    window.parent.postMessage(
      toInPageDrawerEnvelope({ kind: 'token:focus', tokenId, source: 'preview' }),
      '*'
    );
  }

  onMount(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const m = parseInPageDrawerToFrameMessage(event.data);
      if (!m) return;
      switch (m.kind) {
        case 'snapshot:update':
          snapshot = m.snapshot;
          mode = m.mode;
          hostPageFontFamily = m.hostPageFontFamily;
          focusedTokenId = m.focusedTokenId ? (m.focusedTokenId as TokenId) : null;
          syncRootTheme();
          break;
        case 'mode:update':
          mode = m.mode;
          syncRootTheme();
          break;
        case 'token:highlight':
          break;
        case 'token:focus':
          focusedTokenId = m.tokenId ? (m.tokenId as TokenId) : null;
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });
</script>

<div class="semantic-colors-app drawer-preview-app">
  {#if fixtureProps}
    <FixtureStage {...fixtureProps} {selectToken} />
  {:else}
    <p class="empty-state">Connect from the DevTools panel to render semantic previews.</p>
  {/if}
</div>
