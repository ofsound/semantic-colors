import { generateThemeCss } from '$lib/theme/css';
import { toCssColor } from '$lib/theme/color';
import { ensureManifest, resolveTheme, validateManifest } from '$lib/theme/engine';
import { ALL_TOKEN_IDS, TOKEN_GROUP_ORDER, TOKENS_BY_GROUP } from '$lib/theme/schema';
import type { ResolvedTheme } from '$lib/theme/engine';
import type { OklchColor, ThemeManifest, ThemeMode } from '$lib/theme/schema';
import type { BridgeSnapshot, ResolvedThemePayload } from './types';

function buildResolvedPayload(manifest: ThemeManifest, mode: ThemeMode): ResolvedThemePayload {
  const resolved: ResolvedTheme = resolveTheme(manifest, mode);
  const colors = {} as Record<string, OklchColor & { css: string }>;
  const cssVariables: Record<string, string> = {};

  for (const tokenId of ALL_TOKEN_IDS) {
    const color = resolved.colors[tokenId];
    const css = toCssColor(color);
    colors[tokenId] = { ...color, css };
    cssVariables[`--theme-${tokenId}`] = css;
  }

  return { mode, colors, cssVariables };
}

export function buildPreviewSnapshot(
  baseSnapshot: BridgeSnapshot,
  manifestInput: BridgeSnapshot['manifest']
): BridgeSnapshot {
  const manifest = ensureManifest(manifestInput as ThemeManifest);

  return {
    ...baseSnapshot,
    updatedAt: new Date().toISOString(),
    origin: 'extension',
    manifest: manifest as BridgeSnapshot['manifest'],
    resolved: {
      light: buildResolvedPayload(manifest, 'light'),
      dark: buildResolvedPayload(manifest, 'dark'),
      alt: buildResolvedPayload(manifest, 'alt')
    },
    css: generateThemeCss(manifest),
    tokenGroups: TOKEN_GROUP_ORDER as unknown as string[],
    tokensByGroup: TOKENS_BY_GROUP as unknown as Record<string, string[]>,
    validations: validateManifest(manifest) as unknown as BridgeSnapshot['validations']
  };
}
