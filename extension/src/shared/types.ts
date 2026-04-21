export type ThemeMode = 'light' | 'dark' | 'alt';

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface TokenRecord {
  id: string;
  label: string;
  description: string;
  group: string;
  role: string;
  light: OklchColor;
  dark: OklchColor;
}

export interface ImportCandidate {
  sourceName: string;
  rawValue: string;
  suggestedTokenId: string | null;
  confidence: number;
  reason: string;
  light?: OklchColor | null;
  dark?: OklchColor | null;
}

export interface ImportProposal {
  sourcePath: string;
  candidates: ImportCandidate[];
}

export interface BridgeDraftState {
  dirty: boolean;
  baseVersion: number;
  lastEditor: 'ui' | 'extension' | 'server';
}

export interface ResolvedTokenPayload extends OklchColor {
  css: string;
}

export interface ResolvedThemePayload {
  mode: ThemeMode;
  colors: Record<string, ResolvedTokenPayload>;
  cssVariables: Record<string, string>;
}

export interface BridgeSnapshot {
  version: number;
  updatedAt: string;
  origin: 'ui' | 'extension' | 'server';
  configPath: string;
  draft: BridgeDraftState;
  manifest: {
    version: number;
    name: string;
    updatedAt: string;
    tokens: Record<string, TokenRecord>;
    aliases: Array<{ name: string; tokenId: string }>;
    alt: {
      source: 'light' | 'dark';
      delta: { l: number; c: number; h: number };
      harmonyLock: boolean;
      grayscalePreview: boolean;
    };
  };
  resolved: Record<ThemeMode, ResolvedThemePayload>;
  css: string;
  tokenGroups: string[];
  tokensByGroup: Record<string, string[]>;
  validations: Record<
    ThemeMode,
    {
      perToken: Record<
        string,
        { tokenId: string; gamutAdjusted: boolean; contrastIssues: string[] }
      >;
    }
  >;
}

export type BridgeDraftCommand =
  | {
      kind: 'update-token-color';
      tokenId: string;
      mode: 'light' | 'dark' | 'both';
      color: OklchColor;
    }
  | {
      kind: 'update-token-exception';
      tokenId: string;
      patch: {
        altBehavior?: 'derive' | 'pin' | 'exclude';
        maxChroma?: number | null;
      };
    }
  | {
      kind: 'update-alt-settings';
      patch: {
        source?: 'light' | 'dark';
        harmonyLock?: boolean;
        grayscalePreview?: boolean;
        delta?: Partial<{ l: number; c: number; h: number }>;
      };
    }
  | {
      kind: 'add-alias';
      alias: { name: string; tokenId: string };
    }
  | {
      kind: 'update-alias';
      index: number;
      patch: { name?: string; tokenId?: string };
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
      selection: Record<string, string>;
    };

export interface ElementTokenMatch {
  channel: 'foreground' | 'background' | 'border';
  tokenId: string | null;
  aliases: string[];
  cssValue: string | null;
}

export interface HoverElementPayload {
  selector: string;
  tagName: string;
  classes: string[];
  role: string | null;
  computedColor: string | null;
  computedBackground: string | null;
  computedBorder: string | null;
  matches: ElementTokenMatch[];
  contrastLc: number | null;
  selected: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

export interface CoverageReport {
  totalElements: number;
  byToken: Record<string, number>;
  unusedTokens: string[];
  rawColorViolations: Array<{
    selector: string;
    property: 'color' | 'background-color' | 'border-color';
    value: string;
  }>;
  rootVariables: Record<string, string>;
}

export interface ContrastFinding {
  selector: string;
  foreground: string;
  background: string;
  foregroundToken: string | null;
  backgroundToken: string | null;
  contrastLc: number;
  severity: 'ok' | 'warn' | 'fail';
  context: string;
}

export interface ContrastReport {
  sampled: number;
  findings: ContrastFinding[];
}

// Message envelopes between panel <-> content-bridge (relayed by background).

export type PanelToContentMessage =
  | { kind: 'ping' }
  | { kind: 'set-theme'; mode: ThemeMode | null }
  | { kind: 'hover-inspector'; enabled: boolean }
  | { kind: 'select-element' }
  | { kind: 'clear-selection' }
  | { kind: 'highlight-token'; tokenId: string | null }
  | { kind: 'focus-token'; tokenId: string | null }
  | { kind: 'reveal-token-usage'; tokenId: string | null }
  | { kind: 'override-token'; tokenId: string; css: string | null }
  | { kind: 'clear-all-overrides' }
  | {
      kind: 'scan-coverage';
      tokenColors: Record<string, string>;
      aliases: Array<{ name: string; tokenId: string }>;
    }
  | {
      kind: 'scan-contrast';
      tokenColors: Record<string, string>;
      aliases: Array<{ name: string; tokenId: string }>;
    }
  | { kind: 'update-snapshot'; snapshot: BridgeSnapshot }
  | { kind: 'page-info' };

export type ContentToPanelMessage =
  | { kind: 'hello'; url: string; title: string }
  | { kind: 'hover-element'; payload: HoverElementPayload }
  | { kind: 'selected-element'; payload: HoverElementPayload }
  | { kind: 'hover-cleared' }
  | { kind: 'selection-cleared' }
  | { kind: 'coverage-report'; report: CoverageReport }
  | { kind: 'contrast-report'; report: ContrastReport }
  | { kind: 'page-info'; url: string; title: string; theme: string | null }
  | { kind: 'error'; message: string };

export interface RelayEnvelope<T> {
  target: 'content' | 'panel';
  tabId?: number;
  payload: T;
}
