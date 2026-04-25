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

function isHarmonyLockedToken(token: ThemeToken, manifest: ThemeManifest): boolean {
  return (
    manifest.alt.harmonyLock &&
    token.exception.altBehavior === 'derive' &&
    token.group !== 'status' &&
    !token.altParent &&
    Boolean(token.harmonyGroup)
  );
}

function resolveShiftedAltColor(token: ThemeToken, manifest: ThemeManifest): OklchColor {
  const sourceColor = cloneColor(anchorFor(token, manifest.alt.source));

  return clampToDisplayable(
    {
      l: sourceColor.l + manifest.alt.delta.l,
      c: sourceColor.c + manifest.alt.delta.c,
      h: normalizeHue(sourceColor.h + manifest.alt.delta.h),
      alpha: sourceColor.alpha
    },
    token.exception.maxChroma ?? undefined
  );
}

function resolveHarmonyLeaderId(
  harmonyGroup: string,
  manifest: ThemeManifest,
  groupLeaderCache: Partial<Record<string, TokenId | null>>
): TokenId | null {
  if (harmonyGroup in groupLeaderCache) {
    return groupLeaderCache[harmonyGroup] ?? null;
  }

  const preferredLeaderId = ALL_TOKEN_IDS.find((candidateId) => candidateId === harmonyGroup);
  if (preferredLeaderId) {
    const preferredLeader = manifest.tokens[preferredLeaderId];
    if (
      preferredLeader &&
      preferredLeader.harmonyGroup === harmonyGroup &&
      isHarmonyLockedToken(preferredLeader, manifest)
    ) {
      groupLeaderCache[harmonyGroup] = preferredLeaderId;
      return preferredLeaderId;
    }
  }

  for (const tokenId of ALL_TOKEN_IDS) {
    const candidate = manifest.tokens[tokenId];
    if (
      candidate &&
      candidate.harmonyGroup === harmonyGroup &&
      isHarmonyLockedToken(candidate, manifest)
    ) {
      groupLeaderCache[harmonyGroup] = tokenId;
      return tokenId;
    }
  }

  groupLeaderCache[harmonyGroup] = null;
  return null;
}

function resolveAltToken(
  tokenId: TokenId,
  manifest: ThemeManifest,
  cache: Partial<Record<TokenId, OklchColor>>,
  groupLeaderCache: Partial<Record<string, TokenId | null>>
): OklchColor {
  const cached = cache[tokenId];
  if (cached) {
    return cached;
  }

  const token = manifest.tokens[tokenId];
  if (!token) {
    const fallback = createDefaultManifest().tokens[tokenId];
    cache[tokenId] = fallback.dark;
    return fallback.dark;
  }

  const altBehavior = token.exception.altBehavior;
  const sourceColor = cloneColor(anchorFor(token, manifest.alt.source));

  if (altBehavior === 'exclude' || altBehavior === 'pin' || token.group === 'status') {
    cache[tokenId] = sourceColor;
    return sourceColor;
  }

  if (token.altParent) {
    const parent = resolveAltToken(token.altParent, manifest, cache, groupLeaderCache);
    cache[tokenId] = parent;
    return parent;
  }

  let shifted = resolveShiftedAltColor(token, manifest);

  if (isHarmonyLockedToken(token, manifest) && token.harmonyGroup) {
    const leaderId = resolveHarmonyLeaderId(token.harmonyGroup, manifest, groupLeaderCache);
    if (leaderId && leaderId !== tokenId) {
      const leader = resolveAltToken(leaderId, manifest, cache, groupLeaderCache);
      shifted = clampToDisplayable(
        {
          ...shifted,
          h: leader.h
        },
        token.exception.maxChroma ?? undefined
      );
    }
  }

  cache[tokenId] = shifted;
  return shifted;
}

export function resolveTheme(manifestInput: ThemeManifest, mode: ThemeMode): ResolvedTheme {
  const manifest = ensureManifest(manifestInput);
  const colors = {} as Record<TokenId, OklchColor>;
  const altCache: Partial<Record<TokenId, OklchColor>> = {};
  const groupLeaderCache: Partial<Record<string, TokenId | null>> = {};

  for (const tokenId of ALL_TOKEN_IDS) {
    const token = manifest.tokens[tokenId];
    if (!token) continue;
    colors[tokenId] =
      mode === 'alt'
        ? resolveAltToken(tokenId, manifest, altCache, groupLeaderCache)
        : cloneColor(mode === 'light' ? token.light : token.dark);
  }

  return { mode, colors };
}

type ContrastPolicyId = 'body' | 'supporting' | 'control' | 'status' | 'placeholder';

interface ContrastPolicy {
  label: string;
  minimumLc: number;
}

const CONTRAST_POLICIES: Record<ContrastPolicyId, ContrastPolicy> = {
  body: {
    label: 'body text',
    minimumLc: 75
  },
  supporting: {
    label: 'supporting text',
    minimumLc: 60
  },
  control: {
    label: 'control text',
    minimumLc: 60
  },
  status: {
    label: 'status text',
    minimumLc: 60
  },
  placeholder: {
    label: 'placeholder text',
    minimumLc: 45
  }
};

function formatLc(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}Lc`;
}

function contrastIssue(
  text: OklchColor,
  background: OklchColor,
  label: string,
  policyId: ContrastPolicyId
): string | null {
  const signedLc = APCAcontrast(sRGBtoY(toRgbChannels(text)), sRGBtoY(toRgbChannels(background)));
  const policy = CONTRAST_POLICIES[policyId];

  if (Math.abs(signedLc) >= policy.minimumLc) {
    return null;
  }

  return `${label} APCA contrast is ${formatLc(signedLc)}; ${policy.label} target is ${policy.minimumLc}Lc.`;
}

const CONTRAST_PAIRS: Array<[TokenId, TokenId, string, ContrastPolicyId]> = [
  ['text', 'surface', 'Body text on surface', 'body'],
  ['text-secondary', 'surface-muted', 'Secondary text on muted surface', 'supporting'],
  ['text-inverse', 'accent-strong', 'Inverse text on accent strong', 'control'],
  ['control-primary-text', 'control-primary', 'Primary control text', 'control'],
  ['control-secondary-text', 'control-secondary', 'Secondary control text', 'control'],
  ['input-placeholder', 'input', 'Input placeholder', 'placeholder'],
  ['success', 'success-surface', 'Success text', 'status'],
  ['warning', 'warning-surface', 'Warning text', 'status'],
  ['danger', 'danger-surface', 'Danger text', 'status'],
  ['info', 'info-surface', 'Info text', 'status']
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

    for (const [foregroundId, backgroundId, label, policyId] of CONTRAST_PAIRS) {
      const issue = contrastIssue(
        resolved.colors[foregroundId],
        resolved.colors[backgroundId],
        label,
        policyId
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
