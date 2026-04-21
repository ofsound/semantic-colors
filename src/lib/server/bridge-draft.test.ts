import { describe, expect, it } from 'vitest';
import { createDefaultManifest } from '$lib/theme/defaults';
import type { ImportProposal } from '$lib/theme/schema';
import { applyBridgeDraftCommands } from './bridge-draft';

describe('applyBridgeDraftCommands', () => {
  it('updates token colors and alt settings without mutating the input manifest', () => {
    const manifest = createDefaultManifest();
    const originalAltSource = manifest.alt.source;
    const next = applyBridgeDraftCommands(manifest, [
      {
        kind: 'update-token-color',
        tokenId: 'accent',
        mode: 'light',
        color: { l: 0.7, c: 0.2, h: 280 }
      },
      {
        kind: 'update-alt-settings',
        patch: {
          source: 'dark',
          harmonyLock: false,
          delta: { h: 24 }
        }
      }
    ]);

    expect(next.tokens.accent.light.h).toBe(280);
    expect(next.alt.source).toBe('dark');
    expect(next.alt.harmonyLock).toBe(false);
    expect(next.alt.delta.h).toBe(24);
    expect(manifest.tokens.accent.light.h).not.toBe(280);
    expect(manifest.alt.source).toBe(originalAltSource);
  });

  it('supports alias CRUD and import review application', () => {
    const manifest = createDefaultManifest();
    const proposal: ImportProposal = {
      sourcePath: '/tmp/theme.css',
      candidates: [
        {
          sourceName: 'brand-strong',
          rawValue: '#6633ff',
          suggestedTokenId: 'accent-strong',
          confidence: 0.9,
          reason: 'Looks like an accent strong token.',
          light: { l: 0.62, c: 0.23, h: 285 },
          dark: { l: 0.72, c: 0.19, h: 285 }
        }
      ]
    };

    const next = applyBridgeDraftCommands(manifest, [
      { kind: 'add-alias', alias: { name: '--color-brand', tokenId: 'accent' } },
      { kind: 'update-alias', index: 0, patch: { name: 'brand-main', tokenId: 'link' } },
      {
        kind: 'apply-import-review',
        proposal,
        selection: { 'brand-strong': 'accent-strong' }
      },
      { kind: 'remove-alias', index: 0 }
    ]);

    expect(next.aliases.some((alias) => alias.name === 'brand-main')).toBe(false);
    expect(next.aliases.some((alias) => alias.name === 'brand-strong')).toBe(true);
    expect(next.tokens['accent-strong'].light.h).toBe(285);
    expect(next.tokens['accent-strong'].dark.h).toBe(285);
  });
});
