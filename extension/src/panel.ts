import { BridgeClient } from './shared/bridge-client';
import type { BridgeStatus } from './shared/bridge-client';
import { DEFAULT_BRIDGE_URL, STORAGE_KEYS } from './shared/constants';
import { formatOklch, oklchToCss, parseCssColor, rgbToOklch } from './shared/color';
import { panelPortName } from './shared/messaging';
import type { ContentMessageEnvelope, PanelMessageEnvelope } from './shared/messaging';
import type {
  BridgeSnapshot,
  ContentToPanelMessage,
  ContrastReport,
  CoverageReport,
  HoverElementPayload,
  OklchColor,
  PanelToContentMessage,
  ThemeMode,
  TokenRecord
} from './shared/types';

const tabId = chrome.devtools.inspectedWindow.tabId;

const state = {
  bridgeUrl: DEFAULT_BRIDGE_URL,
  snapshot: null as BridgeSnapshot | null,
  coverage: null as CoverageReport | null,
  highlightedToken: null as string | null,
  overrideTokenId: '' as string,
  overrideColor: { l: 0.5, c: 0.1, h: 240, alpha: 1 } as OklchColor,
  overrideMode: 'both' as 'light' | 'dark' | 'both',
  persistOverride: false,
  activeMode: null as ThemeMode | null,
  tokenFilter: '',
  hoverActive: false,
  pageInfo: { url: '', title: '', theme: null as string | null }
};

const el = {
  status: document.getElementById('bridge-status') as HTMLSpanElement,
  bridgeInput: document.getElementById('bridge-url') as HTMLInputElement,
  bridgeBtn: document.getElementById('bridge-connect') as HTMLButtonElement,
  modeSwitch: document.querySelector('.mode-switch') as HTMLElement,
  tabs: document.querySelectorAll<HTMLButtonElement>('.tabs button'),
  tabPanels: document.querySelectorAll<HTMLElement>('[data-tab-panel]'),
  hoverToggle: document.getElementById('hover-toggle') as HTMLInputElement,
  hoverDetails: document.getElementById('hover-details') as HTMLDivElement,
  pageInfo: document.getElementById('page-info') as HTMLDivElement,
  tokenFilter: document.getElementById('token-filter') as HTMLInputElement,
  tokenList: document.getElementById('token-list') as HTMLDivElement,
  clearHighlight: document.getElementById('clear-highlight') as HTMLButtonElement,
  scanCoverage: document.getElementById('scan-coverage') as HTMLButtonElement,
  coverageSummary: document.getElementById('coverage-summary') as HTMLSpanElement,
  coverageOutput: document.getElementById('coverage-output') as HTMLDivElement,
  scanContrast: document.getElementById('scan-contrast') as HTMLButtonElement,
  contrastSummary: document.getElementById('contrast-summary') as HTMLSpanElement,
  contrastOutput: document.getElementById('contrast-output') as HTMLDivElement,
  overrideToken: document.getElementById('override-token') as HTMLSelectElement,
  overrideSliders: document.getElementById('override-sliders') as HTMLDivElement,
  overrideMode: document.getElementById('override-mode') as HTMLSelectElement,
  overridePersist: document.getElementById('override-persist') as HTMLInputElement,
  clearOverrides: document.getElementById('clear-overrides') as HTMLButtonElement,
  pushOverride: document.getElementById('push-override') as HTMLButtonElement
};

// --- Messaging relay ------------------------------------------------------

const port = chrome.runtime.connect({ name: panelPortName(tabId) });

function sendToContent(payload: PanelToContentMessage): void {
  const envelope: PanelMessageEnvelope = { source: 'panel', tabId, payload };
  port.postMessage(envelope);
}

port.onMessage.addListener((message) => {
  const envelope = message as ContentMessageEnvelope;
  if (envelope?.source !== 'content') return;
  handleContentMessage(envelope.payload);
});

function handleContentMessage(message: ContentToPanelMessage): void {
  switch (message.kind) {
    case 'hello':
    case 'page-info':
      state.pageInfo = {
        url: message.url,
        title: message.title,
        theme: 'theme' in message ? message.theme : null
      };
      renderPageInfo();
      if (!state.activeMode && state.overrideTokenId) {
        syncOverrideFromSnapshot();
        renderOverrideSliders();
      }
      pushSnapshotToContent();
      break;
    case 'hover-element':
      renderHoverDetails(message.payload);
      break;
    case 'hover-cleared':
      renderHoverDetails(null);
      break;
    case 'coverage-report':
      state.coverage = message.report;
      renderCoverage();
      renderTokenList();
      break;
    case 'contrast-report':
      renderContrast(message.report);
      break;
    case 'error':
      console.warn('[semantic-colors] content error:', message.message);
      break;
  }
}

// --- Bridge connection ----------------------------------------------------

const bridge = new BridgeClient({
  getBaseUrl: () => state.bridgeUrl,
  onStatus: setConnectionStatus,
  onSnapshot: (snapshot) => {
    state.snapshot = snapshot;
    renderAll();
    pushSnapshotToContent();
  }
});

function setConnectionStatus(status: BridgeStatus, detail?: string): void {
  el.status.className = `status status-${status}`;
  el.status.textContent = detail ? `${status} · ${detail}` : status;
}

async function loadBridgeUrl(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.bridgeUrl]);
    const value = stored[STORAGE_KEYS.bridgeUrl];
    if (typeof value === 'string' && value.trim()) {
      state.bridgeUrl = value.trim();
    }
  } catch {
    // fall through to default
  }
  el.bridgeInput.value = state.bridgeUrl;
}

async function persistBridgeUrl(value: string): Promise<void> {
  state.bridgeUrl = value;
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.bridgeUrl]: value });
  } catch {
    // ignore
  }
}

// --- Tabs -----------------------------------------------------------------

el.tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    if (!id) return;
    el.tabs.forEach((other) => other.classList.toggle('is-active', other === btn));
    el.tabPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.tabPanel === id);
    });
  });
});

// --- Mode switch ----------------------------------------------------------

el.modeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    el.modeSwitch
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((b) => b.classList.toggle('is-active', b === btn));
    const raw = btn.dataset.mode ?? 'null';
    const mode = raw === 'null' ? null : (raw as ThemeMode);
    state.activeMode = mode;
    if (state.overrideTokenId) {
      syncOverrideFromSnapshot();
      renderOverrideSliders();
    }
    sendToContent({ kind: 'set-theme', mode });
    pushSnapshotToContent();
  });
});

// --- Hover ----------------------------------------------------------------

el.hoverToggle.addEventListener('change', () => {
  state.hoverActive = el.hoverToggle.checked;
  sendToContent({ kind: 'hover-inspector', enabled: state.hoverActive });
});

// --- Token list / highlight ----------------------------------------------

el.tokenFilter.addEventListener('input', () => {
  state.tokenFilter = el.tokenFilter.value.toLowerCase();
  renderTokenList();
});

el.clearHighlight.addEventListener('click', () => {
  state.highlightedToken = null;
  sendToContent({ kind: 'highlight-token', tokenId: null });
  renderTokenList();
});

// --- Coverage + Contrast scans --------------------------------------------

el.scanCoverage.addEventListener('click', () => {
  if (!state.snapshot) return;
  el.coverageSummary.textContent = 'Scanning...';
  sendToContent({
    kind: 'scan-coverage',
    tokenColors: snapshotTokenCss(),
    aliases: state.snapshot.manifest.aliases
  });
});

el.scanContrast.addEventListener('click', () => {
  if (!state.snapshot) return;
  el.contrastSummary.textContent = 'Auditing...';
  sendToContent({
    kind: 'scan-contrast',
    tokenColors: snapshotTokenCss(),
    aliases: state.snapshot.manifest.aliases
  });
});

// --- Overrides ------------------------------------------------------------

el.overrideToken.addEventListener('change', () => {
  state.overrideTokenId = el.overrideToken.value;
  syncOverrideFromSnapshot();
  renderOverrideSliders();
});

el.overrideMode.addEventListener('change', () => {
  state.overrideMode = el.overrideMode.value as typeof state.overrideMode;
});

el.overridePersist.addEventListener('change', () => {
  state.persistOverride = el.overridePersist.checked;
});

el.clearOverrides.addEventListener('click', () => {
  sendToContent({ kind: 'clear-all-overrides' });
});

el.pushOverride.addEventListener('click', async () => {
  if (!state.overrideTokenId) return;
  try {
    await bridge.pushOverride(state.overrideTokenId, state.overrideMode, state.overrideColor, {
      persist: state.persistOverride,
      configPath: state.snapshot?.configPath
    });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'push failed');
  }
});

// --- Bridge connect button ------------------------------------------------

el.bridgeBtn.addEventListener('click', async () => {
  const input = el.bridgeInput.value.trim();
  if (!input) return;
  await persistBridgeUrl(input);
  bridge.stop();
  bridge.start();
});

// --- Rendering helpers ----------------------------------------------------

function snapshotTokenCss(): Record<string, string> {
  if (!state.snapshot) return {};
  const mode = resolvedModeForPreview();
  const resolved = state.snapshot.resolved[mode];
  const out: Record<string, string> = {};
  for (const [tokenId, payload] of Object.entries(resolved.colors)) {
    out[tokenId] = payload.css;
  }
  return out;
}

function resolvedModeForPreview(): ThemeMode {
  if (state.activeMode) return state.activeMode;
  if (state.pageInfo.theme === 'dark' || state.pageInfo.theme === 'alt')
    return state.pageInfo.theme;
  return 'light';
}

function pushSnapshotToContent(): void {
  if (!state.snapshot) return;
  sendToContent({ kind: 'update-snapshot', snapshot: state.snapshot });
}

function renderAll(): void {
  renderTokenList();
  renderOverrideTokenOptions();
  if (!state.overrideTokenId && state.snapshot) {
    state.overrideTokenId = Object.keys(state.snapshot.manifest.tokens)[0] ?? '';
    syncOverrideFromSnapshot();
  }
  renderOverrideSliders();
}

function renderPageInfo(): void {
  el.pageInfo.textContent = state.pageInfo.url
    ? `Inspecting: ${state.pageInfo.title || '(untitled)'} — ${state.pageInfo.url} · data-theme=${state.pageInfo.theme ?? '(none)'}`
    : 'Waiting for inspected page to load...';
}

function renderHoverDetails(payload: HoverElementPayload | null): void {
  if (!payload) {
    el.hoverDetails.innerHTML =
      '<p class="placeholder">Move your mouse over the inspected page to read live token info.</p>';
    return;
  }

  const swatch = (color: string | null) =>
    color ? `<span class="swatch" style="background:${color}"></span>` : '';

  const contrast = payload.contrastLc === null ? '—' : `${payload.contrastLc.toFixed(1)} Lc`;
  const alias = payload.aliasChain.length ? payload.aliasChain.join(', ') : '—';
  const token = payload.matchedToken
    ? `${payload.matchedToken} <span class="meta">(${payload.matchedTokenChannel ?? '—'})</span>`
    : '<em>no token match</em>';

  el.hoverDetails.innerHTML = `
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${escapeHtml(payload.selector)}</code></dd>
      <dt>Token</dt><dd>${token}</dd>
      <dt>Alias</dt><dd>${escapeHtml(alias)}</dd>
      <dt>Color</dt><dd class="swatch-row">${swatch(payload.computedColor)} <code>${escapeHtml(payload.computedColor ?? '—')}</code></dd>
      <dt>Background</dt><dd class="swatch-row">${swatch(payload.computedBackground)} <code>${escapeHtml(payload.computedBackground ?? '—')}</code></dd>
      <dt>APCA</dt><dd>${contrast}</dd>
    </dl>
  `;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
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

function renderTokenList(): void {
  if (!state.snapshot) {
    el.tokenList.innerHTML = '<p class="placeholder">Connect to the engine to load tokens.</p>';
    return;
  }

  const mode = resolvedModeForPreview();
  const resolved = state.snapshot.resolved[mode];
  const filter = state.tokenFilter;

  const parts: string[] = [];
  for (const group of state.snapshot.tokenGroups) {
    const ids = (state.snapshot.tokensByGroup[group] ?? []).filter((id) => id.includes(filter));
    if (!ids.length) continue;
    parts.push(`<div class="token-group-heading">${escapeHtml(group)}</div>`);
    for (const tokenId of ids) {
      const token = state.snapshot.manifest.tokens[tokenId];
      if (!token) continue;
      const color = resolved.colors[tokenId]?.css ?? '';
      const count = state.coverage?.byToken[tokenId];
      const highlighted = state.highlightedToken === tokenId ? ' is-highlighted' : '';
      parts.push(
        `<button class="token-row${highlighted}" data-token-id="${tokenId}">
          <span class="swatch" style="background:${color}"></span>
          <div>
            <div class="token-name">${escapeHtml(token.label)}</div>
            <div class="token-value">${tokenId} · ${escapeHtml(color)}</div>
          </div>
          <span class="token-count">${count === undefined ? '·' : `${count} used`}</span>
          <span aria-hidden="true">›</span>
        </button>`
      );
    }
  }

  el.tokenList.innerHTML = parts.join('');

  el.tokenList.querySelectorAll<HTMLButtonElement>('.token-row').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.dataset.tokenId ?? null;
      if (!id) return;
      state.highlightedToken = state.highlightedToken === id ? null : id;
      sendToContent({ kind: 'highlight-token', tokenId: state.highlightedToken });
      renderTokenList();
    });
  });
}

function renderCoverage(): void {
  const coverage = state.coverage;
  if (!coverage) {
    el.coverageOutput.innerHTML = '<p class="placeholder">Run a scan to see token usage.</p>';
    el.coverageSummary.textContent = '';
    return;
  }

  const used = Object.entries(coverage.byToken).filter(([, n]) => n > 0).length;
  const total = Object.keys(coverage.byToken).length;
  el.coverageSummary.textContent = `${coverage.totalElements} elements · ${used}/${total} tokens used · ${coverage.rawColorViolations.length} raw colors`;

  const top = [...Object.entries(coverage.byToken)]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const unused = coverage.unusedTokens.slice(0, 20);
  const violations = coverage.rawColorViolations.slice(0, 20);

  el.coverageOutput.innerHTML = `
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${top
        .map(
          ([tokenId, count]) =>
            `<div class="report-item"><span>${escapeHtml(tokenId)}</span><span class="meta">${count} elements</span><span></span></div>`
        )
        .join('')}
    </div>
    <p class="report-subhead">Unused tokens (${unused.length})</p>
    <div class="report-list">
      ${unused.map((id) => `<div class="report-item"><span>${escapeHtml(id)}</span><span class="meta">0</span><span></span></div>`).join('')}
    </div>
    <p class="report-subhead">Raw color violations (${violations.length})</p>
    <div class="report-list">
      ${violations
        .map(
          (v) =>
            `<div class="report-item severity-warn"><span><code>${escapeHtml(v.selector)}</code></span><span class="meta">${escapeHtml(v.property)}: ${escapeHtml(v.value)}</span><span></span></div>`
        )
        .join('')}
    </div>
  `;
}

function renderContrast(report: ContrastReport): void {
  el.contrastSummary.textContent = `${report.sampled} sampled · ${report.findings.length} potential failures`;
  if (!report.findings.length) {
    el.contrastOutput.innerHTML =
      '<p class="placeholder">No APCA failures detected in the sampled text elements.</p>';
    return;
  }

  el.contrastOutput.innerHTML = `
    <div class="report-list">
      ${report.findings
        .map(
          (finding) => `
          <div class="report-item severity-${finding.severity}">
            <span>
              <code>${escapeHtml(finding.selector)}</code>
              <div class="meta">${escapeHtml(finding.context || '—')}</div>
            </span>
            <span class="meta">
              fg ${escapeHtml(finding.foregroundToken ?? finding.foreground)}
              · bg ${escapeHtml(finding.backgroundToken ?? finding.background)}
            </span>
            <span class="meta">${finding.contrastLc.toFixed(1)} Lc</span>
          </div>
        `
        )
        .join('')}
    </div>
  `;
}

// --- Overrides ------------------------------------------------------------

function renderOverrideTokenOptions(): void {
  if (!state.snapshot) return;
  const tokens = Object.values(state.snapshot.manifest.tokens) as TokenRecord[];
  el.overrideToken.innerHTML = tokens
    .map((token) => `<option value="${token.id}">${escapeHtml(token.label)} (${token.id})</option>`)
    .join('');
  if (state.overrideTokenId) el.overrideToken.value = state.overrideTokenId;
}

function syncOverrideFromSnapshot(): void {
  if (!state.snapshot || !state.overrideTokenId) return;
  const token = state.snapshot.manifest.tokens[state.overrideTokenId];
  if (!token) return;
  const mode = resolvedModeForPreview();
  if (mode === 'alt') {
    const resolvedAlt = state.snapshot.resolved.alt.colors[state.overrideTokenId];
    if (resolvedAlt) {
      state.overrideColor = {
        l: resolvedAlt.l,
        c: resolvedAlt.c,
        h: resolvedAlt.h,
        alpha: resolvedAlt.alpha
      };
      return;
    }
  }
  state.overrideColor = { ...(mode === 'dark' ? token.dark : token.light) };
}

function renderOverrideSliders(): void {
  const color = state.overrideColor;
  const channels: Array<{
    key: 'l' | 'c' | 'h';
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    { key: 'l', label: 'L', min: 0, max: 1, step: 0.001 },
    { key: 'c', label: 'C', min: 0, max: 0.4, step: 0.001 },
    { key: 'h', label: 'H', min: 0, max: 360, step: 0.1 }
  ];

  const preview = oklchToCss(color);
  el.overrideSliders.innerHTML = `
    <div class="override-preview">
      <div class="preview-swatch" style="background:${preview}"></div>
      <code>${escapeHtml(formatOklch(color))}</code>
    </div>
    ${channels
      .map(
        (ch) => `
        <div class="slider-row">
          <span class="channel">${ch.label}</span>
          <input type="range" min="${ch.min}" max="${ch.max}" step="${ch.step}" value="${color[ch.key]}" data-channel="${ch.key}" />
          <span class="readout">${color[ch.key].toFixed(ch.key === 'h' ? 2 : 3)}</span>
        </div>
      `
      )
      .join('')}
  `;

  el.overrideSliders.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((input) => {
    input.addEventListener('input', () => {
      const channel = input.dataset.channel as 'l' | 'c' | 'h';
      state.overrideColor = { ...state.overrideColor, [channel]: Number(input.value) };
      renderOverrideSliders();
      if (state.overrideTokenId) {
        sendToContent({
          kind: 'override-token',
          tokenId: state.overrideTokenId,
          css: oklchToCss(state.overrideColor)
        });
      }
    });
  });
}

// --- Init -----------------------------------------------------------------

(async () => {
  await loadBridgeUrl();
  bridge.start();
  sendToContent({ kind: 'ping' });
  renderHoverDetails(null);
  renderPageInfo();
  renderCoverage();
})();

// Avoid unused import warnings for helpers used only conditionally.
void parseCssColor;
void rgbToOklch;
