import type { BridgeSnapshot, ThemeMode } from '../shared/types';

export type ExtensionAuthoringPanelState = {
  snapshot: BridgeSnapshot | null;
  focusedTokenId: string;
  activeMode: ThemeMode;
};

export class ExtensionAuthoringState {
  snapshot = $state<BridgeSnapshot | null>(null);
  previewSnapshot = $state<BridgeSnapshot | null>(null);
  previewResetRevision = $state(0);
  focusedTokenId = $state('');
  activeMode = $state<ThemeMode>('light');

  update(nextState: ExtensionAuthoringPanelState): void {
    this.snapshot = nextState.snapshot;
    this.focusedTokenId = nextState.focusedTokenId;
    this.activeMode = nextState.activeMode;
  }

  setPreviewSnapshot(snapshot: BridgeSnapshot | null): void {
    this.previewSnapshot = snapshot;
  }

  clearPreviewSnapshot(): void {
    this.previewSnapshot = null;
    this.previewResetRevision += 1;
  }
}
