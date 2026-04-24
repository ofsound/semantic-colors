<script lang="ts">
  import ModeControls from '$lib/components/semantic-colors/ModeControls.svelte';
  import { updateAltSettings } from '../shared/draft';
  import type { BridgeDraftCommand, BridgeSnapshot, ThemeMode } from '../shared/types';
  import type { AltSettings, ThemeManifest } from '$lib/theme/schema';

  let {
    activeMode,
    onApplyDraft,
    onError,
    onPreviewManifestChange,
    onSetTheme,
    snapshot
  }: {
    activeMode: ThemeMode;
    onApplyDraft: (commands: BridgeDraftCommand[]) => Promise<void>;
    onError: (message: string) => void;
    onPreviewManifestChange: (manifest: BridgeSnapshot['manifest']) => void;
    onSetTheme: (mode: ThemeMode) => void;
    snapshot: BridgeSnapshot;
  } = $props();

  // svelte-ignore state_referenced_locally
  // `snapshot.manifest` can be a Svelte deep-reactive Proxy; structuredClone throws DataCloneError on proxies.
  let manifest = $state(JSON.parse(JSON.stringify(snapshot.manifest)) as ThemeManifest);

  function sameDelta(a: AltSettings['delta'], b: AltSettings['delta']): boolean {
    return a.l === b.l && a.c === b.c && a.h === b.h;
  }

  async function persistAltChanges(): Promise<void> {
    const before = snapshot.manifest.alt;
    const after = manifest.alt;
    const patch: Extract<BridgeDraftCommand, { kind: 'update-alt-settings' }>['patch'] = {};

    if (before.source !== after.source) {
      patch.source = after.source;
    }
    if (before.harmonyLock !== after.harmonyLock) {
      patch.harmonyLock = after.harmonyLock;
    }
    if (!sameDelta(before.delta, after.delta)) {
      patch.delta = {};
      if (before.delta.l !== after.delta.l) {
        patch.delta.l = after.delta.l;
      }
      if (before.delta.c !== after.delta.c) {
        patch.delta.c = after.delta.c;
      }
      if (before.delta.h !== after.delta.h) {
        patch.delta.h = after.delta.h;
      }
    }

    if (!patch.source && patch.harmonyLock === undefined && !patch.delta) {
      return;
    }

    try {
      await onApplyDraft([updateAltSettings(patch)]);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'alt update failed');
    }
  }

  function handlePersistChange(): void {
    void persistAltChanges();
  }

  function activateAltPreview(): void {
    onSetTheme('alt');
  }

  function handlePreviewChange(): void {
    onPreviewManifestChange($state.snapshot(manifest) as BridgeSnapshot['manifest']);
  }

  function updateAltDelta(channel: 'l' | 'c' | 'h', value: number): void {
    manifest.alt.delta[channel] = value;
  }
</script>

<ModeControls
  bind:manifest
  onActivateAltPreview={activateAltPreview}
  onPersistChange={handlePersistChange}
  onPreviewChange={handlePreviewChange}
  {activeMode}
  {updateAltDelta}
/>
