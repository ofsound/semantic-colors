import {
  parseInPageDrawerToFrameMessage,
  toInPageDrawerEnvelope
} from './shared/inpage-drawer-messaging';
import type { BridgeSnapshot, InPageDrawerSource, ThemeMode } from './shared/types';

type DrawerTab = 'preview' | 'tokens';
type StatusPairStem = 'success' | 'warning' | 'danger' | 'info';

const TEXT_INVENTORY = [
  'text',
  'text-secondary',
  'text-muted',
  'text-faint',
  'text-inverse'
] as const;
const ACCENT_INVENTORY = [
  'accent',
  'accent-strong',
  'accent-surface',
  'link',
  'link-hover'
] as const;
const BORDER_INVENTORY = ['border', 'border-subtle', 'border-strong', 'focus-ring'] as const;
const STATUS_PAIR_STEMS = [
  'success',
  'warning',
  'danger',
  'info'
] as const satisfies readonly StatusPairStem[];

const state = {
  snapshot: null as BridgeSnapshot | null,
  mode: 'light' as ThemeMode,
  highlightedTokenId: null as string | null,
  focusedTokenId: null as string | null,
  activeTab: 'preview' as DrawerTab,
  themeVarStyle: null as HTMLStyleElement | null
};

const el = {
  closeDrawer: document.getElementById('close-drawer') as HTMLButtonElement,
  modeLabel: document.getElementById('mode-label') as HTMLDivElement,
  tabs: document.querySelectorAll<HTMLButtonElement>('[data-tab]'),
  content: document.getElementById('drawer-content') as HTMLDivElement
};

function tokenLabel(tokenId: string): string {
  return state.snapshot?.manifest.tokens[tokenId]?.label ?? tokenId;
}

function resolvedModePayload(): BridgeSnapshot['resolved'][ThemeMode] | null {
  if (!state.snapshot) return null;
  return state.snapshot.resolved[state.mode] ?? state.snapshot.resolved.light;
}

function hasToken(tokenId: string): boolean {
  return tokenId in (state.snapshot?.manifest.tokens ?? {});
}

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

function warningSummary(tokenIds: readonly string[]): string {
  const notes = [...new Set(tokenIds.flatMap((tokenId) => validationNotes(tokenId)))];
  if (notes.length === 0) return 'No validation warnings.';
  return `${notes.length} validation warning${notes.length === 1 ? '' : 's'}: ${notes.join(' ')}`;
}

function warningBadgeMarkup(tokenIds: readonly string[]): string {
  if (!hasWarnings(tokenIds)) return '';
  const summary = warningSummary(tokenIds);
  return `<span aria-label="${escapeHtml(summary)}" class="warning-badge" title="${escapeHtml(summary)}">Warn</span>`;
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

function applyThemeVariables(): void {
  if (!state.themeVarStyle) {
    state.themeVarStyle = document.createElement('style');
    state.themeVarStyle.id = 'drawer-theme-vars';
    document.head.appendChild(state.themeVarStyle);
  }

  document.documentElement.dataset.theme = state.mode;

  if (!state.snapshot) {
    state.themeVarStyle.textContent = '';
    return;
  }

  const resolved = resolvedModePayload();
  if (!resolved) {
    state.themeVarStyle.textContent = '';
    return;
  }

  const declarations = Object.entries(resolved.colors)
    .map(
      ([tokenId, payload]) =>
        `  --theme-${tokenId}: ${payload.css};\n  --color-${tokenId}: ${payload.css};`
    )
    .join('\n');

  const aliases = state.snapshot.manifest.aliases
    .map((alias) => `  --${alias.name.replace(/^--/, '')}: var(--color-${alias.tokenId});`)
    .join('\n');

  state.themeVarStyle.textContent = `:root {\n${declarations}\n${aliases}\n}`;
}

function renderPreview(): string {
  if (!state.snapshot) {
    return '<p class="empty-state">Connect from the DevTools panel to render semantic previews.</p>';
  }

  const grayscaleClass = state.snapshot.manifest.alt.grayscalePreview ? 'grayscale' : '';

  return `<section id="preview-stage" class="stage ${grayscaleClass}" data-theme="${state.mode}">
    <div class="hero-grid">
      <button
        type="button"
        data-focus-token="app"
        data-focus-source="preview"
        class="${usageClassList(['app'], 'surface-card surface-card-app')}"
      >
        ${warningBadgeMarkup(['app'])}
        <span class="fixture-label">App</span>
      </button>

      <button
        type="button"
        data-focus-token="shell"
        data-focus-source="preview"
        class="${usageClassList(['shell'], 'surface-card surface-card-shell')}"
      >
        ${warningBadgeMarkup(['shell'])}
        <span class="fixture-label">Shell</span>
      </button>

      <div
        role="button"
        tabindex="0"
        data-keyboard-activate="true"
        data-focus-token="surface"
        data-focus-source="preview"
        class="${usageClassList(
          ['surface', 'surface-raised', 'surface-muted', 'surface-subtle', 'field', 'text'],
          'surface-card surface-card-panel surface-card-panel-interactive'
        )}"
      >
        ${warningBadgeMarkup(['surface', 'surface-raised', 'surface-muted', 'surface-subtle', 'field', 'text'])}
        <span class="fixture-label">Primary surface</span>
        <div class="inner-stack">
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-raised"
            data-focus-source="preview"
            class="${usageClassList(['surface-raised'], 'nested-surface')}"
          >Raised</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-muted"
            data-focus-source="preview"
            class="${usageClassList(['surface-muted'], 'nested-surface nested-muted')}"
          >Muted</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-subtle"
            data-focus-source="preview"
            class="${usageClassList(['surface-subtle'], 'nested-surface nested-subtle')}"
          >Subtle</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="field"
            data-focus-source="preview"
            class="${usageClassList(['field', 'input'], 'nested-surface nested-field')}"
          >Field</button>
        </div>
      </div>
    </div>

    <div class="fixture-shell-wrap" aria-label="Token samples shown on shell background">
      <div class="fixture-grid">
        <article class="fixture-panel">
          <div class="fixture-panel-header"><h3>Text hierarchy</h3></div>
          <div class="text-stack">
            ${TEXT_INVENTORY.filter((tokenId) => hasToken(tokenId))
              .map(
                (tokenId) => `<button
                  type="button"
                  data-focus-token="${tokenId}"
                  data-focus-source="preview"
                  class="${usageClassList([tokenId], `text-sample text-sample-${tokenId}`)}"
                >
                  ${warningBadgeMarkup([tokenId])}
                  <span>${escapeHtml(tokenLabel(tokenId))}</span>
                  <strong>The quick brown fox jumps over the lazy dog.</strong>
                </button>`
              )
              .join('')}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header"><h3>Accent and links</h3></div>
          <div class="accent-grid">
            ${ACCENT_INVENTORY.filter((tokenId) => hasToken(tokenId))
              .map(
                (tokenId) => `<button
                  type="button"
                  data-focus-token="${tokenId}"
                  data-focus-source="preview"
                  class="${usageClassList([tokenId], `accent-sample accent-sample-${tokenId}`)}"
                >
                  ${warningBadgeMarkup([tokenId])}
                  <span>${escapeHtml(tokenLabel(tokenId))}</span>
                </button>`
              )
              .join('')}
          </div>
        </article>

        <div class="fixture-samples-2x2" aria-label="Controls, borders, status pairs, and overlay scrim samples">
          <article class="fixture-panel">
            <div class="fixture-panel-header"><h3>Controls</h3></div>
            <div class="control-grid">
              <button
                type="button"
                data-focus-token="control-primary"
                data-focus-source="preview"
                class="${usageClassList(
                  ['control-primary', 'control-primary-text'],
                  'control-primary'
                )}"
              >
                ${warningBadgeMarkup(['control-primary', 'control-primary-text'])}
                Primary action
              </button>

              <button
                type="button"
                data-focus-token="control-secondary"
                data-focus-source="preview"
                class="${usageClassList(
                  ['control-secondary', 'control-secondary-border', 'control-secondary-text'],
                  'control-secondary'
                )}"
              >
                ${warningBadgeMarkup([
                  'control-secondary',
                  'control-secondary-border',
                  'control-secondary-text'
                ])}
                Secondary
              </button>

              <button
                type="button"
                data-focus-token="control-ghost-hover"
                data-focus-source="preview"
                class="${usageClassList(['control-ghost-hover'], 'control-ghost')}"
              >
                ${warningBadgeMarkup(['control-ghost-hover'])}
                Ghost hover
              </button>

              <label
                data-focus-token="input"
                data-focus-source="preview"
                class="${usageClassList(['input', 'input-border', 'input-placeholder'], 'input-preview')}"
              >
                ${warningBadgeMarkup(['input', 'input-border', 'input-placeholder'])}
                <span>Input field</span>
                <input
                  data-focus-token="input"
                  data-focus-source="preview"
                  data-stop-propagation="true"
                  placeholder="Input placeholder"
                />
              </label>
            </div>
          </article>

          <article class="fixture-panel">
            <div class="fixture-panel-header"><h3>Borders and focus</h3></div>
            <div class="border-grid">
              ${BORDER_INVENTORY.filter((tokenId) => hasToken(tokenId))
                .map(
                  (tokenId) => `<button
                    type="button"
                    data-focus-token="${tokenId}"
                    data-focus-source="preview"
                    class="${usageClassList([tokenId], `border-sample border-sample-${tokenId}`)}"
                  >
                    ${warningBadgeMarkup([tokenId])}
                    ${escapeHtml(tokenLabel(tokenId))}
                  </button>`
                )
                .join('')}
            </div>
          </article>

          <article class="fixture-panel">
            <div class="fixture-panel-header"><h3>Status pairs</h3></div>
            <div class="status-grid">
              ${STATUS_PAIR_STEMS.filter((stem) => hasToken(stem) && hasToken(`${stem}-surface`))
                .map((stem) => {
                  const surfaceToken = `${stem}-surface`;
                  return `<div
                    role="button"
                    tabindex="0"
                    data-keyboard-activate="true"
                    data-focus-token="${surfaceToken}"
                    data-focus-source="preview"
                    class="${usageClassList([stem, surfaceToken], `status-card status-card-${stem}`)}"
                  >
                    ${warningBadgeMarkup([stem, surfaceToken])}
                    <button
                      type="button"
                      data-stop-propagation="true"
                      data-focus-token="${stem}"
                      data-focus-source="preview"
                      class="status-card-text"
                    >
                      <strong>${escapeHtml(stem)}</strong>
                      <span>${escapeHtml(tokenLabel(stem))}</span>
                    </button>
                  </div>`;
                })
                .join('')}
            </div>
          </article>

          <article class="fixture-panel fixture-panel-overlay">
            <div class="fixture-panel-header"><h3>Overlay and scrim</h3></div>
            <div class="overlay-demo">
              <div class="scrim"></div>
              <button
                type="button"
                data-focus-token="surface-overlay"
                data-focus-source="preview"
                class="${usageClassList(['surface-overlay', 'text', 'border'], 'overlay-card')}"
              >
                ${warningBadgeMarkup(['surface-overlay', 'text', 'border'])}
                <strong>Overlay surface</strong>
                <p>Modal, popover, or detached chrome should read from the same semantic surface.</p>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>`;
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
  el.content.querySelectorAll<HTMLElement>('[data-focus-token]').forEach((target) => {
    target.addEventListener('click', (event) => {
      if (target.dataset.stopPropagation === 'true') {
        event.stopPropagation();
      }
      activateFocusTarget(target);
    });
  });

  el.content.querySelectorAll<HTMLElement>('[data-keyboard-activate="true"]').forEach((target) => {
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

  el.content.innerHTML = state.activeTab === 'preview' ? renderPreview() : renderTokenInventory();
  attachFocusHandlers();
}

function applyIncomingState(): void {
  applyThemeVariables();
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
