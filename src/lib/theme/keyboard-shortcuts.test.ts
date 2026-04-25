import { describe, expect, it } from 'vitest';
import { createPreviewShortcutController, isEditableShortcutTarget } from './keyboard-shortcuts';
import type { ThemeMode } from './schema';

function keyboardEvent(
  key: string,
  options: { repeat?: boolean; target?: EventTarget | null } = {}
): KeyboardEvent {
  return {
    key,
    repeat: options.repeat ?? false,
    target: options.target ?? null
  } as KeyboardEvent;
}

describe('preview keyboard shortcuts', () => {
  it('ignores editable targets', () => {
    expect(isEditableShortcutTarget({ tagName: 'INPUT' } as never)).toBe(true);
    expect(isEditableShortcutTarget({ isContentEditable: true } as never)).toBe(true);
    expect(isEditableShortcutTarget({ tagName: 'BUTTON' } as never)).toBe(false);
  });

  it('routes mode, tab, grayscale, and border shortcuts', () => {
    let activeMode: ThemeMode = 'light';
    let activeTab = 'preview';
    let grayscale = false;
    let borderCycles = 0;

    const shortcuts = createPreviewShortcutController({
      cycleBorderPreviewMode: () => {
        borderCycles += 1;
      },
      getActiveMode: () => activeMode,
      setActiveMode: (mode) => {
        activeMode = mode;
      },
      setMainTab: (tab) => {
        activeTab = tab;
      },
      toggleGrayscale: () => {
        grayscale = !grayscale;
      }
    });

    shortcuts.handleKeydown(keyboardEvent('2'));
    shortcuts.handleKeydown(keyboardEvent('t'));
    shortcuts.handleKeydown(keyboardEvent('g'));
    shortcuts.handleKeydown(keyboardEvent('b'));

    expect(activeMode).toBe('dark');
    expect(activeTab).toBe('inventory');
    expect(grayscale).toBe(true);
    expect(borderCycles).toBe(1);
  });

  it('returns to the previous mode after a held alt preview', () => {
    let clock = 0;
    let activeMode: ThemeMode = 'dark';
    const shortcuts = createPreviewShortcutController({
      cycleBorderPreviewMode: () => {},
      getActiveMode: () => activeMode,
      now: () => clock,
      setActiveMode: (mode) => {
        activeMode = mode;
      },
      setMainTab: () => {},
      toggleGrayscale: () => {}
    });

    shortcuts.handleKeydown(keyboardEvent('3'));
    expect(activeMode).toBe('alt');

    clock = 250;
    shortcuts.handleKeyup(keyboardEvent('3'));

    expect(activeMode).toBe('dark');
  });

  it('keeps alt mode for a short press', () => {
    let clock = 0;
    let activeMode: ThemeMode = 'light';
    const shortcuts = createPreviewShortcutController({
      cycleBorderPreviewMode: () => {},
      getActiveMode: () => activeMode,
      now: () => clock,
      setActiveMode: (mode) => {
        activeMode = mode;
      },
      setMainTab: () => {},
      toggleGrayscale: () => {}
    });

    shortcuts.handleKeydown(keyboardEvent('3'));
    clock = 60;
    shortcuts.handleKeyup(keyboardEvent('3'));

    expect(activeMode).toBe('alt');
  });

  it('cancels a held alt preview on blur', () => {
    let activeMode: ThemeMode = 'light';
    const shortcuts = createPreviewShortcutController({
      cycleBorderPreviewMode: () => {},
      getActiveMode: () => activeMode,
      setActiveMode: (mode) => {
        activeMode = mode;
      },
      setMainTab: () => {},
      toggleGrayscale: () => {}
    });

    shortcuts.handleKeydown(keyboardEvent('3'));
    shortcuts.cancelHoldPreview();

    expect(activeMode).toBe('light');
  });
});
