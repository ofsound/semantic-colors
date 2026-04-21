import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { createDefaultManifest } from './defaults';
import { clampToDisplayable, cloneColor, normalizeHue, toCssColor, toRgbChannels } from './color';
import type { OklchColor, ThemeManifest, ThemeMode, ThemeToken, TokenId } from './schema';
import { ALL_TOKEN_IDS } from './schema';

export interface ResolvedTheme {
  mode: ThemeMode;
  colors: Record<TokenId, OklchColor>;
}

export interface TokenValidation {
  tokenId: TokenId;
  gamutAdjusted: boolean;
  contrastIssues: string[];
}

export interface ThemeValidation {
  perToken: Record<TokenId, TokenValidation>;
}

export function ensureManifest(manifest: ThemeManifest | null | undefined): ThemeManifest {
  if (!manifest) {
    return createDefaultManifest();
  }

  const fallback = createDefaultManifest();
  const tokens = { ...fallback.tokens, ...manifest.tokens };

  return {
    ...fallback,
    ...manifest,
    alt: {
      ...fallback.alt,
      ...manifest.alt,
      delta: {
        ...fallback.alt.delta,
        ...manifest.alt?.delta
      }
    },
    tokens
  };
}

function anchorFor(token: ThemeToken, source: 'light' | 'dark'): OklchColor {
  return source === 'light' ? token.light : token.dark;
}

function resolveAltToken(
  tokenId: TokenId,
  manifest: ThemeManifest,
  cache: Map<TokenId, OklchColor>
): OklchColor {
  const cached = cache.get(tokenId);
  if (cached) {
    return cached;
  }

  const token = manifest.tokens[tokenId];
  if (!token) {
    const fallback = createDefaultManifest().tokens[tokenId];
    cache.set(tokenId, fallback.dark);
    return fallback.dark;
  }

  const source = manifest.alt.source;
  const sourceColor = cloneColor(anchorFor(token, source));
  const altBehavior = token.exception.altBehavior;

  if (altBehavior === 'exclude' || altBehavior === 'pin' || token.group === 'status') {
    cache.set(tokenId, sourceColor);
    return sourceColor;
  }

  if (token.altParent) {
    const parent = resolveAltToken(token.altParent, manifest, cache);
    cache.set(tokenId, parent);
    return parent;
  }

  const shifted = clampToDisplayable(
    {
      l: sourceColor.l + manifest.alt.delta.l,
      c: sourceColor.c + manifest.alt.delta.c,
      h: normalizeHue(sourceColor.h + manifest.alt.delta.h),
      alpha: sourceColor.alpha
    },
    token.exception.maxChroma ?? undefined
  );

  cache.set(tokenId, shifted);
  return shifted;
}

export function resolveTheme(manifestInput: ThemeManifest, mode: ThemeMode): ResolvedTheme {
  const manifest = ensureManifest(manifestInput);
  const colors = {} as Record<TokenId, OklchColor>;
  const altCache = new Map<TokenId, OklchColor>();

  for (const tokenId of ALL_TOKEN_IDS) {
    const token = manifest.tokens[tokenId];
    if (!token) continue;
    colors[tokenId] =
      mode === 'alt'
        ? resolveAltToken(tokenId, manifest, altCache)
        : cloneColor(mode === 'light' ? token.light : token.dark);
  }

  return { mode, colors };
}

function contrastIssue(text: OklchColor, background: OklchColor, label: string): string | null {
  const contrast = Math.abs(
    APCAcontrast(sRGBtoY(toRgbChannels(text)), sRGBtoY(toRgbChannels(background)))
  );
  if (contrast >= 60) {
    return null;
  }
  return `${label} contrast is ${contrast.toFixed(1)}Lc`;
}

const CONTRAST_PAIRS: Array<[TokenId, TokenId, string]> = [
  ['text', 'surface', 'Body text on surface'],
  ['text-secondary', 'surface-muted', 'Secondary text on muted surface'],
  ['text-inverse', 'accent-strong', 'Inverse text on accent strong'],
  ['control-primary-text', 'control-primary', 'Primary control text'],
  ['control-secondary-text', 'control-secondary', 'Secondary control text'],
  ['input-placeholder', 'input', 'Input placeholder'],
  ['success', 'success-surface', 'Success text'],
  ['warning', 'warning-surface', 'Warning text'],
  ['danger', 'danger-surface', 'Danger text'],
  ['info', 'info-surface', 'Info text']
];

export function validateManifest(manifestInput: ThemeManifest): Record<ThemeMode, ThemeValidation> {
  const manifest = ensureManifest(manifestInput);
  const validations = {
    light: createValidationShell(),
    dark: createValidationShell(),
    alt: createValidationShell()
  } as Record<ThemeMode, ThemeValidation>;

  for (const mode of ['light', 'dark', 'alt'] as const) {
    const resolved = resolveTheme(manifest, mode);

    for (const tokenId of ALL_TOKEN_IDS) {
      const base =
        mode === 'alt'
          ? anchorFor(manifest.tokens[tokenId], manifest.alt.source)
          : anchorFor(manifest.tokens[tokenId], mode);
      const resolvedColor = resolved.colors[tokenId];
      const gamutAdjusted =
        Math.abs(base.c - resolvedColor.c) > 0.002 ||
        Math.abs(base.l - resolvedColor.l) > 0.002 ||
        Math.abs(base.h - resolvedColor.h) > 0.5;

      validations[mode].perToken[tokenId] = {
        tokenId,
        gamutAdjusted,
        contrastIssues: []
      };
    }

    for (const [foregroundId, backgroundId, label] of CONTRAST_PAIRS) {
      const issue = contrastIssue(
        resolved.colors[foregroundId],
        resolved.colors[backgroundId],
        label
      );
      if (issue) {
        validations[mode].perToken[foregroundId].contrastIssues.push(issue);
        validations[mode].perToken[backgroundId].contrastIssues.push(issue);
      }
    }
  }

  return validations;
}

function createValidationShell(): ThemeValidation {
  const perToken = {} as Record<TokenId, TokenValidation>;
  for (const tokenId of ALL_TOKEN_IDS) {
    perToken[tokenId] = {
      tokenId,
      gamutAdjusted: false,
      contrastIssues: []
    };
  }
  return { perToken };
}

export function summarizeTokenValidation(validation: TokenValidation): string[] {
  const notes: string[] = [];
  if (validation.gamutAdjusted) {
    notes.push('Chroma was clamped to stay displayable.');
  }
  notes.push(...validation.contrastIssues);
  return notes;
}

export function themeCssVariables(resolved: ResolvedTheme): string {
  return ALL_TOKEN_IDS.map(
    (tokenId) => `  --theme-${tokenId}: ${toCssColor(resolved.colors[tokenId])};`
  ).join('\n');
}
