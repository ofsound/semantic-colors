export type ThemeMode = 'light' | 'dark' | 'alt';
export type TokenGroup = 'surfaces' | 'text' | 'borders' | 'accent' | 'status' | 'controls';

export type TokenId =
  | 'app'
  | 'shell'
  | 'surface'
  | 'surface-raised'
  | 'surface-muted'
  | 'surface-subtle'
  | 'surface-overlay'
  | 'field'
  | 'text'
  | 'text-secondary'
  | 'text-muted'
  | 'text-faint'
  | 'text-inverse'
  | 'border'
  | 'border-subtle'
  | 'border-strong'
  | 'focus-ring'
  | 'accent'
  | 'accent-strong'
  | 'accent-surface'
  | 'link'
  | 'link-hover'
  | 'success'
  | 'success-surface'
  | 'warning'
  | 'warning-surface'
  | 'danger'
  | 'danger-surface'
  | 'info'
  | 'info-surface'
  | 'control-primary'
  | 'control-primary-text'
  | 'control-secondary'
  | 'control-secondary-text'
  | 'control-secondary-border'
  | 'control-ghost-hover'
  | 'input'
  | 'input-border'
  | 'input-placeholder';

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface TokenException {
  altBehavior: 'derive' | 'pin' | 'exclude';
  maxChroma?: number | null;
}

export interface ThemeToken {
  id: TokenId;
  label: string;
  description: string;
  group: TokenGroup;
  role: 'neutral' | 'accent' | 'status' | 'control';
  light: OklchColor;
  dark: OklchColor;
  altParent?: TokenId;
  harmonyGroup?: string;
  exception: TokenException;
}

export interface AltSettings {
  source: 'light' | 'dark';
  delta: {
    l: number;
    c: number;
    h: number;
  };
  harmonyLock: boolean;
  grayscalePreview: boolean;
}

export interface LocalAlias {
  name: string;
  tokenId: TokenId;
}

export interface ThemeManifest {
  version: 1;
  name: string;
  updatedAt: string;
  alt: AltSettings;
  tokens: Record<TokenId, ThemeToken>;
  aliases: LocalAlias[];
}

export interface ProjectConfig {
  version: 1;
  projectRoot: string;
  bridgeEnabled: boolean;
  manifestPath: string;
  cssOutputPath: string;
  importSourcePath: string;
  selectorStrategy: 'data-theme';
}

export interface ImportCandidate {
  sourceName: string;
  rawValue: string;
  suggestedTokenId: TokenId | null;
  confidence: number;
  reason: string;
  light?: OklchColor | null;
  dark?: OklchColor | null;
}

export interface ImportProposal {
  sourcePath: string;
  candidates: ImportCandidate[];
}

export const TOKEN_GROUP_ORDER: TokenGroup[] = [
  'surfaces',
  'text',
  'borders',
  'accent',
  'status',
  'controls'
];

export const TOKENS_BY_GROUP: Record<TokenGroup, TokenId[]> = {
  surfaces: [
    'app',
    'shell',
    'surface',
    'surface-raised',
    'surface-muted',
    'surface-subtle',
    'surface-overlay',
    'field'
  ],
  text: ['text', 'text-secondary', 'text-muted', 'text-faint', 'text-inverse'],
  borders: ['border', 'border-subtle', 'border-strong', 'focus-ring'],
  accent: ['accent', 'accent-strong', 'accent-surface', 'link', 'link-hover'],
  status: [
    'success',
    'success-surface',
    'warning',
    'warning-surface',
    'danger',
    'danger-surface',
    'info',
    'info-surface'
  ],
  controls: [
    'control-primary',
    'control-primary-text',
    'control-secondary',
    'control-secondary-text',
    'control-secondary-border',
    'control-ghost-hover',
    'input',
    'input-border',
    'input-placeholder'
  ]
};

export const ALL_TOKEN_IDS = TOKEN_GROUP_ORDER.flatMap((group) => TOKENS_BY_GROUP[group]);

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  version: 1,
  projectRoot: '',
  bridgeEnabled: false,
  manifestPath: 'semantic-colors/theme.manifest.json',
  cssOutputPath: 'src/lib/styles/semantic-theme.generated.css',
  importSourcePath: '',
  selectorStrategy: 'data-theme'
};
