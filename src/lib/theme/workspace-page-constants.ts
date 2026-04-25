export const SIDEBAR_TABS = [
  { id: 'token', label: 'Token' },
  { id: 'modes', label: 'Alt' },
  { id: 'aliases', label: 'Aliases' },
  { id: 'import', label: 'Import' },
  { id: 'project', label: 'Project' }
] as const;

export const MAIN_TABS = [
  { id: 'preview', label: 'Preview' },
  { id: 'inventory', label: 'Tokens' }
] as const;

export const SHELL_THEME_TABS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'alt', label: 'Alt' }
] as const;

export const BORDER_PREVIEW_MODES = ['none', 'border', 'border-subtle', 'border-strong'] as const;

export const BORDER_PREVIEW_LABELS = {
  none: 'No Border',
  border: 'Border',
  'border-subtle': 'Border Subtle',
  'border-strong': 'Border Strong'
} as const;

export type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];
export type MainTabId = (typeof MAIN_TABS)[number]['id'];
export type BorderPreviewMode = (typeof BORDER_PREVIEW_MODES)[number];

export function headerControlClass(selected: boolean): string {
  return selected
    ? 'border-[color:var(--shell-color-control-active-border)] bg-[color:var(--shell-color-control-active)] text-[color:var(--shell-color-control-active-text)] shadow-[var(--shell-control-active-shadow)] hover:bg-[color:var(--shell-color-control-active-hover)]'
    : 'border-[color:var(--shell-color-control-border)] bg-[color:var(--shell-color-control)] text-[color:var(--shell-color-text)] shadow-none hover:bg-[color:var(--shell-color-control-hover)]';
}

export function headerShortcutClass(selected: boolean): string {
  return selected
    ? 'border-[color:var(--shell-color-accent-surface)] bg-[color:var(--shell-color-surface-raised)] text-[color:var(--shell-color-accent)]'
    : 'border-[color:var(--shell-color-border)] bg-[color:var(--shell-color-surface-subtle)] text-[color:var(--shell-color-text-muted)]';
}
