export const DEFAULT_BRIDGE_URL = 'http://localhost:5173';
export const STORAGE_KEYS = {
  bridgeUrl: 'semanticColors.bridgeUrl',
  targetConfigPath: 'semanticColors.targetConfigPath',
  recentTargetConfigPaths: 'semanticColors.recentTargetConfigPaths'
} as const;

export const OVERRIDE_ATTR = 'data-semantic-colors-override';
export const HIGHLIGHT_ATTR = 'data-semantic-colors-highlight';
export const SELECTED_ATTR = 'data-semantic-colors-selected';
export const INSPECTOR_OVERLAY_ID = 'semantic-colors-inspector-overlay';
export const INSPECTOR_STYLE_ID = 'semantic-colors-inspector-style';
export const PREVIEW_STYLE_ID = 'semantic-colors-preview-style';
export const OVERRIDE_STYLE_ID = 'semantic-colors-override-style';
