import {
  ensureManifest,
  resolveTheme,
  summarizeTokenValidation,
  themeCssVariables
} from '$lib/theme/engine';
import type { TokenValidation } from '$lib/theme/engine';
import type { BridgeSnapshot } from '$lib/server/bridge-state';
import type { ThemeMode, TokenId } from '$lib/theme/schema';

const CHROME_THEME_STYLE_ID = 'semantic-colors-inpage-root-theme';
export const INPAGE_HOST_FONT_VAR = '--semantic-colors-host-font';

/**
 * In-page preview iframe: match the top document’s primary font (passed from the content
 * script). When empty, the drawer falls back to its system UI stack in CSS.
 */
export function applyInpageHostFontFamily(
  doc: Document,
  hostPageFontFamily: string | null | undefined
): void {
  const text = (hostPageFontFamily ?? '').trim();
  if (text) {
    doc.documentElement.style.setProperty(INPAGE_HOST_FONT_VAR, text);
  } else {
    doc.documentElement.style.removeProperty(INPAGE_HOST_FONT_VAR);
  }
}

/**
 * Drives the DevTools in-page preview iframe shell (body, header) so
 * `var(--theme-*)` matches the bridge snapshot, mirroring the former drawer
 * :root injection.
 */
export function applyInpageRootTheme(
  doc: Document,
  snapshot: BridgeSnapshot | null,
  mode: ThemeMode
): void {
  let el = doc.getElementById(CHROME_THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = CHROME_THEME_STYLE_ID;
    doc.head.appendChild(el);
  }
  doc.documentElement.dataset.theme = mode;
  if (!snapshot) {
    el.textContent = '';
    return;
  }
  const resolved = snapshot.resolved[mode];
  if (!resolved) {
    el.textContent = '';
    return;
  }
  const declarations = Object.entries(resolved.colors)
    .map(
      ([tokenId, payload]) =>
        `  --theme-${tokenId}: ${payload.css};\n  --color-${tokenId}: ${payload.css};`
    )
    .join('\n');
  const aliases = snapshot.manifest.aliases
    .map((alias) => `  --${alias.name.replace(/^--/, '')}: var(--color-${alias.tokenId});`)
    .join('\n');
  el.textContent = `:root {\n${declarations}\n${aliases}\n}`;
}

/**
 * Prop bag for `FixtureStage` (except `selectToken`, which the embed wires to
 * iframe postMessage). Reuses the same validation and CSS pipeline as the app.
 */
export function buildFixtureStagePropsFromBridge(
  snapshot: BridgeSnapshot,
  mode: ThemeMode,
  focusedTokenId: TokenId
) {
  const manifest = ensureManifest(snapshot.manifest);
  const resolved = resolveTheme(manifest, mode);
  const perToken = snapshot.validations[mode].perToken;

  const baseVars = themeCssVariables(resolved);
  const stageStyle = `${baseVars}
  --preview-border-color: transparent;
  --preview-border-width: 1px;
`;

  const hasWarnings = (tokenIds: TokenId[]) =>
    tokenIds.some((t) => {
      const v = perToken[t];
      if (!v) return false;
      return summarizeTokenValidation(v as TokenValidation).length > 0;
    });

  const warningSummary = (tokenIds: TokenId[]): string => {
    const notes = [
      ...new Set(
        tokenIds.flatMap((t) => {
          const v = perToken[t];
          if (!v) return [];
          return summarizeTokenValidation(v as TokenValidation);
        })
      )
    ];
    if (notes.length === 0) return 'No validation warnings.';
    return `${notes.length} validation warning${notes.length === 1 ? '' : 's'}: ${notes.join(' ')}`;
  };

  const isSelectedUsage = (tokenIds: TokenId[]) => tokenIds.includes(focusedTokenId);

  const tokenLabel = (id: TokenId) => manifest.tokens[id]?.label ?? id;

  return {
    activeMode: mode,
    selectedTokenId: focusedTokenId,
    grayscalePreview: manifest.alt.grayscalePreview,
    stageStyle,
    saveState: 'idle' as const,
    saveMessage: '',
    hasWarnings,
    isSelectedUsage,
    warningSummary,
    tokenLabel
  };
}
