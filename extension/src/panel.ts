import { mount } from 'svelte';
import { BridgeClient } from './shared/bridge-client';
import type { BridgeStatus } from './shared/bridge-client';
import AltAuthoringPanel from './components/AltAuthoringPanel.svelte';
import OverrideColorEditor from './components/OverrideColorEditor.svelte';
import TokenAuthoringPanel from './components/TokenAuthoringPanel.svelte';
import { ExtensionAuthoringState } from './components/authoring-state.svelte';
import { ExtensionOverrideColorState } from './components/override-color-state.svelte';
import { DEFAULT_BRIDGE_URL, STORAGE_KEYS } from './shared/constants';
import { oklchToCss } from './shared/color';
import {
  addAlias,
  primaryTokenFromSelection,
  removeAlias,
  resetManifest,
  updateAlias
} from './shared/draft';
import { panelPortName } from './shared/messaging';
import { buildPreviewSnapshot } from './shared/preview-snapshot';
import type { ContentMessageEnvelope, PanelMessageEnvelope } from './shared/messaging';
import type {
  BridgeDraftCommand,
  BridgeConfigState,
  BridgeSnapshot,
  ContentToPanelMessage,
  ContrastReport,
  CoverageReport,
  HoverElementPayload,
  InPageDrawerSource,
  OklchColor,
  PanelToContentMessage,
  ThemeMode,
  TokenRecord
} from './shared/types';
import './panel-ui.css';

const tabId = chrome.devtools.inspectedWindow.tabId;
const COVERAGE_SCAN_TIMEOUT_MS = 12000;
const CONTRAST_AUDIT_TIMEOUT_MS = 12000;
const ELEMENTS_SELECTION_DEBOUNCE_MS = 50;
/** Runs in the content-script world so it can read snapshot token maps; `$0` is the Elements panel selection. */
const DEVTOOLS_PAYLOAD_EVAL =
  'typeof __semanticColorsDevtoolsPayload === "function" && $0 instanceof HTMLElement ? __semanticColorsDevtoolsPayload($0) : null';

const state = {
  bridgeUrl: DEFAULT_BRIDGE_URL,
  targetConfigPath: '',
  recentTargetConfigPaths: [] as string[],
  snapshot: null as BridgeSnapshot | null,
  previewSnapshot: null as BridgeSnapshot | null,
  coverage: null as CoverageReport | null,
  contrast: null as ContrastReport | null,
  highlightedToken: null as string | null,
  highlightedCoverageTokens: new Set<string>(),
  focusedTokenId: '' as string,
  overrideTokenId: '' as string,
  overrideColor: { l: 0.5, c: 0.1, h: 240, alpha: 1 } as OklchColor,
  overrideMode: 'both' as 'light' | 'dark' | 'both',
  persistOverride: false,
  activeMode: 'light' as ThemeMode,
  hoverActive: false,
  selectedElement: null as HoverElementPayload | null,
  pageInfo: { url: '', title: '', theme: null as string | null },
  bridgeOutputEnabled: null as boolean | null,
  bridgeOutputPending: false,
  bridgeOutputStatus: 'Load target config' as string,
  inPageDrawerVisible: false,
  coverageScanTimeout: null as number | null,
  contrastAuditTimeout: null as number | null,
  /** Hold-to-peek Alt theme (key `3`): restore prior mode on release after a long hold. */
  holdAltReturnMode: null as ThemeMode | null,
  holdAltStartedAt: 0
};

const el = {
  status: document.getElementById('bridge-status') as HTMLSpanElement,
  bridgeInput: document.getElementById('bridge-url') as HTMLInputElement,
  bridgeBtn: document.getElementById('bridge-connect') as HTMLButtonElement,
  targetConfigInput: document.getElementById('target-config-path') as HTMLInputElement,
  targetConfigLoad: document.getElementById('target-config-load') as HTMLButtonElement,
  bridgeOutputEnabled: document.getElementById('bridge-output-enabled') as HTMLInputElement,
  bridgeOutputStatus: document.getElementById('bridge-output-status') as HTMLSpanElement,
  toggleInPageDrawer: document.getElementById('toggle-inpage-drawer') as HTMLButtonElement,
  targetConfigOptions: document.getElementById('recent-target-configs') as HTMLDataListElement,
  modeSwitch: document.querySelector('.mode-switch') as HTMLElement,
  draftStatus: document.getElementById('draft-status') as HTMLDivElement,
  commitDraft: document.getElementById('commit-draft') as HTMLButtonElement,
  discardDraft: document.getElementById('discard-draft') as HTMLButtonElement,
  resetManifest: document.getElementById('reset-manifest') as HTMLButtonElement,
  tabs: document.querySelectorAll<HTMLButtonElement>('.tabs button'),
  tabPanels: document.querySelectorAll<HTMLElement>('[data-tab-panel]'),
  hoverToggle: document.getElementById('hover-toggle') as HTMLButtonElement,
  clearSelection: document.getElementById('clear-selection') as HTMLButtonElement,
  tokenAuthoringRoot: document.getElementById('token-authoring-root') as HTMLDivElement,
  altAuthoringRoot: document.getElementById('alt-authoring-root') as HTMLDivElement,
  aliasList: document.getElementById('alias-list') as HTMLDivElement,
  addAlias: document.getElementById('add-alias') as HTMLButtonElement,
  addAliasCurrent: document.getElementById('add-alias-current') as HTMLButtonElement,
  scanCoverage: document.getElementById('scan-coverage') as HTMLButtonElement,
  coverageSummary: document.getElementById('coverage-summary') as HTMLSpanElement,
  coverageOutput: document.getElementById('coverage-output') as HTMLDivElement,
  scanContrast: document.getElementById('scan-contrast') as HTMLButtonElement,
  contrastSummary: document.getElementById('contrast-summary') as HTMLSpanElement,
  contrastOutput: document.getElementById('contrast-output') as HTMLDivElement,
  overrideAuthoringRoot: document.getElementById('override-authoring-root') as HTMLDivElement
};

const authoringState = new ExtensionAuthoringState();
const overrideColorState = new ExtensionOverrideColorState();
let pendingPreviewManifest: BridgeSnapshot['manifest'] | null = null;
let previewAnimationFrame: number | null = null;

mount(TokenAuthoringPanel, {
  target: el.tokenAuthoringRoot,
  props: {
    authoring: authoringState,
    onApplyDraft: applyAuthoringDraft,
    onFocusToken: focusTokenFromAuthoring,
    onPreviewManifestChange: scheduleAuthoringPreview,
    onSetTheme: setPreviewMode,
    onError: (message: string) => setConnectionStatus('error', message)
  }
});

mount(AltAuthoringPanel, {
  target: el.altAuthoringRoot,
  props: {
    authoring: authoringState,
    onApplyDraft: applyAuthoringDraft,
    onPreviewManifestChange: scheduleAuthoringPreview,
    onSetTheme: setPreviewMode,
    onError: (message: string) => setConnectionStatus('error', message)
  }
});

mount(OverrideColorEditor, {
  target: el.overrideAuthoringRoot,
  props: {
    override: overrideColorState,
    onClearOverrides: clearAllOverrides,
    onColorChange: applyOverrideColorPreview,
    onOverrideModeChange: setOverrideMode,
    onPersistChange: setOverridePersist,
    onPushOverride: pushOverride,
    onSetTheme: setPreviewMode,
    onTokenChange: focusTokenFromOverride
  }
});

let port: chrome.runtime.Port | null = null;

function handlePortMessage(message: unknown): void {
  const envelope = message as ContentMessageEnvelope;
  if (envelope?.source !== 'content') return;
  handleContentMessage(envelope.payload);
}

function connectPanelPort(): chrome.runtime.Port | null {
  let nextPort: chrome.runtime.Port;
  try {
    nextPort = chrome.runtime.connect({ name: panelPortName(tabId) });
  } catch (error) {
    console.warn('[semantic-colors] panel port connect failed:', error);
    return null;
  }

  try {
    nextPort.onMessage.addListener(handlePortMessage);
    nextPort.onDisconnect.addListener(() => {
      if (port !== nextPort) return;
      port = null;
    });
  } catch (error) {
    console.warn('[semantic-colors] panel port listener bind failed:', error);
    try {
      nextPort.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    return null;
  }

  port = nextPort;
  return nextPort;
}

function activePanelPort(): chrome.runtime.Port | null {
  return port ?? connectPanelPort();
}

function postToContent(envelope: PanelMessageEnvelope, allowRetry = true): boolean {
  const currentPort = activePanelPort();
  if (!currentPort) return false;
  try {
    currentPort.postMessage(envelope);
    return true;
  } catch (error) {
    console.warn('[semantic-colors] panel port send failed:', error);
    if (!allowRetry) return false;
    if (port === currentPort) {
      port = null;
    }
    return postToContent(envelope, false);
  }
}

function sendToContent(payload: PanelToContentMessage): void {
  const envelope: PanelMessageEnvelope = { source: 'panel', tabId, payload };
  if (postToContent(envelope)) return;

  handleContentMessage({
    kind: 'error',
    message: 'Extension relay disconnected. Retry the scan.'
  });
}

function scheduleAuthoringPreview(manifest: BridgeSnapshot['manifest']): void {
  if (!state.snapshot) return;
  pendingPreviewManifest = manifest;
  if (previewAnimationFrame !== null) return;

  previewAnimationFrame = window.requestAnimationFrame(flushAuthoringPreview);
}

function flushAuthoringPreview(): void {
  previewAnimationFrame = null;
  const manifest = pendingPreviewManifest;
  pendingPreviewManifest = null;
  if (!state.snapshot || !manifest) return;

  const previewSnapshot = buildPreviewSnapshot(state.snapshot, manifest);
  state.previewSnapshot = previewSnapshot;
  authoringState.setPreviewSnapshot(previewSnapshot);
  sendToContent({ kind: 'update-snapshot', snapshot: previewSnapshot });
}

function clearAuthoringPreview(pushBaseSnapshot = true): void {
  pendingPreviewManifest = null;
  if (previewAnimationFrame !== null) {
    window.cancelAnimationFrame(previewAnimationFrame);
    previewAnimationFrame = null;
  }

  if (!state.previewSnapshot) return;
  state.previewSnapshot = null;
  authoringState.clearPreviewSnapshot();
  if (pushBaseSnapshot && state.snapshot) {
    pushSnapshotToContent();
  }
}

function clearCoverageScanTimeout(): void {
  if (state.coverageScanTimeout === null) return;
  window.clearTimeout(state.coverageScanTimeout);
  state.coverageScanTimeout = null;
}

function clearContrastAuditTimeout(): void {
  if (state.contrastAuditTimeout === null) return;
  window.clearTimeout(state.contrastAuditTimeout);
  state.contrastAuditTimeout = null;
}

function isHoverElementPayload(value: unknown): value is HoverElementPayload {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.tagName === 'string' &&
    Array.isArray(o.matches) &&
    Array.isArray(o.semanticClassMatches) &&
    typeof o.rect === 'object' &&
    o.rect !== null
  );
}

function applySelectedElementPayload(payload: HoverElementPayload): void {
  state.selectedElement = payload;
  const semanticClassTokenId = payload.semanticClassMatches[0]?.tokenId ?? null;
  const primaryTokenId = primaryTokenFromSelection(payload);
  if (semanticClassTokenId) {
    setFocusedTokenId(semanticClassTokenId);
  } else if (primaryTokenId) {
    setFocusedTokenId(primaryTokenId);
  }
  setActiveTab('token');
  renderAll();
}

/** Elements-only selection path: clear context without changing focused token when no DOM node. */
function clearDevtoolsElementsSelectionContext(): void {
  state.selectedElement = null;
  renderAll();
}

let elementsSelectionDebounce: number | null = null;

function scheduleSyncTokenFromElementsSelection(): void {
  if (elementsSelectionDebounce !== null) {
    window.clearTimeout(elementsSelectionDebounce);
  }
  elementsSelectionDebounce = window.setTimeout(() => {
    elementsSelectionDebounce = null;
    syncTokenFromElementsSelection();
  }, ELEMENTS_SELECTION_DEBOUNCE_MS);
}

function syncTokenFromElementsSelection(): void {
  try {
    chrome.devtools.inspectedWindow.eval(
      DEVTOOLS_PAYLOAD_EVAL,
      { useContentScriptContext: true },
      (result, exceptionInfo) => {
        const ex = exceptionInfo as { isException?: boolean } | undefined;
        if (ex && typeof ex === 'object' && ex.isException) {
          return;
        }
        if (isHoverElementPayload(result)) {
          applySelectedElementPayload(result);
          return;
        }
        if (result === null || result === undefined) {
          clearDevtoolsElementsSelectionContext();
        }
      }
    );
  } catch {
    // Ignore eval failures (e.g. extension context invalidated).
  }
}

function registerElementsSelectionSync(): void {
  const onSelectionChanged = chrome.devtools?.panels?.elements?.onSelectionChanged;
  if (!onSelectionChanged?.addListener) return;
  onSelectionChanged.addListener(scheduleSyncTokenFromElementsSelection);
}

function handleAuthoringShortcutDown(key: '1' | '2' | '3' | 'p' | 'i', repeat: boolean): void {
  if (key === '3' && repeat) return;
  if (key === 'i' && repeat) return;
  if (key === '1') {
    setPreviewMode('light');
    return;
  }
  if (key === '2') {
    setPreviewMode('dark');
    return;
  }
  if (key === '3') {
    state.holdAltReturnMode = state.activeMode === 'alt' ? null : state.activeMode;
    state.holdAltStartedAt = performance.now();
    setPreviewMode('alt');
    return;
  }
  if (key === 'p') {
    toggleInPagePreview();
    return;
  }
  if (key === 'i') {
    toggleHoverInspectMode();
  }
}

function handleAuthoringShortcutUpForAltHold(): void {
  if (!state.holdAltReturnMode) return;
  const heldFor = performance.now() - state.holdAltStartedAt;
  if (heldFor > 180) {
    setPreviewMode(state.holdAltReturnMode);
  }
  state.holdAltReturnMode = null;
}

function handleContentMessage(message: ContentToPanelMessage): void {
  switch (message.kind) {
    case 'hello':
    case 'page-info':
      state.pageInfo = {
        url: message.url,
        title: message.title,
        theme: 'theme' in message ? message.theme : null
      };
      if (state.snapshot) {
        pushSnapshotToContent();
      }
      if (state.inPageDrawerVisible) {
        sendToContent({ kind: 'set-inpage-drawer', visible: true });
      }
      break;
    case 'hover-element':
      break;
    case 'selected-element':
      applySelectedElementPayload(message.payload);
      break;
    case 'hover-cleared':
      break;
    case 'selection-cleared':
      state.selectedElement = null;
      break;
    case 'inpage-drawer-state':
      state.inPageDrawerVisible = message.visible;
      renderInPageDrawerControl();
      break;
    case 'inpage-token-focus':
      focusTokenFromInPageDrawer(message.tokenId, message.source);
      break;
    case 'coverage-report':
      clearCoverageScanTimeout();
      state.coverage = message.report;
      state.highlightedCoverageTokens.clear();
      renderCoverage();
      break;
    case 'contrast-report':
      clearContrastAuditTimeout();
      state.contrast = message.report;
      renderContrast();
      break;
    case 'authoring-shortcut':
      if (message.phase === 'down') {
        handleAuthoringShortcutDown(message.key, message.repeat);
      } else if (message.phase === 'up' && message.key === '3') {
        handleAuthoringShortcutUpForAltHold();
      }
      break;
    case 'error':
      console.warn('[semantic-colors] content error:', message.message);
      if (el.coverageSummary.textContent === 'Scanning...') {
        clearCoverageScanTimeout();
        el.coverageSummary.textContent = `Scan failed: ${message.message}`;
      }
      if (el.contrastSummary.textContent === 'Auditing...') {
        clearContrastAuditTimeout();
        el.contrastSummary.textContent = `Audit failed: ${message.message}`;
      }
      break;
  }
}

function focusTokenFromInPageDrawer(tokenId: string, source: InPageDrawerSource): void {
  focusToken(tokenId, true, true);
  if (source === 'preview') {
    sendToContent({ kind: 'focus-token', tokenId });
  }
}

async function applyAuthoringDraft(commands: BridgeDraftCommand[]): Promise<void> {
  if (!state.snapshot) return;
  try {
    await bridge.applyDraft(commands, { configPath: state.snapshot.configPath });
  } catch (error) {
    clearAuthoringPreview();
    throw error;
  }
}

function focusTokenFromAuthoring(tokenId: string): void {
  setFocusedTokenId(tokenId);
  renderAll();
}

function setFocusedTokenId(tokenId: string): void {
  state.focusedTokenId = tokenId;
  syncOverrideTokenToFocused();
}

function syncOverrideTokenToFocused(): void {
  if (!state.focusedTokenId) return;
  if (state.snapshot && !state.snapshot.manifest.tokens[state.focusedTokenId]) return;
  if (state.overrideTokenId === state.focusedTokenId) return;
  state.overrideTokenId = state.focusedTokenId;
  syncOverrideFromSnapshot();
}

function applyOverrideColorPreview(): void {
  state.overrideColor = { ...overrideColorState.color };
  if (!state.overrideTokenId) return;
  sendToContent({
    kind: 'override-token',
    tokenId: state.overrideTokenId,
    css: oklchToCss(state.overrideColor)
  });
}

function clearAllOverrides(): void {
  sendToContent({ kind: 'clear-all-overrides' });
}

function setOverridePersist(persist: boolean): void {
  state.persistOverride = persist;
  renderAll();
}

function setOverrideMode(mode: 'light' | 'dark' | 'both'): void {
  state.overrideMode = mode;
  renderAll();
}

function focusTokenFromOverride(tokenId: string): void {
  state.overrideTokenId = tokenId;
  if (tokenId) {
    state.focusedTokenId = tokenId;
  }
  syncOverrideFromSnapshot();
  renderAll();
}

async function pushOverride(): Promise<void> {
  state.overrideMode = overrideColorState.overrideMode;
  if (!state.overrideTokenId) return;
  try {
    await bridge.pushOverride(state.overrideTokenId, state.overrideMode, state.overrideColor, {
      persist: state.persistOverride,
      configPath: activeConfigPath()
    });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'push failed');
  }
}

const bridge = new BridgeClient({
  getBaseUrl: () => state.bridgeUrl,
  getConfigPath: () => state.targetConfigPath,
  onStatus: setConnectionStatus,
  onSnapshot: (snapshot) => {
    clearAuthoringPreview(false);
    state.snapshot = snapshot;
    if (snapshot.configPath !== state.targetConfigPath) {
      void persistTargetConfigPath(snapshot.configPath).then(() => {
        void refreshBridgeOutputConfig();
      });
    }
    if (!state.focusedTokenId || !snapshot.manifest.tokens[state.focusedTokenId]) {
      const selectedTokenId = primaryTokenFromSelection(state.selectedElement);
      setFocusedTokenId(
        selectedTokenId && snapshot.manifest.tokens[selectedTokenId]
          ? selectedTokenId
          : (Object.keys(snapshot.manifest.tokens)[0] ?? '')
      );
    } else {
      syncOverrideTokenToFocused();
    }
    renderAll();
    pushSnapshotToContent();
  }
});

function setConnectionStatus(status: BridgeStatus, detail?: string): void {
  el.status.className = `status status-${status}`;
  el.status.textContent = detail ? `${status} · ${detail}` : status;
}

function activeConfigPath(): string {
  return state.snapshot?.configPath ?? state.targetConfigPath.trim();
}

function bridgeOutputStatusText(bridgeConfig?: BridgeConfigState): string {
  if (!state.targetConfigPath) {
    return 'Load target config';
  }
  if (state.bridgeOutputPending) {
    return 'Updating...';
  }
  if (bridgeConfig) {
    return bridgeConfig.bridgeEnabled
      ? 'Enabled: save/commit writes CSS'
      : 'Disabled: save/commit skips CSS';
  }
  if (state.bridgeOutputEnabled === true) {
    return 'Enabled: save/commit writes CSS';
  }
  if (state.bridgeOutputEnabled === false) {
    return 'Disabled: save/commit skips CSS';
  }
  return state.bridgeOutputStatus;
}

function renderBridgeOutputControl(): void {
  const hasTargetConfig = state.targetConfigPath.length > 0;
  el.bridgeOutputEnabled.disabled = !hasTargetConfig || state.bridgeOutputPending;
  el.bridgeOutputEnabled.indeterminate = hasTargetConfig && state.bridgeOutputEnabled === null;
  el.bridgeOutputEnabled.checked = state.bridgeOutputEnabled ?? false;
  el.bridgeOutputStatus.textContent = bridgeOutputStatusText();
}

function renderInPageDrawerControl(): void {
  el.toggleInPageDrawer.setAttribute('aria-pressed', String(state.inPageDrawerVisible));
}

function renderHoverInspectControl(): void {
  el.hoverToggle.setAttribute('aria-pressed', String(state.hoverActive));
}

function toggleHoverInspectMode(): void {
  state.hoverActive = !state.hoverActive;
  renderHoverInspectControl();
  sendToContent({ kind: 'hover-inspector', enabled: state.hoverActive });
}

function clearBridgeSnapshotState(statusDetail?: string): void {
  clearCoverageScanTimeout();
  clearContrastAuditTimeout();
  clearAuthoringPreview(false);
  state.snapshot = null;
  state.coverage = null;
  state.contrast = null;
  state.highlightedToken = null;
  state.highlightedCoverageTokens.clear();
  state.focusedTokenId = '';
  state.overrideTokenId = '';
  if (!state.targetConfigPath) {
    state.bridgeOutputEnabled = null;
    state.bridgeOutputStatus = 'Load target config';
  }
  sendToContent({ kind: 'clear-snapshot' });
  if (statusDetail) {
    setConnectionStatus('idle', statusDetail);
  }
  renderAll();
}

function renderRecentTargetConfigs(): void {
  el.targetConfigOptions.innerHTML = state.recentTargetConfigPaths
    .map((configPath) => `<option value="${escapeHtml(configPath)}"></option>`)
    .join('');
}

async function persistTargetConfigPath(value: string): Promise<void> {
  const configPath = value.trim();
  state.targetConfigPath = configPath;
  el.targetConfigInput.value = configPath;

  if (configPath) {
    state.recentTargetConfigPaths = [
      configPath,
      ...state.recentTargetConfigPaths.filter((candidate) => candidate !== configPath)
    ].slice(0, 8);
  }

  renderRecentTargetConfigs();

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.targetConfigPath]: configPath,
      [STORAGE_KEYS.recentTargetConfigPaths]: state.recentTargetConfigPaths
    });
  } catch {
    // ignore
  }
}

async function loadBridgePreferences(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.bridgeUrl,
      STORAGE_KEYS.targetConfigPath,
      STORAGE_KEYS.recentTargetConfigPaths
    ]);
    const bridgeUrl = stored[STORAGE_KEYS.bridgeUrl];
    if (typeof bridgeUrl === 'string' && bridgeUrl.trim()) {
      state.bridgeUrl = bridgeUrl.trim();
    }
    const targetConfigPath = stored[STORAGE_KEYS.targetConfigPath];
    if (typeof targetConfigPath === 'string') {
      state.targetConfigPath = targetConfigPath.trim();
    }
    const recentTargetConfigPaths = stored[STORAGE_KEYS.recentTargetConfigPaths];
    if (Array.isArray(recentTargetConfigPaths)) {
      state.recentTargetConfigPaths = recentTargetConfigPaths.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
    }
  } catch {
    // fall through to default
  }
  el.bridgeInput.value = state.bridgeUrl;
  el.targetConfigInput.value = state.targetConfigPath;
  renderRecentTargetConfigs();
}

async function refreshBridgeOutputConfig(): Promise<void> {
  const configPath = state.targetConfigPath.trim();
  if (!configPath) {
    state.bridgeOutputEnabled = null;
    state.bridgeOutputPending = false;
    state.bridgeOutputStatus = 'Load target config';
    renderBridgeOutputControl();
    return;
  }

  state.bridgeOutputPending = true;
  state.bridgeOutputStatus = 'Loading config...';
  renderBridgeOutputControl();

  try {
    const bridgeConfig = await bridge.fetchBridgeConfig(configPath);
    if (bridgeConfig.configPath !== state.targetConfigPath) {
      await persistTargetConfigPath(bridgeConfig.configPath);
    }
    state.bridgeOutputEnabled = bridgeConfig.bridgeEnabled;
    state.bridgeOutputStatus = bridgeOutputStatusText(bridgeConfig);
  } catch (error) {
    state.bridgeOutputEnabled = null;
    state.bridgeOutputStatus =
      error instanceof Error ? error.message : 'Failed to load bridge config';
  } finally {
    state.bridgeOutputPending = false;
    renderBridgeOutputControl();
  }
}

async function setBridgeOutputEnabled(enabled: boolean): Promise<void> {
  const configPath = activeConfigPath();
  if (!configPath) return;

  const previousValue = state.bridgeOutputEnabled;
  const previousStatus = state.bridgeOutputStatus;
  state.bridgeOutputPending = true;
  state.bridgeOutputEnabled = enabled;
  state.bridgeOutputStatus = 'Saving config...';
  renderBridgeOutputControl();

  try {
    const bridgeConfig = await bridge.updateBridgeConfig(enabled, { configPath });
    if (bridgeConfig.configPath !== state.targetConfigPath) {
      await persistTargetConfigPath(bridgeConfig.configPath);
    }
    state.bridgeOutputEnabled = bridgeConfig.bridgeEnabled;
    state.bridgeOutputStatus = bridgeOutputStatusText(bridgeConfig);
  } catch (error) {
    state.bridgeOutputEnabled = previousValue;
    state.bridgeOutputStatus =
      error instanceof Error ? error.message : previousStatus || 'Failed to update config';
  } finally {
    state.bridgeOutputPending = false;
    renderBridgeOutputControl();
  }
}

async function persistBridgeUrl(value: string): Promise<void> {
  state.bridgeUrl = value;
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.bridgeUrl]: value });
  } catch {
    // ignore
  }
}

async function applyTargetConfig(value: string): Promise<void> {
  bridge.stop();
  await persistTargetConfigPath(value);
  clearBridgeSnapshotState(
    state.targetConfigPath ? 'loading target config' : 'choose target config'
  );

  if (!state.targetConfigPath) {
    await refreshBridgeOutputConfig();
    return;
  }

  await refreshBridgeOutputConfig();
  bridge.start();
}

function setActiveTab(id: string): void {
  el.tabs.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === id);
    btn.setAttribute('aria-selected', String(btn.dataset.tab === id));
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.tabPanel === id);
  });
}

function syncModeSwitch(): void {
  el.modeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const mode = (button.dataset.mode ?? 'light') as ThemeMode;
    button.classList.toggle('is-active', mode === state.activeMode);
  });
}

function setPreviewMode(mode: ThemeMode): void {
  state.activeMode = mode;
  syncModeSwitch();
  sendToContent({ kind: 'set-theme', mode: state.activeMode });
  if (state.overrideTokenId) {
    syncOverrideFromSnapshot();
  }
  renderAll();
  pushSnapshotToContent();
}

/**
 * Theme shortcuts (same as web app `+page.svelte`): `1` / `2` / `3` = Light / Dark / Alt;
 * `p` toggles in-page preview; `i` toggles inspect mode. Works from the DevTools panel and from
 * the inspected page via the content script (see `content-bridge.ts`). Ignored while typing in
 * inputs. Alt: hold `3` >~180ms, release to restore the prior mode.
 */
function toggleInPagePreview(): void {
  state.inPageDrawerVisible = !state.inPageDrawerVisible;
  renderInPageDrawerControl();
  sendToContent({ kind: 'set-inpage-drawer', visible: state.inPageDrawerVisible });
  if (state.inPageDrawerVisible && state.snapshot) {
    pushSnapshotToContent();
  }
}

function isTypingContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function normalizePanelAuthoringKey(event: KeyboardEvent): '1' | '2' | '3' | 'p' | 'i' | null {
  if (event.key === '1' || event.key === '2' || event.key === '3') return event.key;
  if (event.code === 'KeyP') return 'p';
  if (event.key.length === 1 && event.key.toLowerCase() === 'p') return 'p';
  if (event.code === 'KeyI') return 'i';
  if (event.key.length === 1 && event.key.toLowerCase() === 'i') return 'i';
  return null;
}

function handleThemeShortcutKeydown(event: KeyboardEvent): void {
  if (isTypingContext(event.target)) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = normalizePanelAuthoringKey(event);
  if (!key) return;
  if (key === '3' && event.repeat) return;
  event.preventDefault();
  handleAuthoringShortcutDown(key, event.repeat);
}

function handleThemeShortcutKeyup(event: KeyboardEvent): void {
  if (event.key !== '3') return;
  handleAuthoringShortcutUpForAltHold();
}

window.addEventListener('keydown', handleThemeShortcutKeydown);
window.addEventListener('keyup', handleThemeShortcutKeyup);

el.tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    if (!id) return;
    setActiveTab(id);
  });
});

el.modeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    setPreviewMode((btn.dataset.mode ?? 'light') as ThemeMode);
  });
});

el.hoverToggle.addEventListener('click', () => {
  toggleHoverInspectMode();
});

el.clearSelection.addEventListener('click', () => {
  state.selectedElement = null;
  sendToContent({ kind: 'clear-selection' });
});

el.toggleInPageDrawer.addEventListener('click', () => {
  toggleInPagePreview();
});

el.targetConfigLoad.addEventListener('click', async () => {
  await applyTargetConfig(el.targetConfigInput.value);
});

el.targetConfigInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  void applyTargetConfig(el.targetConfigInput.value);
});

el.bridgeOutputEnabled.addEventListener('change', () => {
  void setBridgeOutputEnabled(el.bridgeOutputEnabled.checked);
});

el.commitDraft.addEventListener('click', async () => {
  if (!state.snapshot) return;
  try {
    clearAuthoringPreview();
    await bridge.commitDraft({ configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'commit failed');
  }
});

el.discardDraft.addEventListener('click', async () => {
  if (!state.snapshot) return;
  try {
    clearAuthoringPreview();
    await bridge.discardDraft({ configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'discard failed');
  }
});

el.resetManifest.addEventListener('click', async () => {
  if (!state.snapshot) return;
  if (
    !window.confirm(
      'Restore the semantic color manifest to the project defaults? This replaces tokens and aliases in your current draft.'
    )
  ) {
    return;
  }
  try {
    clearAuthoringPreview();
    await bridge.applyDraft([resetManifest()], { configPath: state.snapshot.configPath });
  } catch (error) {
    setConnectionStatus('error', error instanceof Error ? error.message : 'reset failed');
  }
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

el.scanCoverage.addEventListener('click', () => {
  if (!state.snapshot) return;
  clearCoverageScanTimeout();
  el.coverageSummary.textContent = 'Scanning...';
  state.coverageScanTimeout = window.setTimeout(() => {
    if (el.coverageSummary.textContent === 'Scanning...') {
      el.coverageSummary.textContent =
        'Scan timed out while waiting for the inspected page response.';
    }
  }, COVERAGE_SCAN_TIMEOUT_MS);
  sendToContent({
    kind: 'scan-coverage',
    tokenColors: snapshotTokenCss(),
    aliases: state.snapshot.manifest.aliases
  });
});

el.scanContrast.addEventListener('click', () => {
  if (!state.snapshot) return;
  clearContrastAuditTimeout();
  el.contrastSummary.textContent = 'Auditing...';
  state.contrastAuditTimeout = window.setTimeout(() => {
    if (el.contrastSummary.textContent === 'Auditing...') {
      el.contrastSummary.textContent =
        'Audit timed out while waiting for the inspected page response.';
    }
  }, CONTRAST_AUDIT_TIMEOUT_MS);
  sendToContent({
    kind: 'scan-contrast',
    tokenColors: snapshotTokenCss(),
    aliases: state.snapshot.manifest.aliases
  });
});

el.bridgeBtn.addEventListener('click', async () => {
  const input = el.bridgeInput.value.trim();
  if (!input) return;
  await persistBridgeUrl(input);
  bridge.stop();
  clearBridgeSnapshotState(
    state.targetConfigPath ? 'reconnecting to target config' : 'choose target config'
  );
  if (!state.targetConfigPath) {
    return;
  }
  void refreshBridgeOutputConfig();
  bridge.start();
});

function resolvedModeForPreview(): ThemeMode {
  return state.activeMode;
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
  const snapshot = state.previewSnapshot ?? state.snapshot;
  if (!snapshot) return;
  sendToContent({ kind: 'update-snapshot', snapshot });
}

function renderAll(): void {
  renderBridgeOutputControl();
  renderInPageDrawerControl();
  renderHoverInspectControl();
  renderDraftStatus();
  renderAuthoring();
  renderAliasList();
  renderCoverage();
  renderContrast();
  if (
    state.snapshot &&
    (!state.overrideTokenId || !state.snapshot.manifest.tokens[state.overrideTokenId])
  ) {
    state.overrideTokenId =
      state.focusedTokenId && state.snapshot.manifest.tokens[state.focusedTokenId]
        ? state.focusedTokenId
        : Object.keys(state.snapshot.manifest.tokens)[0] || '';
    syncOverrideFromSnapshot();
  }
  renderOverrideSliders();
}

function renderDraftStatus(): void {
  if (!state.snapshot) {
    el.draftStatus.textContent = state.targetConfigPath
      ? `Waiting for bridge snapshot for ${state.targetConfigPath}.`
      : 'Choose a target project config to start authoring.';
    return;
  }

  const status = state.snapshot.draft.dirty
    ? `Unsaved draft · live preview updated · base v${state.snapshot.draft.baseVersion} · last edit ${state.snapshot.draft.lastEditor}`
    : `No draft changes · synced v${state.snapshot.version}`;
  el.draftStatus.textContent = status;
}

function tokenRecords(): TokenRecord[] {
  if (!state.snapshot) return [];
  return Object.values(state.snapshot.manifest.tokens) as TokenRecord[];
}

function tokenRecord(tokenId: string): TokenRecord | null {
  return state.snapshot?.manifest.tokens[tokenId] ?? null;
}

function renderAuthoring(): void {
  const activeMode = resolvedModeForPreview();
  authoringState.update({
    snapshot: state.snapshot,
    focusedTokenId: state.focusedTokenId,
    activeMode
  });
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

function focusToken(tokenId: string, reveal = false, switchToAuthoring = false): void {
  setFocusedTokenId(tokenId);
  if (switchToAuthoring) setActiveTab('token');
  if (reveal) {
    state.highlightedCoverageTokens.clear();
    state.highlightedToken = tokenId;
    sendToContent({ kind: 'reveal-token-usage', tokenId });
  }
  renderAll();
}

function syncCoverageHighlights(): void {
  const tokenIds = [...state.highlightedCoverageTokens];
  state.highlightedToken = tokenIds[0] ?? null;
  sendToContent({ kind: 'reveal-token-usages', tokenIds });
}

function toggleCoverageHighlight(tokenId: string): void {
  if (state.highlightedCoverageTokens.has(tokenId)) {
    state.highlightedCoverageTokens.delete(tokenId);
  } else {
    state.highlightedCoverageTokens.add(tokenId);
  }
  syncCoverageHighlights();
  renderCoverage();
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
          ([tokenId, count]) => `
            <button
              type="button"
              class="report-item report-token-toggle"
              data-coverage-token="${escapeHtml(tokenId)}"
              aria-pressed="${state.highlightedCoverageTokens.has(tokenId)}"
            >
              <span>${escapeHtml(tokenId)}</span>
              <span class="meta">${count} elements</span>
              <span class="meta">${state.highlightedCoverageTokens.has(tokenId) ? 'shown' : 'show'}</span>
            </button>
          `
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

  el.coverageOutput
    .querySelectorAll<HTMLButtonElement>('[data-coverage-token]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const tokenId = button.dataset.coverageToken;
        if (tokenId) toggleCoverageHighlight(tokenId);
      });
    });
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
  overrideColorState.update({
    snapshot: state.snapshot,
    tokenId: state.overrideTokenId,
    color: state.overrideColor,
    activeMode: state.activeMode,
    overrideMode: state.overrideMode,
    persistOverride: state.persistOverride
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

(async () => {
  await loadBridgePreferences();
  if (state.targetConfigPath) {
    void refreshBridgeOutputConfig();
    bridge.start();
  } else {
    clearBridgeSnapshotState('choose target config');
  }
  sendToContent({ kind: 'ping' });
  sendToContent({ kind: 'set-theme', mode: state.activeMode });
  renderAll();
  registerElementsSelectionSync();
})();
