import { BridgeClient } from './shared/bridge-client';
import type { BridgeStatus } from './shared/bridge-client';
import { DEFAULT_BRIDGE_URL, STORAGE_KEYS } from './shared/constants';
import {
  formatOklch,
  hsvToRgb,
  oklchToCss,
  oklchToHex,
  oklchToRgb,
  pickerPointToHsv,
  pickerPositionFromHsv,
  rgbToHsv,
  rgbToOklch
} from './shared/color';
import {
  addAlias,
  applyImportReview,
  primaryTokenFromSelection,
  removeAlias,
  resolvedModeForSnapshot,
  resetManifest,
  updateAlias,
  updateAltSettings,
  updateTokenColor,
  updateTokenException,
  validationNotes
} from './shared/draft';
import { panelPortName } from './shared/messaging';
import type { ContentMessageEnvelope, PanelMessageEnvelope } from './shared/messaging';
import type {
  BridgeSnapshot,
  ContentToPanelMessage,
  ContrastReport,
  CoverageReport,
  HoverElementPayload,
  ImportProposal,
  OklchColor,
  PanelToContentMessage,
  ThemeMode,
  TokenRecord
} from './shared/types';

const tabId = chrome.devtools.inspectedWindow.tabId;
const PICKER_PANEL_BACKGROUND =
  'linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';

const OKLCH_CHANNEL_LABEL: Record<'l' | 'c' | 'h', string> = {
  l: 'Lightness',
  c: 'Chroma',
  h: 'Hue'
};

const state = {
  bridgeUrl: DEFAULT_BRIDGE_URL,
  snapshot: null as BridgeSnapshot | null,
  coverage: null as CoverageReport | null,
  contrast: null as ContrastReport | null,
  highlightedToken: null as string | null,
  focusedTokenId: '' as string,
  overrideTokenId: '' as string,
  overrideColor: { l: 0.5, c: 0.1, h: 240, alpha: 1 } as OklchColor,
  overrideMode: 'both' as 'light' | 'dark' | 'both',
  persistOverride: false,
  activeMode: null as ThemeMode | null,
  tokenFilter: '',
  hoverActive: false,
  hoveredElement: null as HoverElementPayload | null,
  selectedElement: null as HoverElementPayload | null,
  pageInfo: { url: '', title: '', theme: null as string | null },
  importSourcePath: '',
  importProposal: null as ImportProposal | null,
  importSelection: {} as Record<string, string>,
  pickerDrag: null as {
    tokenId: string;
    mode: 'light' | 'dark';
    rect: DOMRect;
  } | null
};

const el = {
  status: document.getElementById('bridge-status') as HTMLSpanElement,
  bridgeInput: document.getElementById('bridge-url') as HTMLInputElement,
  bridgeBtn: document.getElementById('bridge-connect') as HTMLButtonElement,
  modeSwitch: document.querySelector('.mode-switch') as HTMLElement,
  draftStatus: document.getElementById('draft-status') as HTMLDivElement,
  commitDraft: document.getElementById('commit-draft') as HTMLButtonElement,
  discardDraft: document.getElementById('discard-draft') as HTMLButtonElement,
  resetManifest: document.getElementById('reset-manifest') as HTMLButtonElement,
  tabs: document.querySelectorAll<HTMLButtonElement>('.tabs button'),
  tabPanels: document.querySelectorAll<HTMLElement>('[data-tab-panel]'),
  hoverToggle: document.getElementById('hover-toggle') as HTMLInputElement,
  clearSelection: document.getElementById('clear-selection') as HTMLButtonElement,
  pageInfo: document.getElementById('page-info') as HTMLDivElement,
  selectionDetails: document.getElementById('selection-details') as HTMLDivElement,
  hoverDetails: document.getElementById('hover-details') as HTMLDivElement,
  editorToken: document.getElementById('editor-token') as HTMLSelectElement,
  tokenEditor: document.getElementById('token-editor') as HTMLDivElement,
  tokenValidation: document.getElementById('token-validation') as HTMLDivElement,
  modeEditor: document.getElementById('mode-editor') as HTMLDivElement,
  aliasList: document.getElementById('alias-list') as HTMLDivElement,
  addAlias: document.getElementById('add-alias') as HTMLButtonElement,
  addAliasCurrent: document.getElementById('add-alias-current') as HTMLButtonElement,
  importSourcePath: document.getElementById('import-source-path') as HTMLInputElement,
  scanImport: document.getElementById('scan-import') as HTMLButtonElement,
  applyImportReview: document.getElementById('apply-import-review') as HTMLButtonElement,
  importStatus: document.getElementById('import-status') as HTMLDivElement,
  importReview: document.getElementById('import-review') as HTMLDivElement,
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
      if (state.snapshot) pushSnapshotToContent();
      break;
    case 'hover-element':
      state.hoveredElement = message.payload;
      renderInspect();
      break;
    case 'selected-element':
      state.selectedElement = message.payload;
      if (!state.focusedTokenId) {
        state.focusedTokenId = primaryTokenFromSelection(message.payload) ?? state.focusedTokenId;
      }
      renderAll();
      break;
    case 'hover-cleared':
      state.hoveredElement = null;
      renderInspect();
      break;
    case 'selection-cleared':
      state.selectedElement = null;
      renderInspect();
      break;
    case 'coverage-report':
      state.coverage = message.report;
      renderCoverage();
      renderTokenList();
      break;
    case 'contrast-report':
      state.contrast = message.report;
      renderContrast();
      break;
    case 'error':
      console.warn('[semantic-colors] content error:', message.message);
      break;
  }
}

const bridge = new BridgeClient({
  getBaseUrl: () => state.bridgeUrl,
  onStatus: setConnectionStatus,
  onSnapshot: (snapshot) => {
    state.snapshot = snapshot;
    if (!state.focusedTokenId) {
      state.focusedTokenId =
        primaryTokenFromSelection(state.selectedElement) ??
        Object.keys(snapshot.manifest.tokens)[0] ??
        '';
    }
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

function setActiveTab(id: string): void {
  el.tabs.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === id);
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.tabPanel === id);
  });
}

el.tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    if (!id) return;
    setActiveTab(id);
  });
});

el.modeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    el.modeSwitch
      .querySelectorAll<HTMLButtonElement>('button')
      .forEach((button) => button.classList.toggle('is-active', button === btn));
    const raw = btn.dataset.mode ?? 'null';
    state.activeMode = raw === 'null' ? null : (raw as ThemeMode);
    sendToContent({ kind: 'set-theme', mode: state.activeMode });
    if (state.overrideTokenId) {
      syncOverrideFromSnapshot();
    }
    renderAll();
    pushSnapshotToContent();
  });
});

el.hoverToggle.addEventListener('change', () => {
  state.hoverActive = el.hoverToggle.checked;
  sendToContent({ kind: 'hover-inspector', enabled: state.hoverActive });
});

el.clearSelection.addEventListener('click', () => {
  state.selectedElement = null;
  sendToContent({ kind: 'clear-selection' });
  renderInspect();
});

el.commitDraft.addEventListener('click', async () => {
  if (!state.snapshot) return;
  try {
    await bridge.commitDraft({ configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'commit failed');
  }
});

el.discardDraft.addEventListener('click', async () => {
  if (!state.snapshot) return;
  try {
    await bridge.discardDraft({ configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'discard failed');
  }
});

el.resetManifest.addEventListener('click', async () => {
  if (!state.snapshot) return;
  try {
    await bridge.applyDraft([resetManifest()], { configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'reset failed');
  }
});

el.editorToken.addEventListener('change', () => {
  state.focusedTokenId = el.editorToken.value;
  renderAuthoring();
  renderTokenList();
});

el.addAlias.addEventListener('click', async () => {
  if (!state.snapshot) return;
  const fallbackToken = state.focusedTokenId || Object.keys(state.snapshot.manifest.tokens)[0];
  if (!fallbackToken) return;
  try {
    await bridge.applyDraft([addAlias('color-new-alias', fallbackToken)], {
      configPath: state.snapshot.configPath
    });
    setActiveTab('aliases');
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'alias add failed');
  }
});

el.addAliasCurrent.addEventListener('click', async () => {
  if (!state.snapshot || !state.focusedTokenId) return;
  try {
    await bridge.applyDraft([addAlias(`color-${state.focusedTokenId}`, state.focusedTokenId)], {
      configPath: state.snapshot.configPath
    });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'alias add failed');
  }
});

el.importSourcePath.addEventListener('input', () => {
  state.importSourcePath = el.importSourcePath.value;
});

el.scanImport.addEventListener('click', async () => {
  if (!state.snapshot || !state.importSourcePath.trim()) return;
  el.importStatus.textContent = 'Scanning CSS variables...';
  try {
    const response = await fetch(`${state.bridgeUrl}/api/project/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        configPath: state.snapshot.configPath,
        sourcePath: state.importSourcePath.trim()
      })
    });
    if (!response.ok) {
      throw new Error(`Import scan failed with status ${response.status}`);
    }
    state.importProposal = (await response.json()) as ImportProposal;
    state.importSelection = Object.fromEntries(
      state.importProposal.candidates.map((candidate) => [
        candidate.sourceName,
        candidate.suggestedTokenId ?? ''
      ])
    );
    el.importStatus.textContent = `Loaded ${state.importProposal.candidates.length} candidates.`;
    renderImportReview();
  } catch (error) {
    el.importStatus.textContent = error instanceof Error ? error.message : 'Import scan failed.';
  }
});

el.applyImportReview.addEventListener('click', async () => {
  if (!state.snapshot || !state.importProposal) return;
  try {
    await bridge.applyDraft([applyImportReview(state.importProposal, state.importSelection)], {
      configPath: state.snapshot.configPath
    });
    state.importProposal = null;
    state.importSelection = {};
    el.importStatus.textContent = 'Applied reviewed mappings into the draft manifest.';
    renderImportReview();
  } catch (error) {
    el.importStatus.textContent = error instanceof Error ? error.message : 'Import apply failed.';
  }
});

el.tokenFilter.addEventListener('input', () => {
  state.tokenFilter = el.tokenFilter.value.toLowerCase();
  renderTokenList();
});

el.clearHighlight.addEventListener('click', () => {
  state.highlightedToken = null;
  sendToContent({ kind: 'highlight-token', tokenId: null });
  renderTokenList();
});

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

el.bridgeBtn.addEventListener('click', async () => {
  const input = el.bridgeInput.value.trim();
  if (!input) return;
  await persistBridgeUrl(input);
  bridge.stop();
  bridge.start();
});

function resolvedModeForPreview(): ThemeMode {
  if (!state.snapshot) return 'light';
  return resolvedModeForSnapshot(state.snapshot, state.activeMode, state.pageInfo.theme);
}

function snapshotTokenCss(): Record<string, string> {
  if (!state.snapshot) return {};
  const resolved = state.snapshot.resolved[resolvedModeForPreview()];
  const out: Record<string, string> = {};
  for (const [tokenId, payload] of Object.entries(resolved.colors)) {
    out[tokenId] = payload.css;
  }
  return out;
}

function pushSnapshotToContent(): void {
  if (!state.snapshot) return;
  sendToContent({ kind: 'update-snapshot', snapshot: state.snapshot });
}

function renderAll(): void {
  renderDraftStatus();
  renderPageInfo();
  renderInspect();
  renderEditorTokenOptions();
  renderAuthoring();
  renderAliasList();
  renderImportReview();
  renderTokenList();
  renderCoverage();
  renderContrast();
  renderOverrideTokenOptions();
  if (!state.overrideTokenId && state.snapshot) {
    state.overrideTokenId = Object.keys(state.snapshot.manifest.tokens)[0] ?? '';
    syncOverrideFromSnapshot();
  }
  renderOverrideSliders();
}

function renderDraftStatus(): void {
  if (!state.snapshot) {
    el.draftStatus.textContent = 'Waiting for bridge snapshot...';
    return;
  }

  const status = state.snapshot.draft.dirty
    ? `Draft dirty · base v${state.snapshot.draft.baseVersion} · last edit ${state.snapshot.draft.lastEditor}`
    : `Draft clean · synced at v${state.snapshot.version}`;
  el.draftStatus.textContent = status;
}

function renderPageInfo(): void {
  el.pageInfo.textContent = state.pageInfo.url
    ? `Inspecting: ${state.pageInfo.title || '(untitled)'} — ${state.pageInfo.url} · data-theme=${state.pageInfo.theme ?? '(none)'}`
    : 'Waiting for inspected page to load...';
}

function swatch(color: string | null): string {
  return color ? `<span class="swatch" style="background:${escapeHtml(color)}"></span>` : '';
}

function renderTokenMatches(payload: HoverElementPayload): string {
  return `
    <div class="token-match-list">
      ${payload.matches
        .map((match) => {
          const label = match.tokenId ? escapeHtml(match.tokenId) : 'No token match';
          const aliases = match.aliases.length ? ` · ${escapeHtml(match.aliases.join(', '))}` : '';
          const button = match.tokenId
            ? `<button type="button" data-focus-token="${escapeHtml(match.tokenId)}">${label}</button>`
            : label;
          return `
            <div class="report-item">
              <span>
                <strong>${escapeHtml(match.channel)}</strong>
                <div class="meta">${escapeHtml(match.cssValue ?? '—')}</div>
              </span>
              <span class="token-chip">${swatch(match.cssValue)} ${button}</span>
              <span class="meta">${aliases || '—'}</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function attachTokenChipHandlers(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('[data-focus-token]').forEach((button) => {
    button.addEventListener('click', () => {
      const tokenId = button.dataset.focusToken;
      if (!tokenId) return;
      focusToken(tokenId, true, true);
    });
  });
}

function renderElementPanel(
  container: HTMLElement,
  payload: HoverElementPayload | null,
  emptyText: string
): void {
  if (!payload) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(emptyText)}</p>`;
    return;
  }

  const contrast = payload.contrastLc === null ? '—' : `${payload.contrastLc.toFixed(1)} Lc`;
  container.innerHTML = `
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${escapeHtml(payload.selector)}</code></dd>
      <dt>Colors</dt><dd>${swatch(payload.computedColor)} <code>${escapeHtml(payload.computedColor ?? '—')}</code></dd>
      <dt>Background</dt><dd>${swatch(payload.computedBackground)} <code>${escapeHtml(payload.computedBackground ?? '—')}</code></dd>
      <dt>Border</dt><dd>${swatch(payload.computedBorder)} <code>${escapeHtml(payload.computedBorder ?? '—')}</code></dd>
      <dt>APCA</dt><dd>${contrast}</dd>
    </dl>
    <p class="report-subhead">Matched channels</p>
    ${renderTokenMatches(payload)}
  `;
  attachTokenChipHandlers(container);
}

function renderInspect(): void {
  renderElementPanel(
    el.selectionDetails,
    state.selectedElement,
    'Click a page element while inspect mode is enabled to lock its context.'
  );
  renderElementPanel(
    el.hoverDetails,
    state.hoveredElement,
    'Move your mouse over the inspected page to preview live token info.'
  );
}

function tokenRecords(): TokenRecord[] {
  if (!state.snapshot) return [];
  return Object.values(state.snapshot.manifest.tokens) as TokenRecord[];
}

function tokenRecord(tokenId: string): TokenRecord | null {
  return state.snapshot?.manifest.tokens[tokenId] ?? null;
}

function tokenAnchorColor(token: TokenRecord, mode: 'light' | 'dark'): OklchColor {
  return mode === 'dark' ? token.dark : token.light;
}

function pickerMarkup(mode: 'light' | 'dark', color: OklchColor): string {
  const hexValue = oklchToHex(color);
  const rgbValue = oklchToRgb(color);
  const hsvValue = rgbToHsv({ r: rgbValue.r, g: rgbValue.g, b: rgbValue.b });
  const pointer = pickerPositionFromHsv(hsvValue);

  return `
    <div class="picker-shell">
      <div class="picker-stack">
        <div class="picker-swatch-row">
          <div
            class="picker-swatch"
            style="background-color:${escapeHtml(hexValue)}"
            aria-label="${mode} anchor selected color preview"
          ></div>
        </div>
        <div
          class="picker-panel"
          style="background:${PICKER_PANEL_BACKGROUND}"
          role="slider"
          tabindex="0"
          aria-label="${mode} anchor hue and brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${Math.round(hsvValue.v)}"
          aria-valuetext="${escapeHtml(`Hue: ${Math.round(hsvValue.h)}°, Saturation: ${Math.round(hsvValue.s)}%, Value: ${Math.round(hsvValue.v)}%`)}"
          data-picker-plane="${mode}"
        >
          <div
            class="picker-handle"
            style="left:${pointer.xPercent}; top:${pointer.yPercent};"
          ></div>
        </div>
      </div>
    </div>
  `;
}

function renderEditorTokenOptions(): void {
  if (!state.snapshot) {
    el.editorToken.innerHTML = '<option value="">Connect to the engine first</option>';
    return;
  }

  const tokens = tokenRecords();
  el.editorToken.innerHTML = tokens
    .map((token) => `<option value="${token.id}">${escapeHtml(token.label)} (${token.id})</option>`)
    .join('');

  if (!state.focusedTokenId) {
    state.focusedTokenId = tokens[0]?.id ?? '';
  }
  el.editorToken.value = state.focusedTokenId;
}

function sliderMarkup(
  prefix: string,
  channel: 'l' | 'c' | 'h',
  value: number,
  min: number,
  max: number,
  step: number
): string {
  return `
    <div class="slider-row">
      <span>${escapeHtml(OKLCH_CHANNEL_LABEL[channel])}</span>
      <input
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${value}"
        data-slider-prefix="${prefix}"
        data-channel="${channel}"
      />
      <input
        type="number"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${value}"
        data-slider-prefix="${prefix}"
        data-channel="${channel}"
      />
    </div>
  `;
}

async function applyTokenColorChange(
  tokenId: string,
  mode: 'light' | 'dark',
  channel: 'l' | 'c' | 'h',
  value: number
): Promise<void> {
  const token = tokenRecord(tokenId);
  if (!token || !state.snapshot) return;
  const color = { ...(mode === 'dark' ? token.dark : token.light), [channel]: value };
  await applyTokenModeColor(tokenId, mode, color);
}

async function applyTokenModeColor(
  tokenId: string,
  mode: 'light' | 'dark',
  color: OklchColor
): Promise<void> {
  if (!state.snapshot) return;
  await bridge.applyDraft([updateTokenColor(tokenId, mode, color)], {
    configPath: state.snapshot.configPath
  });
}

async function applyPickerHsv(
  tokenId: string,
  mode: 'light' | 'dark',
  hue: number,
  saturation: number,
  value: number
): Promise<void> {
  const rgb = hsvToRgb({ h: hue, s: saturation, v: value });
  await applyTokenModeColor(tokenId, mode, rgbToOklch(rgb.r, rgb.g, rgb.b));
}

async function applyPickerPoint(
  tokenId: string,
  mode: 'light' | 'dark',
  rect: DOMRect,
  clientX: number,
  clientY: number
): Promise<void> {
  const hsv = pickerPointToHsv(rect.width, rect.height, clientX - rect.left, clientY - rect.top);
  await applyPickerHsv(tokenId, mode, hsv.h, hsv.s, hsv.v);
}

function pickerModeFromDataset(value: string | undefined): 'light' | 'dark' | null {
  return value === 'light' || value === 'dark' ? value : null;
}

function attachTokenEditorHandlers(tokenId: string): void {
  el.tokenEditor.querySelectorAll<HTMLInputElement>('[data-slider-prefix]').forEach((input) => {
    input.addEventListener('input', async () => {
      const prefix = input.dataset.sliderPrefix;
      const channel = input.dataset.channel as 'l' | 'c' | 'h' | undefined;
      if (!prefix || !channel) return;
      try {
        await applyTokenColorChange(
          tokenId,
          prefix as 'light' | 'dark',
          channel,
          Number(input.value)
        );
      } catch (error) {
        setConnectionStatus(
          'error',
          error instanceof Error ? error.message : 'token update failed'
        );
      }
    });
  });

  el.tokenEditor.querySelectorAll<HTMLElement>('[data-picker-plane]').forEach((plane) => {
    plane.addEventListener('pointerdown', (event) => {
      const mode = pickerModeFromDataset(plane.dataset.pickerPlane);
      if (!mode || !(event.currentTarget instanceof HTMLDivElement)) return;

      state.pickerDrag = {
        tokenId,
        mode,
        rect: event.currentTarget.getBoundingClientRect()
      };

      void applyPickerPoint(
        tokenId,
        mode,
        state.pickerDrag.rect,
        event.clientX,
        event.clientY
      ).catch((error) => {
        setConnectionStatus(
          'error',
          error instanceof Error ? error.message : 'token update failed'
        );
      });
    });

    plane.addEventListener('keydown', (event) => {
      const mode = pickerModeFromDataset(plane.dataset.pickerPlane);
      if (!mode) return;

      const token = tokenRecord(tokenId);
      if (!token) return;

      const currentColor = tokenAnchorColor(token, mode);
      const rgb = oklchToRgb(currentColor);
      const hsv = rgbToHsv({ r: rgb.r, g: rgb.g, b: rgb.b });
      const pointer = pickerPositionFromHsv(hsv);
      let nextX = Number.parseFloat(pointer.xPercent);
      let nextY = Number.parseFloat(pointer.yPercent);

      if (event.key === 'ArrowLeft') {
        nextX -= 2;
      } else if (event.key === 'ArrowRight') {
        nextX += 2;
      } else if (event.key === 'ArrowUp') {
        nextY -= 2;
      } else if (event.key === 'ArrowDown') {
        nextY += 2;
      } else {
        return;
      }

      event.preventDefault();
      const nextHsv = pickerPointToHsv(100, 100, nextX, nextY);
      void applyPickerHsv(tokenId, mode, nextHsv.h, nextHsv.s, nextHsv.v).catch((error) => {
        setConnectionStatus(
          'error',
          error instanceof Error ? error.message : 'token update failed'
        );
      });
    });
  });

  el.tokenEditor
    .querySelectorAll<HTMLSelectElement>('[data-token-exception], [data-token-max-chroma]')
    .forEach((field) => {
      const handler = async () => {
        try {
          const altBehavior = (
            el.tokenEditor.querySelector('[data-token-exception]') as HTMLSelectElement | null
          )?.value as 'derive' | 'pin' | 'exclude' | undefined;
          const maxChromaRaw = (
            el.tokenEditor.querySelector('[data-token-max-chroma]') as HTMLInputElement | null
          )?.value;
          await bridge.applyDraft(
            [
              updateTokenException(tokenId, {
                altBehavior,
                maxChroma: maxChromaRaw === '' ? null : Number(maxChromaRaw)
              })
            ],
            { configPath: state.snapshot?.configPath }
          );
        } catch (error) {
          setConnectionStatus(
            'error',
            error instanceof Error ? error.message : 'exception update failed'
          );
        }
      };

      field.addEventListener('change', handler);
      field.addEventListener('input', handler);
    });
}

function attachModeEditorHandlers(): void {
  el.modeEditor
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-alt-setting]')
    .forEach((field) => {
      const apply = async () => {
        if (!state.snapshot) return;
        const setting = field.dataset.altSetting;
        if (!setting) return;

        let patch: Parameters<typeof updateAltSettings>[0];
        if (setting === 'source') {
          patch = { source: (field as HTMLSelectElement).value as 'light' | 'dark' };
        } else if (setting === 'harmonyLock') {
          patch = { harmonyLock: (field as HTMLInputElement).checked };
        } else if (setting === 'grayscalePreview') {
          patch = { grayscalePreview: (field as HTMLInputElement).checked };
        } else {
          patch = {
            delta: {
              [setting]: Number((field as HTMLInputElement).value)
            }
          };
        }

        try {
          await bridge.applyDraft([updateAltSettings(patch)], {
            configPath: state.snapshot.configPath
          });
        } catch (error) {
          setConnectionStatus(
            'error',
            error instanceof Error ? error.message : 'alt update failed'
          );
        }
      };

      field.addEventListener('change', apply);
      field.addEventListener('input', apply);
    });
}

function renderAuthoring(): void {
  if (!state.snapshot || !state.focusedTokenId) {
    el.tokenEditor.innerHTML = '<p class="empty-state">Select a token to edit it.</p>';
    el.modeEditor.innerHTML =
      '<p class="empty-state">Connect to the engine to edit theme state.</p>';
    el.tokenValidation.innerHTML = '<p class="empty-state">No validation details yet.</p>';
    return;
  }

  const token = tokenRecord(state.focusedTokenId);
  if (!token) {
    el.tokenEditor.innerHTML = '<p class="empty-state">Selected token is unavailable.</p>';
    return;
  }

  const resolvedMode = resolvedModeForPreview();
  const resolvedColor = state.snapshot.resolved[resolvedMode].colors[token.id];
  const notes = validationNotes(state.snapshot, token.id, resolvedMode);

  el.tokenEditor.innerHTML = `
    <div class="preview-row">
      <span class="swatch" style="background:${escapeHtml(oklchToCss(resolvedColor))}"></span>
      <div>
        <strong>${escapeHtml(token.label)}</strong>
        <div class="meta">${escapeHtml(token.description)}</div>
        <code>${escapeHtml(formatOklch(resolvedColor))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      <div class="anchor-editor-layout">
        ${pickerMarkup('light', token.light)}
        <div class="anchor-slider-stack">
          ${sliderMarkup('light', 'l', token.light.l, 0, 1, 0.005)}
          ${sliderMarkup('light', 'c', token.light.c, 0, 0.37, 0.005)}
          ${sliderMarkup('light', 'h', token.light.h, 0, 360, 1)}
        </div>
      </div>
    </div>
    <div class="editor-block">
      <h3>Dark anchor</h3>
      <div class="anchor-editor-layout">
        ${pickerMarkup('dark', token.dark)}
        <div class="anchor-slider-stack">
          ${sliderMarkup('dark', 'l', token.dark.l, 0, 1, 0.005)}
          ${sliderMarkup('dark', 'c', token.dark.c, 0, 0.37, 0.005)}
          ${sliderMarkup('dark', 'h', token.dark.h, 0, 360, 1)}
        </div>
      </div>
    </div>
    <div class="editor-block">
      <h3>Alt exception</h3>
      <div class="field-grid">
        <label class="field-block">
          <span>Alt behavior</span>
          <select data-token-exception>
            <option value="derive" ${token.exception.altBehavior === 'derive' ? 'selected' : ''}>Derive</option>
            <option value="pin" ${token.exception.altBehavior === 'pin' ? 'selected' : ''}>Pin to source anchor</option>
            <option value="exclude" ${token.exception.altBehavior === 'exclude' ? 'selected' : ''}>Exclude from Alt</option>
          </select>
        </label>
        <label class="field-block">
          <span>Max chroma</span>
          <input type="number" min="0" max="0.37" step="0.005" value="${token.exception.maxChroma ?? ''}" data-token-max-chroma />
        </label>
      </div>
      <div class="meta">${
        token.altParent
          ? `Alt derives from ${escapeHtml(token.altParent)}.`
          : 'No alt parent override.'
      }</div>
    </div>
  `;

  el.modeEditor.innerHTML = `
    <div class="editor-block">
      <div class="field-grid">
        <label class="field-block">
          <span>Alt base</span>
          <select data-alt-setting="source">
            <option value="light" ${state.snapshot.manifest.alt.source === 'light' ? 'selected' : ''}>Derive from Light</option>
            <option value="dark" ${state.snapshot.manifest.alt.source === 'dark' ? 'selected' : ''}>Derive from Dark</option>
          </select>
        </label>
        <label class="field-block">
          <span>Lock harmony</span>
          <input type="checkbox" ${state.snapshot.manifest.alt.harmonyLock ? 'checked' : ''} data-alt-setting="harmonyLock" />
        </label>
      </div>
      <label class="switch">
        <input type="checkbox" ${state.snapshot.manifest.alt.grayscalePreview ? 'checked' : ''} data-alt-setting="grayscalePreview" />
        <span>Greyscale hierarchy overlay</span>
      </label>
    </div>
    <div class="editor-block">
      <h3>Alt deltas</h3>
      ${sliderMarkup('alt', 'h', state.snapshot.manifest.alt.delta.h, -180, 180, 1).replaceAll(
        'data-slider-prefix="alt"',
        'data-alt-setting="h"'
      )}
      ${sliderMarkup(
        'alt',
        'c',
        state.snapshot.manifest.alt.delta.c,
        -0.16,
        0.16,
        0.005
      ).replaceAll('data-slider-prefix="alt"', 'data-alt-setting="c"')}
      ${sliderMarkup('alt', 'l', state.snapshot.manifest.alt.delta.l, -0.2, 0.2, 0.01).replaceAll(
        'data-slider-prefix="alt"',
        'data-alt-setting="l"'
      )}
    </div>
  `;

  el.tokenValidation.innerHTML = notes.length
    ? `<div class="report-list">${notes
        .map(
          (note) =>
            `<div class="report-item severity-warn"><span>${escapeHtml(note)}</span><span></span><span></span></div>`
        )
        .join('')}</div>`
    : '<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>';

  attachTokenEditorHandlers(token.id);
  attachModeEditorHandlers();
}

function renderAliasList(): void {
  if (!state.snapshot) {
    el.aliasList.innerHTML = '<p class="empty-state">Connect to the engine to edit aliases.</p>';
    return;
  }

  if (state.snapshot.manifest.aliases.length === 0) {
    el.aliasList.innerHTML =
      '<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';
    return;
  }

  el.aliasList.innerHTML = `
    <div class="alias-list">
      ${state.snapshot.manifest.aliases
        .map(
          (alias, index) => `
            <div class="alias-row">
              <input type="text" value="${escapeHtml(alias.name)}" data-alias-index="${index}" data-alias-field="name" />
              <select data-alias-index="${index}" data-alias-field="tokenId">
                ${tokenRecords()
                  .map(
                    (token) => `
                      <option value="${token.id}" ${token.id === alias.tokenId ? 'selected' : ''}>
                        ${escapeHtml(token.label)}
                      </option>
                    `
                  )
                  .join('')}
              </select>
              <button type="button" data-remove-alias="${index}" class="secondary">Remove</button>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  el.aliasList.querySelectorAll<HTMLElement>('[data-alias-index]').forEach((field) => {
    const apply = async () => {
      if (!state.snapshot) return;
      const index = Number(field.dataset.aliasIndex);
      const patch =
        field.dataset.aliasField === 'name'
          ? { name: (field as HTMLInputElement).value }
          : { tokenId: (field as HTMLSelectElement).value };
      try {
        await bridge.applyDraft([updateAlias(index, patch)], {
          configPath: state.snapshot.configPath
        });
      } catch (error) {
        setConnectionStatus(
          'error',
          error instanceof Error ? error.message : 'alias update failed'
        );
      }
    };

    field.addEventListener('input', apply);
    field.addEventListener('change', apply);
  });

  el.aliasList.querySelectorAll<HTMLButtonElement>('[data-remove-alias]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.snapshot) return;
      const index = Number(button.dataset.removeAlias);
      try {
        await bridge.applyDraft([removeAlias(index)], {
          configPath: state.snapshot.configPath
        });
      } catch (error) {
        setConnectionStatus(
          'error',
          error instanceof Error ? error.message : 'alias remove failed'
        );
      }
    });
  });
}

function renderImportReview(): void {
  if (!state.importProposal) {
    el.importReview.innerHTML =
      '<p class="empty-state">Add a source CSS path, scan it, then review mappings before applying them to the draft.</p>';
    return;
  }

  el.importReview.innerHTML = `
    <div class="import-list">
      ${state.importProposal.candidates
        .map(
          (candidate) => `
            <div class="import-card">
              <div>
                <strong>--${escapeHtml(candidate.sourceName)}</strong>
                <div class="meta">${escapeHtml(candidate.rawValue)}</div>
                <div class="meta">${escapeHtml(candidate.reason)}</div>
              </div>
              <select data-import-source="${escapeHtml(candidate.sourceName)}">
                <option value="">Skip mapping</option>
                ${tokenRecords()
                  .map(
                    (token) => `
                      <option value="${token.id}" ${state.importSelection[candidate.sourceName] === token.id ? 'selected' : ''}>
                        ${escapeHtml(token.label)}
                      </option>
                    `
                  )
                  .join('')}
              </select>
              <span class="token-chip">${swatch(candidate.light ? oklchToCss(candidate.light) : null)} ${swatch(candidate.dark ? oklchToCss(candidate.dark) : null)}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  el.importReview.querySelectorAll<HTMLSelectElement>('[data-import-source]').forEach((select) => {
    select.addEventListener('change', () => {
      const source = select.dataset.importSource;
      if (!source) return;
      state.importSelection[source] = select.value;
    });
  });
}

function focusToken(tokenId: string, reveal = false, switchToAuthoring = false): void {
  state.focusedTokenId = tokenId;
  if (switchToAuthoring) setActiveTab('authoring');
  if (reveal) {
    state.highlightedToken = tokenId;
    sendToContent({ kind: 'reveal-token-usage', tokenId });
  }
  renderAuthoring();
  renderTokenList();
}

function renderTokenList(): void {
  if (!state.snapshot) {
    el.tokenList.innerHTML = '<p class="empty-state">Connect to the engine to load tokens.</p>';
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
      const count = state.coverage?.byToken[tokenId];
      const classes = [
        'token-row',
        state.highlightedToken === tokenId ? 'is-highlighted' : '',
        state.focusedTokenId === tokenId ? 'is-focused' : ''
      ]
        .filter(Boolean)
        .join(' ');

      parts.push(`
        <button class="${classes}" data-token-id="${tokenId}" type="button">
          <span class="swatch" style="background:${escapeHtml(resolved.colors[tokenId]?.css ?? '')}"></span>
          <div>
            <div class="token-name">${escapeHtml(token.label)}</div>
            <div class="token-value">${escapeHtml(tokenId)} · ${escapeHtml(resolved.colors[tokenId]?.css ?? '')}</div>
          </div>
          <span class="token-count">${count === undefined ? '·' : `${count} used`}</span>
          <span aria-hidden="true">›</span>
        </button>
      `);
    }
  }

  el.tokenList.innerHTML = parts.join('');
  el.tokenList.querySelectorAll<HTMLButtonElement>('[data-token-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const tokenId = button.dataset.tokenId;
      if (!tokenId) return;
      const nextHighlighted = state.highlightedToken === tokenId ? null : tokenId;
      state.highlightedToken = nextHighlighted;
      state.focusedTokenId = tokenId;
      sendToContent({ kind: 'highlight-token', tokenId: nextHighlighted });
      renderTokenList();
      renderAuthoring();
    });
  });
}

function renderCoverage(): void {
  const coverage = state.coverage;
  if (!coverage) {
    el.coverageOutput.innerHTML = '<p class="empty-state">Run a scan to see token usage.</p>';
    el.coverageSummary.textContent = '';
    return;
  }

  const used = Object.entries(coverage.byToken).filter(([, count]) => count > 0).length;
  const total = Object.keys(coverage.byToken).length;
  const top = [...Object.entries(coverage.byToken)]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const unused = coverage.unusedTokens.slice(0, 20);
  const violations = coverage.rawColorViolations.slice(0, 20);

  el.coverageSummary.textContent = `${coverage.totalElements} elements · ${used}/${total} tokens used · ${coverage.rawColorViolations.length} raw colors`;
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
      ${unused
        .map(
          (tokenId) =>
            `<div class="report-item"><span>${escapeHtml(tokenId)}</span><span class="meta">0</span><span></span></div>`
        )
        .join('')}
    </div>
    <p class="report-subhead">Raw color violations (${violations.length})</p>
    <div class="report-list">
      ${violations
        .map(
          (violation) => `
            <div class="report-item severity-warn">
              <span><code>${escapeHtml(violation.selector)}</code></span>
              <span class="meta">${escapeHtml(violation.property)}: ${escapeHtml(violation.value)}</span>
              <span></span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderContrast(): void {
  if (!state.contrast) {
    el.contrastSummary.textContent = '';
    el.contrastOutput.innerHTML = '<p class="empty-state">Run an audit to surface APCA issues.</p>';
    return;
  }

  el.contrastSummary.textContent = `${state.contrast.sampled} sampled · ${state.contrast.findings.length} potential failures`;
  if (!state.contrast.findings.length) {
    el.contrastOutput.innerHTML =
      '<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';
    return;
  }

  el.contrastOutput.innerHTML = `
    <div class="report-list">
      ${state.contrast.findings
        .map(
          (finding) => `
            <div class="report-item severity-${finding.severity}">
              <span>
                <code>${escapeHtml(finding.selector)}</code>
                <div class="meta">${escapeHtml(finding.context || '—')}</div>
              </span>
              <span class="meta">fg ${escapeHtml(finding.foregroundToken ?? finding.foreground)} · bg ${escapeHtml(finding.backgroundToken ?? finding.background)}</span>
              <span class="meta">${finding.contrastLc.toFixed(1)} Lc</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function renderOverrideTokenOptions(): void {
  if (!state.snapshot) {
    el.overrideToken.innerHTML = '<option value="">Connect to the engine first</option>';
    return;
  }

  const tokens = tokenRecords();
  el.overrideToken.innerHTML = tokens
    .map((token) => `<option value="${token.id}">${escapeHtml(token.label)} (${token.id})</option>`)
    .join('');
  if (state.overrideTokenId) {
    el.overrideToken.value = state.overrideTokenId;
  }
}

function syncOverrideFromSnapshot(): void {
  if (!state.snapshot || !state.overrideTokenId) return;
  const token = tokenRecord(state.overrideTokenId);
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
  if (!state.snapshot) {
    el.overrideSliders.innerHTML =
      '<p class="empty-state">Connect to the engine to use overrides.</p>';
    return;
  }

  const color = state.overrideColor;
  const preview = oklchToCss(color);
  const channels: Array<{
    key: 'l' | 'c' | 'h';
    label: string;
    min: number;
    max: number;
    step: number;
  }> = [
    { key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.001 },
    { key: 'c', label: 'Chroma', min: 0, max: 0.4, step: 0.001 },
    { key: 'h', label: 'Hue', min: 0, max: 360, step: 0.1 }
  ];

  el.overrideSliders.innerHTML = `
    <div class="preview-row">
      <span class="swatch" style="background:${escapeHtml(preview)}"></span>
      <div>
        <strong>${escapeHtml(state.overrideTokenId || 'Choose a token')}</strong>
        <code>${escapeHtml(formatOklch(color))}</code>
      </div>
    </div>
    <div class="editor-block">
      ${channels
        .map(
          (channel) => `
            <div class="slider-row">
              <span>${channel.label}</span>
              <input type="range" min="${channel.min}" max="${channel.max}" step="${channel.step}" value="${color[channel.key]}" data-override-channel="${channel.key}" />
              <span class="readout">${color[channel.key].toFixed(channel.key === 'h' ? 2 : 3)}</span>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  el.overrideSliders
    .querySelectorAll<HTMLInputElement>('[data-override-channel]')
    .forEach((input) => {
      input.addEventListener('input', () => {
        const channel = input.dataset.overrideChannel as 'l' | 'c' | 'h' | undefined;
        if (!channel) return;
        state.overrideColor = {
          ...state.overrideColor,
          [channel]: Number(input.value)
        };
        renderOverrideSliders();
        if (!state.overrideTokenId) return;
        sendToContent({
          kind: 'override-token',
          tokenId: state.overrideTokenId,
          css: oklchToCss(state.overrideColor)
        });
      });
    });
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

window.addEventListener('pointermove', (event) => {
  if (!state.pickerDrag) return;

  void applyPickerPoint(
    state.pickerDrag.tokenId,
    state.pickerDrag.mode,
    state.pickerDrag.rect,
    event.clientX,
    event.clientY
  ).catch((error) => {
    setConnectionStatus('error', error instanceof Error ? error.message : 'token update failed');
  });
});

window.addEventListener('pointerup', () => {
  state.pickerDrag = null;
});

(async () => {
  await loadBridgeUrl();
  bridge.start();
  sendToContent({ kind: 'ping' });
  renderAll();
})();
