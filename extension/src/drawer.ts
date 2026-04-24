import {
  parseInPageDrawerToFrameMessage,
  toInPageDrawerEnvelope
} from './shared/inpage-drawer-messaging';
import type { BridgeSnapshot, InPageDrawerSource, ThemeMode } from './shared/types';

type DrawerTab = 'preview' | 'tokens';

const state = {
  snapshot: null as BridgeSnapshot | null,
  mode: 'light' as ThemeMode,
  highlightedTokenId: null as string | null,
  focusedTokenId: null as string | null,
  activeTab: 'preview' as DrawerTab
};

const el = {
  closeDrawer: document.getElementById('close-drawer') as HTMLButtonElement,
  modeLabel: document.getElementById('mode-label') as HTMLDivElement,
  tabs: document.querySelectorAll<HTMLButtonElement>('[data-tab]'),
  svelteHost: document.getElementById('drawer-svelte-host') as HTMLDivElement,
  tokensHost: document.getElementById('drawer-tokens-host') as HTMLDivElement
};

function validationNotes(tokenId: string): string[] {
  const validation = state.snapshot?.validations[state.mode]?.perToken[tokenId];
  if (!validation) return [];

  const notes: string[] = [];
  if (validation.gamutAdjusted) notes.push('Adjusted to stay in display gamut.');
  notes.push(...validation.contrastIssues);
  return notes;
}

function hasWarnings(tokenIds: readonly string[]): boolean {
  return tokenIds.some((tokenId) => validationNotes(tokenId).length > 0);
}

function usageClassList(tokenIds: readonly string[], baseClass: string): string {
  const classes = [baseClass];
  if (state.focusedTokenId && tokenIds.includes(state.focusedTokenId)) {
    classes.push('selected-usage');
  }
  if (state.highlightedTokenId && tokenIds.includes(state.highlightedTokenId)) {
    classes.push('highlighted-usage');
  }
  if (hasWarnings(tokenIds)) {
    classes.push('warning');
  }
  return classes.join(' ');
}

function postTokenFocus(tokenId: string, source: InPageDrawerSource): void {
  window.parent.postMessage(
    toInPageDrawerEnvelope({
      kind: 'token:focus',
      tokenId,
      source
    }),
    '*'
  );
}

function closeDrawer(): void {
  window.parent.postMessage(
    toInPageDrawerEnvelope({
      kind: 'drawer:close'
    }),
    '*'
  );
}

function modeLabel(mode: ThemeMode): string {
  return `Mode: ${mode[0].toUpperCase()}${mode.slice(1)}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function resolvedModePayload(): BridgeSnapshot['resolved'][ThemeMode] | null {
  if (!state.snapshot) return null;
  return state.snapshot.resolved[state.mode] ?? state.snapshot.resolved.light;
}

function renderTokenInventory(): string {
  if (!state.snapshot) {
    return '<p class="empty-state">Connect from the DevTools panel to list tokens.</p>';
  }

  const resolved = resolvedModePayload();
  if (!resolved) {
    return '<p class="empty-state">No resolved mode payload available.</p>';
  }

  return `<section class="inventory">
    ${state.snapshot.tokenGroups
      .map((group) => {
        const ids = state.snapshot?.tokensByGroup[group] ?? [];

        return `<article class="token-group">
          <h2>${escapeHtml(group)}</h2>
          ${ids
            .map((tokenId) => {
              const token = state.snapshot?.manifest.tokens[tokenId];
              if (!token) return '';
              const css = resolved.colors[tokenId]?.css ?? 'transparent';

              return `<button
                type="button"
                data-focus-token="${escapeHtml(tokenId)}"
                data-focus-source="tokens"
                class="${usageClassList([tokenId], 'token-row')}"
              >
                <span class="token-swatch" style="background:${escapeHtml(css)}"></span>
                <span>
                  <strong>${escapeHtml(token.label)}</strong>
                  <code>${escapeHtml(tokenId)} · ${escapeHtml(css)}</code>
                </span>
              </button>`;
            })
            .join('')}
        </article>`;
      })
      .join('')}
  </section>`;
}

function activateFocusTarget(target: HTMLElement): void {
  const tokenId = target.dataset.focusToken;
  if (!tokenId) return;
  const source = target.dataset.focusSource === 'tokens' ? 'tokens' : 'preview';
  state.focusedTokenId = tokenId;
  postTokenFocus(tokenId, source);
  render();
}

function attachFocusHandlers(): void {
  el.tokensHost.querySelectorAll<HTMLElement>('[data-focus-token]').forEach((target) => {
    target.addEventListener('click', (event) => {
      if (target.dataset.stopPropagation === 'true') {
        event.stopPropagation();
      }
      activateFocusTarget(target);
    });
  });

  el.tokensHost
    .querySelectorAll<HTMLElement>('[data-keyboard-activate="true"]')
    .forEach((target) => {
      target.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activateFocusTarget(target);
      });
    });
}

function render(): void {
  el.modeLabel.textContent = modeLabel(state.mode);
  el.tabs.forEach((button) => {
    const isActive = button.dataset.tab === state.activeTab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const previewActive = state.activeTab === 'preview';
  el.svelteHost.toggleAttribute('hidden', !previewActive);
  el.tokensHost.toggleAttribute('hidden', previewActive);
  if (!previewActive) {
    el.tokensHost.innerHTML = renderTokenInventory();
    attachFocusHandlers();
  } else {
    el.tokensHost.innerHTML = '';
  }
}

function applyIncomingState(): void {
  render();
}

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;

  const message = parseInPageDrawerToFrameMessage(event.data);
  if (!message) return;

  switch (message.kind) {
    case 'snapshot:update':
      state.snapshot = message.snapshot;
      state.mode = message.mode;
      state.highlightedTokenId = message.highlightedTokenId;
      state.focusedTokenId = message.focusedTokenId;
      applyIncomingState();
      break;
    case 'mode:update':
      state.mode = message.mode;
      applyIncomingState();
      break;
    case 'token:highlight':
      state.highlightedTokenId = message.tokenId;
      render();
      break;
    case 'token:focus':
      state.focusedTokenId = message.tokenId;
      render();
      break;
    default:
      break;
  }
});

el.closeDrawer.addEventListener('click', closeDrawer);
el.tabs.forEach((button) => {
  button.addEventListener('click', () => {
    const nextTab = button.dataset.tab;
    if (nextTab !== 'preview' && nextTab !== 'tokens') return;
    state.activeTab = nextTab;
    render();
  });
});

render();
