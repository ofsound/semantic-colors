import { describe, expect, it } from 'vitest';
import { generateThemeCss } from './css';
import { createDefaultManifest } from './defaults';
import { resolveTheme, validateManifest } from './engine';
import { extractImportProposal } from './importer';

describe('theme engine', () => {
  it('preserves existing alt behavior when harmony lock is disabled', () => {
    const manifest = createDefaultManifest();
    manifest.alt.harmonyLock = false;
    manifest.alt.source = 'dark';
    manifest.alt.delta.h = 40;
    manifest.alt.delta.c = 0.02;
    manifest.alt.delta.l = 0.01;

    const alt = resolveTheme(manifest, 'alt');

    expect(alt.colors.accent.h).not.toBe(manifest.tokens.accent.dark.h);
    expect(alt.colors.success.h).toBe(manifest.tokens.success.dark.h);
    expect(alt.colors['control-primary']).toEqual(alt.colors['accent-strong']);
  });

  it('locks grouped tokens to a shared leader hue in alt mode', () => {
    const manifest = createDefaultManifest();
    manifest.alt.harmonyLock = true;
    manifest.alt.source = 'dark';
    manifest.alt.delta.h = 34;
    manifest.alt.delta.c = 0.03;
    manifest.alt.delta.l = 0.02;

    const alt = resolveTheme(manifest, 'alt');

    expect(alt.colors.accent.h).toBeCloseTo(alt.colors['accent-strong'].h, 6);
    expect(alt.colors.accent.h).toBeCloseTo(alt.colors['accent-surface'].h, 6);
    expect(alt.colors.accent.h).toBeCloseTo(alt.colors.link.h, 6);
    expect(alt.colors.accent.h).toBeCloseTo(alt.colors['link-hover'].h, 6);
    expect(alt.colors.accent.l).not.toBeCloseTo(alt.colors['accent-strong'].l, 6);
    expect(alt.colors.accent.c).not.toBeCloseTo(alt.colors['accent-strong'].c, 6);
  });

  it('keeps altParent tokens and status tokens on their stronger alt rules', () => {
    const manifest = createDefaultManifest();
    manifest.alt.harmonyLock = true;
    manifest.alt.source = 'dark';
    manifest.alt.delta.h = 28;
    manifest.alt.delta.c = 0.03;
    manifest.alt.delta.l = 0.02;

    const alt = resolveTheme(manifest, 'alt');

    expect(alt.colors['control-primary']).toEqual(alt.colors['accent-strong']);
    expect(alt.colors.success).toEqual(manifest.tokens.success.dark);
  });

  it('reclamps after applying the shared harmony hue', () => {
    const manifest = createDefaultManifest();
    manifest.alt.harmonyLock = true;
    manifest.alt.source = 'dark';
    manifest.alt.delta.h = 110;
    manifest.alt.delta.c = 0.18;
    manifest.alt.delta.l = 0.03;
    manifest.tokens.link.exception.maxChroma = 0.04;

    const alt = resolveTheme(manifest, 'alt');

    expect(alt.colors.link.h).toBeCloseTo(alt.colors.accent.h, 6);
    expect(alt.colors.link.c).toBeLessThanOrEqual(0.0405);
  });

  it('emits explicit data-theme blocks for the generated css contract', () => {
    const css = generateThemeCss(createDefaultManifest());

    expect(css).not.toContain('@theme');
    expect(css).toMatchSnapshot();
    expect(css).toContain(":root[data-theme='dark']");
    expect(css).toContain(":root[data-theme='alt']");
    expect(css).toContain('--color-surface: var(--theme-surface);');
  });

  it('uses the alt source anchor for generated color-scheme', () => {
    const manifest = createDefaultManifest();
    manifest.alt.source = 'light';

    const css = generateThemeCss(manifest);
    const altBlock = css.slice(css.indexOf(":root[data-theme='alt']"));

    expect(altBlock).toContain('color-scheme: light;');
  });

  it('flags low contrast tokens in validation results', () => {
    const manifest = createDefaultManifest();
    manifest.tokens['control-primary-text'].dark = { ...manifest.tokens['control-primary'].dark };

    const validation = validateManifest(manifest);
    const issues = validation.dark.perToken['control-primary-text'].contrastIssues;

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('APCA contrast is');
    expect(issues[0]).toContain('control text target is 60Lc');
  });

  it('reports signed APCA contrast instead of only absolute magnitude', () => {
    const manifest = createDefaultManifest();
    manifest.tokens['control-primary-text'].dark = {
      ...manifest.tokens['control-primary'].dark,
      l: manifest.tokens['control-primary'].dark.l - 0.2
    };

    const validation = validateManifest(manifest);
    const issue = validation.dark.perToken['control-primary-text'].contrastIssues[0];

    expect(issue).toContain('+');
    expect(issue).toContain('Lc');
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

    expect(
      proposal.candidates.find((candidate) => candidate.sourceName === 'color-surface-muted')
        ?.suggestedTokenId
    ).toBe('surface-muted');
    expect(
      proposal.candidates.find((candidate) => candidate.sourceName === 'color-text-primary')
        ?.suggestedTokenId
    ).toBe('text');
  });
});
