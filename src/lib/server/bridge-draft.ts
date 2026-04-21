import { createDefaultManifest } from '$lib/theme/defaults';
import type {
  AltSettings,
  ImportProposal,
  LocalAlias,
  OklchColor,
  ThemeManifest,
  TokenException,
  TokenId
} from '$lib/theme/schema';

export type BridgeDraftCommand =
  | {
      kind: 'update-token-color';
      tokenId: TokenId;
      mode: 'light' | 'dark' | 'both';
      color: OklchColor;
    }
  | {
      kind: 'update-token-exception';
      tokenId: TokenId;
      patch: Partial<Pick<TokenException, 'altBehavior' | 'maxChroma'>>;
    }
  | {
      kind: 'update-alt-settings';
      patch: Partial<
        Pick<AltSettings, 'source' | 'harmonyLock' | 'grayscalePreview'> & {
          delta: Partial<AltSettings['delta']>;
        }
      >;
    }
  | {
      kind: 'add-alias';
      alias: LocalAlias;
    }
  | {
      kind: 'update-alias';
      index: number;
      patch: Partial<LocalAlias>;
    }
  | {
      kind: 'remove-alias';
      index: number;
    }
  | {
      kind: 'reset-manifest';
    }
  | {
      kind: 'apply-import-review';
      proposal: ImportProposal;
      selection: Record<string, TokenId | ''>;
    };

function normalizeAliasName(name: string): string {
  return name.trim().replace(/^--/, '');
}

function cloneManifest(manifest: ThemeManifest): ThemeManifest {
  return structuredClone(manifest);
}

function applyTokenColor(
  manifest: ThemeManifest,
  tokenId: TokenId,
  mode: 'light' | 'dark' | 'both',
  color: OklchColor
): void {
  const token = manifest.tokens[tokenId];
  if (!token) return;

  if (mode === 'light' || mode === 'both') {
    token.light = { ...color };
  }

  if (mode === 'dark' || mode === 'both') {
    token.dark = { ...color };
  }
}

function applyTokenException(
  manifest: ThemeManifest,
  tokenId: TokenId,
  patch: Partial<Pick<TokenException, 'altBehavior' | 'maxChroma'>>
): void {
  const token = manifest.tokens[tokenId];
  if (!token) return;
  token.exception = {
    ...token.exception,
    ...patch
  };
}

function applyAltSettings(
  manifest: ThemeManifest,
  patch: Partial<
    Pick<AltSettings, 'source' | 'harmonyLock' | 'grayscalePreview'> & {
      delta: Partial<AltSettings['delta']>;
    }
  >
): void {
  manifest.alt = {
    ...manifest.alt,
    ...patch,
    delta: {
      ...manifest.alt.delta,
      ...(patch.delta ?? {})
    }
  };
}

function applyAliasAdd(manifest: ThemeManifest, alias: LocalAlias): void {
  manifest.aliases = [
    ...manifest.aliases,
    {
      name: normalizeAliasName(alias.name),
      tokenId: alias.tokenId
    }
  ];
}

function applyAliasUpdate(
  manifest: ThemeManifest,
  index: number,
  patch: Partial<LocalAlias>
): void {
  const existing = manifest.aliases[index];
  if (!existing) return;

  manifest.aliases[index] = {
    ...existing,
    ...patch,
    name: patch.name === undefined ? existing.name : normalizeAliasName(patch.name)
  };
}

function applyAliasRemove(manifest: ThemeManifest, index: number): void {
  manifest.aliases = manifest.aliases.filter((_, aliasIndex) => aliasIndex !== index);
}

function applyImportReview(
  manifest: ThemeManifest,
  proposal: ImportProposal,
  selection: Record<string, TokenId | ''>
): void {
  for (const candidate of proposal.candidates) {
    const tokenId = selection[candidate.sourceName];
    if (!tokenId) continue;

    if (candidate.light) {
      manifest.tokens[tokenId].light = { ...candidate.light };
    }

    if (candidate.dark) {
      manifest.tokens[tokenId].dark = { ...candidate.dark };
    }

    const aliasName = normalizeAliasName(candidate.sourceName);
    if (!manifest.aliases.some((alias) => alias.name === aliasName)) {
      manifest.aliases = [
        ...manifest.aliases,
        {
          name: aliasName,
          tokenId
        }
      ];
    }
  }
}

export function createTokenColorCommand(
  tokenId: TokenId,
  mode: 'light' | 'dark' | 'both',
  color: OklchColor
): BridgeDraftCommand {
  return {
    kind: 'update-token-color',
    tokenId,
    mode,
    color
  };
}

export function applyBridgeDraftCommands(
  manifest: ThemeManifest,
  commands: BridgeDraftCommand[]
): ThemeManifest {
  let nextManifest = cloneManifest(manifest);

  for (const command of commands) {
    if (command.kind === 'reset-manifest') {
      nextManifest = createDefaultManifest();
      continue;
    }

    switch (command.kind) {
      case 'update-token-color':
        applyTokenColor(nextManifest, command.tokenId, command.mode, command.color);
        break;
      case 'update-token-exception':
        applyTokenException(nextManifest, command.tokenId, command.patch);
        break;
      case 'update-alt-settings':
        applyAltSettings(nextManifest, command.patch);
        break;
      case 'add-alias':
        applyAliasAdd(nextManifest, command.alias);
        break;
      case 'update-alias':
        applyAliasUpdate(nextManifest, command.index, command.patch);
        break;
      case 'remove-alias':
        applyAliasRemove(nextManifest, command.index);
        break;
      case 'apply-import-review':
        applyImportReview(nextManifest, command.proposal, command.selection);
        break;
    }
  }

  nextManifest.updatedAt = new Date().toISOString();
  return nextManifest;
}
