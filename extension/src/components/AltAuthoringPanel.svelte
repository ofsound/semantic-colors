<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import AltAuthoringEditor from './AltAuthoringEditor.svelte';
  import type { ExtensionAuthoringState } from './authoring-state.svelte';
  import type { BridgeDraftCommand, ThemeMode } from '../shared/types';

  let {
    authoring,
    onApplyDraft,
    onSetTheme,
    onError
  }: {
    authoring: ExtensionAuthoringState;
    onApplyDraft: (commands: BridgeDraftCommand[]) => Promise<void>;
    onSetTheme: (mode: ThemeMode) => void;
    onError: (message: string) => void;
  } = $props();

  const snapshot = $derived(authoring.snapshot);
  const activeMode = $derived(authoring.activeMode);
</script>

<div class="semantic-colors-app extension-authoring">
  {#if !snapshot}
    <Card.Root
      class="gap-4 border-0 bg-[color:var(--shell-panel-bg)] py-4 shadow-none ring-0 backdrop-blur-md"
    >
      <Card.Content class="px-4">
        <p class="empty-state">Connect to the engine to edit Alt settings.</p>
      </Card.Content>
    </Card.Root>
  {:else}
    {#key snapshot.version}
      <AltAuthoringEditor {activeMode} {onApplyDraft} {onError} {onSetTheme} {snapshot} />
    {/key}
  {/if}
</div>
