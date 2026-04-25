import { resolveTheme, themeCssVariables } from './engine';
import type { ThemeManifest } from './schema';
import { ALL_TOKEN_IDS } from './schema';

export function generateThemeCss(manifest: ThemeManifest): string {
  const light = resolveTheme(manifest, 'light');
  const dark = resolveTheme(manifest, 'dark');
  const alt = resolveTheme(manifest, 'alt');

  const bridge = ALL_TOKEN_IDS.map(
    (tokenId) => `  --color-${tokenId}: var(--theme-${tokenId});`
  ).join('\n');
  const aliases = manifest.aliases
    .map((alias) => `  --${alias.name}: var(--color-${alias.tokenId});`)
    .join('\n');
  const altColorScheme = manifest.alt.source === 'light' ? 'light' : 'dark';

  return `:root,
:root[data-theme='light'] {
${themeCssVariables(light)}
${bridge}
  color-scheme: light;
}

:root[data-theme='dark'] {
${themeCssVariables(dark)}
${bridge}
  color-scheme: dark;
}

:root[data-theme='alt'] {
${themeCssVariables(alt)}
${bridge}
  color-scheme: ${altColorScheme};
}

:root {
${aliases || '  /* No local aliases defined. */'}
}
`;
}
