import type {
  BridgeDraftCommand,
  BridgeSnapshot,
  ImportProposal,
  OklchColor,
  ThemeMode
} from './types';

type UpdateTokenExceptionPatch = Extract<
  BridgeDraftCommand,
  { kind: 'update-token-exception' }
>['patch'];

type UpdateAltSettingsPatch = Extract<BridgeDraftCommand, { kind: 'update-alt-settings' }>['patch'];

type UpdateAliasPatch = Extract<BridgeDraftCommand, { kind: 'update-alias' }>['patch'];

export function updateTokenColor(
  tokenId: string,
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

export function updateTokenException(
  tokenId: string,
  patch: UpdateTokenExceptionPatch
): BridgeDraftCommand {
  return {
    kind: 'update-token-exception',
    tokenId,
    patch
  };
}

export function updateAltSettings(patch: UpdateAltSettingsPatch): BridgeDraftCommand {
  return {
    kind: 'update-alt-settings',
    patch
  };
}

export function addAlias(name: string, tokenId: string): BridgeDraftCommand {
  return {
    kind: 'add-alias',
    alias: { name, tokenId }
  };
}

export function updateAlias(index: number, patch: UpdateAliasPatch): BridgeDraftCommand {
  return {
    kind: 'update-alias',
    index,
    patch
  };
}

export function removeAlias(index: number): BridgeDraftCommand {
  return {
    kind: 'remove-alias',
    index
  };
}

export function resetManifest(): BridgeDraftCommand {
  return {
    kind: 'reset-manifest'
  };
}

export function applyImportReview(
  proposal: ImportProposal,
  selection: Record<string, string>
): BridgeDraftCommand {
  return {
    kind: 'apply-import-review',
    proposal,
    selection
  };
}

export function resolvedModeForSnapshot(
  snapshot: BridgeSnapshot,
  activeMode: ThemeMode | null,
  pageTheme: string | null
): ThemeMode {
  if (activeMode) return activeMode;
  if (pageTheme === 'dark' || pageTheme === 'alt') return pageTheme;
  if (snapshot.manifest.alt.source === 'dark' && pageTheme === 'light') return 'light';
  return 'light';
}

export function validationNotes(
  snapshot: BridgeSnapshot,
  tokenId: string,
  mode: ThemeMode
): string[] {
  const tokenValidation = snapshot.validations[mode]?.perToken[tokenId];
  if (!tokenValidation) return [];

  const notes: string[] = [];
  if (tokenValidation.gamutAdjusted) {
    notes.push('Adjusted to stay in display gamut.');
  }
  notes.push(...tokenValidation.contrastIssues);
  return notes;
}

export function primaryTokenFromSelection(
  selection: {
    semanticClassMatches?: Array<{ tokenId: string }>;
    matches: Array<{ tokenId: string | null }>;
  } | null
): string | null {
  const semanticClassToken = selection?.semanticClassMatches?.[0]?.tokenId;
  if (semanticClassToken) return semanticClassToken;
  return selection?.matches.find((match) => match.tokenId)?.tokenId ?? null;
}
