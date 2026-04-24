import type { BridgeSnapshot, OklchColor, ThemeMode } from '../shared/types';

export type ExtensionOverrideColorPanelState = {
  snapshot: BridgeSnapshot | null;
  tokenId: string;
  color: OklchColor;
  activeMode: ThemeMode;
  overrideMode: 'light' | 'dark' | 'both';
  persistOverride: boolean;
};

export class ExtensionOverrideColorState {
  snapshot = $state<BridgeSnapshot | null>(null);
  tokenId = $state('');
  color = $state<OklchColor>({ l: 0.5, c: 0.1, h: 240, alpha: 1 });
  activeMode = $state<ThemeMode>('light');
  overrideMode = $state<'light' | 'dark' | 'both'>('both');
  persistOverride = $state(false);

  update(nextState: ExtensionOverrideColorPanelState): void {
    this.snapshot = nextState.snapshot;
    this.tokenId = nextState.tokenId;
    this.color = { ...nextState.color };
    this.activeMode = nextState.activeMode;
    this.overrideMode = nextState.overrideMode;
    this.persistOverride = nextState.persistOverride;
  }
}
