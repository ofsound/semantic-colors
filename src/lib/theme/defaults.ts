import type { ThemeManifest, ThemeToken, TokenId } from './schema';

function token(
  definition: Omit<ThemeToken, 'id' | 'exception'> & { id: TokenId; altBehavior?: ThemeToken['exception']['altBehavior'] }
): ThemeToken {
  const { altBehavior = 'derive', ...rest } = definition;
  return {
    ...rest,
    exception: {
      altBehavior
    }
  };
}

const TOKENS = [
  token({
    id: 'app',
    label: 'App',
    description: 'Outer application background.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.982, c: 0.006, h: 95 },
    dark: { l: 0.16, c: 0.015, h: 265 }
  }),
  token({
    id: 'shell',
    label: 'Shell',
    description: 'Secondary shell or page frame surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.965, c: 0.008, h: 95 },
    dark: { l: 0.205, c: 0.016, h: 265 }
  }),
  token({
    id: 'surface',
    label: 'Surface',
    description: 'Primary content surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.998, c: 0.003, h: 95 },
    dark: { l: 0.235, c: 0.013, h: 265 }
  }),
  token({
    id: 'surface-raised',
    label: 'Surface Raised',
    description: 'Card or elevated panel surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.976, c: 0.01, h: 95 },
    dark: { l: 0.29, c: 0.014, h: 265 }
  }),
  token({
    id: 'surface-muted',
    label: 'Surface Muted',
    description: 'Muted supporting surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.945, c: 0.012, h: 95 },
    dark: { l: 0.33, c: 0.016, h: 265 }
  }),
  token({
    id: 'surface-subtle',
    label: 'Surface Subtle',
    description: 'Low-contrast surface for soft differentiation.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.925, c: 0.011, h: 95 },
    dark: { l: 0.37, c: 0.016, h: 265 }
  }),
  token({
    id: 'surface-overlay',
    label: 'Surface Overlay',
    description: 'Overlay panel or chrome surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.992, c: 0.006, h: 95, alpha: 0.92 },
    dark: { l: 0.2, c: 0.014, h: 265, alpha: 0.92 }
  }),
  token({
    id: 'field',
    label: 'Field',
    description: 'Input or inset field surface.',
    group: 'surfaces',
    role: 'neutral',
    light: { l: 0.998, c: 0.002, h: 95 },
    dark: { l: 0.18, c: 0.013, h: 265 }
  }),
  token({
    id: 'text',
    label: 'Text',
    description: 'Primary readable text.',
    group: 'text',
    role: 'neutral',
    light: { l: 0.22, c: 0.016, h: 260 },
    dark: { l: 0.94, c: 0.01, h: 95 }
  }),
  token({
    id: 'text-secondary',
    label: 'Text Secondary',
    description: 'Supporting readable text.',
    group: 'text',
    role: 'neutral',
    light: { l: 0.43, c: 0.014, h: 260 },
    dark: { l: 0.78, c: 0.012, h: 95 }
  }),
  token({
    id: 'text-muted',
    label: 'Text Muted',
    description: 'Muted annotation text.',
    group: 'text',
    role: 'neutral',
    light: { l: 0.54, c: 0.012, h: 260 },
    dark: { l: 0.68, c: 0.012, h: 95 }
  }),
  token({
    id: 'text-faint',
    label: 'Text Faint',
    description: 'Lowest emphasis text.',
    group: 'text',
    role: 'neutral',
    light: { l: 0.65, c: 0.01, h: 260 },
    dark: { l: 0.58, c: 0.011, h: 95 }
  }),
  token({
    id: 'text-inverse',
    label: 'Text Inverse',
    description: 'Text used on dark or accent surfaces.',
    group: 'text',
    role: 'neutral',
    light: { l: 0.992, c: 0.003, h: 95 },
    dark: { l: 0.18, c: 0.013, h: 265 }
  }),
  token({
    id: 'border',
    label: 'Border',
    description: 'Default border.',
    group: 'borders',
    role: 'neutral',
    light: { l: 0.82, c: 0.012, h: 95 },
    dark: { l: 0.45, c: 0.012, h: 265 }
  }),
  token({
    id: 'border-subtle',
    label: 'Border Subtle',
    description: 'Low-contrast border.',
    group: 'borders',
    role: 'neutral',
    light: { l: 0.88, c: 0.009, h: 95 },
    dark: { l: 0.34, c: 0.011, h: 265 }
  }),
  token({
    id: 'border-strong',
    label: 'Border Strong',
    description: 'Higher-emphasis border.',
    group: 'borders',
    role: 'neutral',
    light: { l: 0.72, c: 0.014, h: 95 },
    dark: { l: 0.58, c: 0.013, h: 265 }
  }),
  token({
    id: 'focus-ring',
    label: 'Focus Ring',
    description: 'Focus and outline indicator.',
    group: 'borders',
    role: 'accent',
    light: { l: 0.69, c: 0.16, h: 246 },
    dark: { l: 0.76, c: 0.14, h: 246 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'accent',
    label: 'Accent',
    description: 'Primary accent color.',
    group: 'accent',
    role: 'accent',
    light: { l: 0.63, c: 0.17, h: 230 },
    dark: { l: 0.76, c: 0.14, h: 230 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'accent-strong',
    label: 'Accent Strong',
    description: 'Higher-impact accent.',
    group: 'accent',
    role: 'accent',
    light: { l: 0.54, c: 0.2, h: 240 },
    dark: { l: 0.8, c: 0.17, h: 240 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'accent-surface',
    label: 'Accent Surface',
    description: 'Tinted accent background.',
    group: 'accent',
    role: 'accent',
    light: { l: 0.95, c: 0.045, h: 230 },
    dark: { l: 0.29, c: 0.07, h: 230 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'link',
    label: 'Link',
    description: 'Default link color.',
    group: 'accent',
    role: 'accent',
    light: { l: 0.57, c: 0.18, h: 252 },
    dark: { l: 0.82, c: 0.16, h: 252 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'link-hover',
    label: 'Link Hover',
    description: 'Hovered link color.',
    group: 'accent',
    role: 'accent',
    light: { l: 0.49, c: 0.2, h: 252 },
    dark: { l: 0.88, c: 0.18, h: 252 },
    harmonyGroup: 'accent'
  }),
  token({
    id: 'success',
    label: 'Success',
    description: 'Positive state text or icon.',
    group: 'status',
    role: 'status',
    light: { l: 0.65, c: 0.17, h: 153 },
    dark: { l: 0.77, c: 0.14, h: 153 },
    altBehavior: 'pin'
  }),
  token({
    id: 'success-surface',
    label: 'Success Surface',
    description: 'Positive state surface.',
    group: 'status',
    role: 'status',
    light: { l: 0.95, c: 0.05, h: 153 },
    dark: { l: 0.28, c: 0.06, h: 153 },
    altBehavior: 'pin'
  }),
  token({
    id: 'warning',
    label: 'Warning',
    description: 'Warning state text or icon.',
    group: 'status',
    role: 'status',
    light: { l: 0.74, c: 0.15, h: 82 },
    dark: { l: 0.83, c: 0.12, h: 82 },
    altBehavior: 'pin'
  }),
  token({
    id: 'warning-surface',
    label: 'Warning Surface',
    description: 'Warning surface.',
    group: 'status',
    role: 'status',
    light: { l: 0.97, c: 0.04, h: 82 },
    dark: { l: 0.3, c: 0.05, h: 82 },
    altBehavior: 'pin'
  }),
  token({
    id: 'danger',
    label: 'Danger',
    description: 'Danger state text or icon.',
    group: 'status',
    role: 'status',
    light: { l: 0.62, c: 0.21, h: 28 },
    dark: { l: 0.75, c: 0.17, h: 28 },
    altBehavior: 'pin'
  }),
  token({
    id: 'danger-surface',
    label: 'Danger Surface',
    description: 'Danger surface.',
    group: 'status',
    role: 'status',
    light: { l: 0.96, c: 0.05, h: 28 },
    dark: { l: 0.28, c: 0.06, h: 28 },
    altBehavior: 'pin'
  }),
  token({
    id: 'info',
    label: 'Info',
    description: 'Informational state text or icon.',
    group: 'status',
    role: 'status',
    light: { l: 0.67, c: 0.13, h: 232 },
    dark: { l: 0.8, c: 0.11, h: 232 },
    altBehavior: 'pin'
  }),
  token({
    id: 'info-surface',
    label: 'Info Surface',
    description: 'Informational surface.',
    group: 'status',
    role: 'status',
    light: { l: 0.96, c: 0.04, h: 232 },
    dark: { l: 0.28, c: 0.05, h: 232 },
    altBehavior: 'pin'
  }),
  token({
    id: 'control-primary',
    label: 'Control Primary',
    description: 'Primary action fill.',
    group: 'controls',
    role: 'control',
    light: { l: 0.54, c: 0.2, h: 240 },
    dark: { l: 0.8, c: 0.17, h: 240 },
    altParent: 'accent-strong',
    harmonyGroup: 'accent'
  }),
  token({
    id: 'control-primary-text',
    label: 'Control Primary Text',
    description: 'Text on primary actions.',
    group: 'controls',
    role: 'control',
    light: { l: 0.992, c: 0.003, h: 95 },
    dark: { l: 0.18, c: 0.013, h: 265 },
    altParent: 'text-inverse'
  }),
  token({
    id: 'control-secondary',
    label: 'Control Secondary',
    description: 'Secondary action fill.',
    group: 'controls',
    role: 'control',
    light: { l: 0.976, c: 0.01, h: 95 },
    dark: { l: 0.29, c: 0.014, h: 265 },
    altParent: 'surface-raised'
  }),
  token({
    id: 'control-secondary-text',
    label: 'Control Secondary Text',
    description: 'Text on secondary actions.',
    group: 'controls',
    role: 'control',
    light: { l: 0.22, c: 0.016, h: 260 },
    dark: { l: 0.94, c: 0.01, h: 95 },
    altParent: 'text'
  }),
  token({
    id: 'control-secondary-border',
    label: 'Control Secondary Border',
    description: 'Secondary action border.',
    group: 'controls',
    role: 'control',
    light: { l: 0.72, c: 0.014, h: 95 },
    dark: { l: 0.58, c: 0.013, h: 265 },
    altParent: 'border-strong'
  }),
  token({
    id: 'control-ghost-hover',
    label: 'Control Ghost Hover',
    description: 'Ghost action hover state.',
    group: 'controls',
    role: 'control',
    light: { l: 0.925, c: 0.011, h: 95 },
    dark: { l: 0.37, c: 0.016, h: 265 },
    altParent: 'surface-subtle'
  }),
  token({
    id: 'input',
    label: 'Input',
    description: 'Input background.',
    group: 'controls',
    role: 'control',
    light: { l: 0.998, c: 0.002, h: 95 },
    dark: { l: 0.18, c: 0.013, h: 265 },
    altParent: 'field'
  }),
  token({
    id: 'input-border',
    label: 'Input Border',
    description: 'Input border.',
    group: 'controls',
    role: 'control',
    light: { l: 0.82, c: 0.012, h: 95 },
    dark: { l: 0.45, c: 0.012, h: 265 },
    altParent: 'border'
  }),
  token({
    id: 'input-placeholder',
    label: 'Input Placeholder',
    description: 'Input placeholder text.',
    group: 'controls',
    role: 'control',
    light: { l: 0.65, c: 0.01, h: 260 },
    dark: { l: 0.58, c: 0.011, h: 95 },
    altParent: 'text-faint'
  })
] as const;

export function createDefaultManifest(): ThemeManifest {
  const now = new Date().toISOString();
  const tokens = Object.fromEntries(TOKENS.map((token) => [token.id, structuredClone(token)])) as ThemeManifest['tokens'];

  return {
    version: 1,
    name: 'Semantic Color System',
    updatedAt: now,
    alt: {
      source: 'dark',
      delta: {
        l: 0.02,
        c: 0.03,
        h: 28
      },
      harmonyLock: true,
      grayscalePreview: false
    },
    tokens,
    aliases: []
  };
}
