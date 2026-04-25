import type { ThemeMode } from './schema';

export type PreviewMainTab = 'preview' | 'inventory';

interface PreviewShortcutControllerOptions {
  cycleBorderPreviewMode: () => void;
  getActiveMode: () => ThemeMode;
  now?: () => number;
  setActiveMode: (mode: ThemeMode) => void;
  setMainTab: (tab: PreviewMainTab) => void;
  toggleGrayscale: () => void;
}

interface ShortcutTarget {
  closest?: (selector: string) => unknown;
  isContentEditable?: boolean;
  tagName?: string;
}

const HOLD_PREVIEW_RELEASE_THRESHOLD_MS = 180;

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const candidate = target as ShortcutTarget;
  if (candidate.isContentEditable) {
    return true;
  }

  const tagName = candidate.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return Boolean(candidate.closest?.('input, textarea, select, [contenteditable="true"]'));
}

export function createPreviewShortcutController(options: PreviewShortcutControllerOptions) {
  const now = options.now ?? (() => performance.now());
  let holdPreviewStartedAt = 0;
  let holdPreviewReturnMode: ThemeMode | null = null;

  function cancelHoldPreview(): void {
    if (!holdPreviewReturnMode) {
      return;
    }

    options.setActiveMode(holdPreviewReturnMode);
    holdPreviewReturnMode = null;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (isEditableShortcutTarget(event.target)) {
      return;
    }

    if (event.key === '1') {
      options.setActiveMode('light');
      return;
    }

    if (event.key === '2') {
      options.setActiveMode('dark');
      return;
    }

    if (event.key === '3' && !event.repeat) {
      const activeMode = options.getActiveMode();
      holdPreviewReturnMode = activeMode === 'alt' ? null : activeMode;
      holdPreviewStartedAt = now();
      options.setActiveMode('alt');
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'p') {
      options.setMainTab('preview');
      return;
    }

    if (key === 't') {
      options.setMainTab('inventory');
      return;
    }

    if (key === 'g') {
      options.toggleGrayscale();
      return;
    }

    if (key === 'b') {
      options.cycleBorderPreviewMode();
    }
  }

  function handleKeyup(event: KeyboardEvent): void {
    if (event.key !== '3' || !holdPreviewReturnMode) {
      return;
    }

    const heldFor = now() - holdPreviewStartedAt;
    if (heldFor > HOLD_PREVIEW_RELEASE_THRESHOLD_MS) {
      options.setActiveMode(holdPreviewReturnMode);
    }
    holdPreviewReturnMode = null;
  }

  return {
    cancelHoldPreview,
    handleKeydown,
    handleKeyup
  };
}
