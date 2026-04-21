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

  return `@theme {
${bridge}
}

:root,
:root[data-theme='light'] {
${themeCssVariables(light)}
  color-scheme: light;
}

:root[data-theme='dark'] {
${themeCssVariables(dark)}
  color-scheme: dark;
}

:root[data-theme='alt'] {
${themeCssVariables(alt)}
  color-scheme: dark;
}

:root {
${aliases || '  /* No local aliases defined. */'}
}
`;
}
