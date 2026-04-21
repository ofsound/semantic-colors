import { describe, expect, it } from 'vitest';
import { generateThemeCss } from './css';
import { createDefaultManifest } from './defaults';
import { resolveTheme, validateManifest } from './engine';
import { extractImportProposal } from './importer';

describe('theme engine', () => {
  it('derives alt tokens from the configured source', () => {
    const manifest = createDefaultManifest();
    manifest.alt.source = 'dark';
    manifest.alt.delta.h = 40;
    manifest.alt.delta.c = 0.02;
    manifest.alt.delta.l = 0.01;

    const alt = resolveTheme(manifest, 'alt');

    expect(alt.colors.accent.h).not.toBe(manifest.tokens.accent.dark.h);
    expect(alt.colors.success.h).toBe(manifest.tokens.success.dark.h);
    expect(alt.colors['control-primary']).toEqual(alt.colors['accent-strong']);
  });

  it('emits explicit data-theme blocks for the generated css contract', () => {
    const css = generateThemeCss(createDefaultManifest());

    expect(css).toContain('@theme');
    expect(css).toContain(":root[data-theme='dark']");
    expect(css).toContain(":root[data-theme='alt']");
    expect(css).toContain('--color-surface: var(--theme-surface);');
  });

  it('flags low contrast tokens in validation results', () => {
    const manifest = createDefaultManifest();
    manifest.tokens['control-primary-text'].dark = { ...manifest.tokens['control-primary'].dark };

    const validation = validateManifest(manifest);
    expect(validation.dark.perToken['control-primary-text'].contrastIssues.length).toBeGreaterThan(0);
  });
});

describe('import proposal heuristics', () => {
  it('maps recognizable variable names into canonical suggestions', () => {
    const proposal = extractImportProposal(
      '/tmp/app.css',
      `
      :root {
        --color-surface-muted: oklch(90% 0.01 220);
        --color-text-primary: oklch(20% 0.01 220);
        --color-button-secondary-border: oklch(70% 0.01 220);
      }
      `
    );

    expect(proposal.candidates.find((candidate) => candidate.sourceName === 'color-surface-muted')?.suggestedTokenId).toBe(
      'surface-muted'
    );
    expect(proposal.candidates.find((candidate) => candidate.sourceName === 'color-text-primary')?.suggestedTokenId).toBe(
      'text'
    );
  });
});
