import { apcaContrast, apcaSeverity, parseCssColor } from './shared/color';
import {
  HIGHLIGHT_ATTR,
  INSPECTOR_OVERLAY_ID,
  INSPECTOR_STYLE_ID,
  PREVIEW_STYLE_ID,
  OVERRIDE_STYLE_ID,
  SELECTED_ATTR
} from './shared/constants';
import type { ContentMessageEnvelope } from './shared/messaging';
import type {
  BridgeSnapshot,
  ContentToPanelMessage,
  ContrastFinding,
  ContrastReport,
  CoverageReport,
  ElementTokenMatch,
  HoverElementPayload,
  SemanticClassMatch,
  PanelToContentMessage
} from './shared/types';

const state = {
  hoverActive: false,
  hoverTarget: null as HTMLElement | null,
  selectedTarget: null as HTMLElement | null,
  highlightedToken: null as string | null,
  snapshot: null as BridgeSnapshot | null,
  overrides: new Map<string, string>(),
  tokenColorMap: new Map<string, string>(),
  tokenCssByTokenId: new Map<string, string>(),
  tokenClassSet: new Set<string>(),
  aliasMap: new Map<string, string>(),
  liveThemeBaseline: null as { hadAttribute: boolean; value: string | null } | null
};

function send(message: ContentToPanelMessage): void {
  const envelope: ContentMessageEnvelope = { source: 'content', payload: message };
  try {
    chrome.runtime.sendMessage(envelope);
  } catch {
    // Extension context invalidated (e.g., reload). Ignore.
  }
}

function normalizeRgb(input: string | null): string | null {
  const parsed = parseCssColor(input);
  if (!parsed) return null;
  if (parsed.alpha >= 1) return `${parsed.r},${parsed.g},${parsed.b}`;
  return `${parsed.r},${parsed.g},${parsed.b},${parsed.alpha.toFixed(3)}`;
}

function tokenFor(cssColor: string | null): string | null {
  const key = normalizeRgb(cssColor);
  if (!key) return null;
  return state.tokenColorMap.get(key) ?? null;
}

function elementSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.documentElement && depth < 4) {
    const tag = current.tagName.toLowerCase();
    const cls = current.classList.length
      ? `.${[...current.classList].map((c) => CSS.escape(c)).join('.')}`
      : '';
    parts.unshift(`${tag}${cls}`);
    current = current.parentElement;
    depth += 1;
  }
  return parts.join(' > ');
}

function aliasesForToken(tokenId: string | null): string[] {
  if (!tokenId) return [];
  const aliases: string[] = [];
  for (const [alias, mappedTokenId] of state.aliasMap) {
    if (mappedTokenId === tokenId) aliases.push(`--${alias}`);
  }
  return aliases;
}

function resolveTokenClassCandidate(candidate: string): string | null {
  if (!candidate) return null;
  const normalized = candidate.split('/')[0] ?? candidate;
  if (state.tokenClassSet.has(normalized)) return normalized;
  return state.aliasMap.get(normalized) ?? null;
}

function tokenIdFromClassName(className: string): string | null {
  const baseClass = className.split(':').at(-1) ?? className;
  const directMatch = resolveTokenClassCandidate(baseClass);
  if (directMatch) return directMatch;

  const utilityPrefixes = [
    'text-',
    'bg-',
    'border-',
    'outline-',
    'ring-',
    'fill-',
    'stroke-',
    'caret-',
    'accent-',
    'decoration-',
    'from-',
    'via-',
    'to-'
  ];

  for (const prefix of utilityPrefixes) {
    if (!baseClass.startsWith(prefix)) continue;
    const tokenCandidate = baseClass.slice(prefix.length);
    const tokenId = resolveTokenClassCandidate(tokenCandidate);
    if (tokenId) return tokenId;
  }

  return null;
}

function semanticTokenClassesForElement(el: HTMLElement): SemanticClassMatch[] {
  if (state.tokenClassSet.size === 0 || el.classList.length === 0) return [];
  const matches: SemanticClassMatch[] = [];
  for (const className of el.classList) {
    const tokenId = tokenIdFromClassName(className);
    if (!tokenId) continue;
    matches.push({ className, tokenId });
  }
  const uniqueByClassName = new Map<string, SemanticClassMatch>();
  for (const match of matches) {
    if (!uniqueByClassName.has(match.className)) {
      uniqueByClassName.set(match.className, match);
    }
  }
  return [...uniqueByClassName.values()];
}

function findOpaqueBackground(el: Element): { el: Element; color: string } | null {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const computed = window.getComputedStyle(current);
    const parsed = parseCssColor(computed.backgroundColor);
    if (parsed && parsed.alpha > 0.95) {
      return { el: current, color: computed.backgroundColor };
    }
    current = current.parentElement;
  }
  const rootStyle = window.getComputedStyle(document.documentElement);
  if (rootStyle.backgroundColor) {
    return { el: document.documentElement, color: rootStyle.backgroundColor };
  }
  return null;
}

function ensureInspectorStyle(): void {
  if (document.getElementById(INSPECTOR_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = INSPECTOR_STYLE_ID;
  style.textContent = `
    #${INSPECTOR_OVERLAY_ID} {
      position: fixed;
      pointer-events: none;
      z-index: 2147483640;
      border: 2px solid #7c9eff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 6px 14px rgba(0, 0, 0, 0.25);
      background: rgba(124, 158, 255, 0.12);
      border-radius: 2px;
      transition: all 60ms ease-out;
    }
    #${INSPECTOR_OVERLAY_ID}::before {
      content: attr(data-semantic-token-label);
      position: absolute;
      left: 0;
      max-width: min(44rem, calc(100vw - 1rem));
      padding: 0.1rem 0.45rem;
      border-radius: 0.3rem;
      background: rgba(10, 14, 25, 0.95);
      color: #f4f7ff;
      font: 600 0.66rem/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }
    #${INSPECTOR_OVERLAY_ID}[data-semantic-token-position="above"]::before {
      bottom: calc(100% + 6px);
    }
    #${INSPECTOR_OVERLAY_ID}[data-semantic-token-position="below"]::before {
      top: calc(100% + 6px);
    }
    [${HIGHLIGHT_ATTR}] {
      outline: 2px dashed #ff7ab6 !important;
      outline-offset: 1px !important;
    }
    [${SELECTED_ATTR}] {
      outline: 2px solid #7c9eff !important;
      outline-offset: 2px !important;
    }
  `;
  document.documentElement.appendChild(style);
}

function ensureInspectorOverlay(): HTMLElement {
  let overlay = document.getElementById(INSPECTOR_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = INSPECTOR_OVERLAY_ID;
    document.documentElement.appendChild(overlay);
  }
  return overlay as HTMLElement;
}

function clearInspectorOverlay(): void {
  document.getElementById(INSPECTOR_OVERLAY_ID)?.remove();
}

function positionOverlay(target: HTMLElement | null): void {
  if (!target || state.selectedTarget) {
    clearInspectorOverlay();
    return;
  }

  const overlay = ensureInspectorOverlay();
  const rect = target.getBoundingClientRect();
  const semanticClassMatches = semanticTokenClassesForElement(target);
  const labelEntries = semanticClassMatches.map((match) =>
    match.className === match.tokenId ? match.className : `${match.className} -> ${match.tokenId}`
  );
  const label = labelEntries.length
    ? `Semantic token class: ${labelEntries.join(', ')}`
    : 'Semantic token class: none';

  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.setAttribute('data-semantic-token-label', label);
  overlay.setAttribute('data-semantic-token-position', rect.top < 24 ? 'below' : 'above');
}

function elementMatches(el: HTMLElement): ElementTokenMatch[] {
  const computed = window.getComputedStyle(el);
  const foregroundToken = tokenFor(computed.color);
  const backgroundToken = tokenFor(computed.backgroundColor);
  const borderToken = tokenFor(computed.borderTopColor);

  return [
    {
      channel: 'foreground',
      tokenId: foregroundToken,
      aliases: aliasesForToken(foregroundToken),
      cssValue: computed.color
    },
    {
      channel: 'background',
      tokenId: backgroundToken,
      aliases: aliasesForToken(backgroundToken),
      cssValue: computed.backgroundColor
    },
    {
      channel: 'border',
      tokenId: borderToken,
      aliases: aliasesForToken(borderToken),
      cssValue: computed.borderTopColor
    }
  ];
}

function buildElementPayload(el: HTMLElement, selected: boolean): HoverElementPayload {
  const computed = window.getComputedStyle(el);
  const bg = findOpaqueBackground(el);
  const fg = computed.color;
  const semanticClassMatches = semanticTokenClassesForElement(el);

  let contrastLc: number | null = null;
  const fgParsed = parseCssColor(fg);
  const bgParsed = bg ? parseCssColor(bg.color) : null;
  if (fgParsed && bgParsed) {
    contrastLc = Math.round(apcaContrast(fgParsed, bgParsed) * 10) / 10;
  }

  const rect = el.getBoundingClientRect();

  return {
    selector: elementSelector(el),
    tagName: el.tagName.toLowerCase(),
    classes: [...el.classList],
    semanticClassMatches,
    role: el.getAttribute('role'),
    computedColor: fg,
    computedBackground: bg?.color ?? computed.backgroundColor,
    computedBorder: computed.borderTopColor,
    matches: elementMatches(el),
    contrastLc,
    selected,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  };
}

function emitSelectionPayload(): void {
  if (!state.selectedTarget) return;
  send({ kind: 'selected-element', payload: buildElementPayload(state.selectedTarget, true) });
}

function emitHoverPayload(): void {
  if (!state.hoverTarget || state.selectedTarget) return;
  send({ kind: 'hover-element', payload: buildElementPayload(state.hoverTarget, false) });
}

function setSelectedTarget(target: HTMLElement | null): void {
  if (state.selectedTarget === target) return;
  state.selectedTarget?.removeAttribute(SELECTED_ATTR);
  state.selectedTarget = target;
  if (!target) {
    send({ kind: 'selection-cleared' });
    positionOverlay(state.hoverTarget);
    return;
  }

  ensureInspectorStyle();
  target.setAttribute(SELECTED_ATTR, '1');
  clearInspectorOverlay();
  emitSelectionPayload();
}

function handleHoverMove(event: MouseEvent): void {
  if (!state.hoverActive) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === INSPECTOR_OVERLAY_ID) return;
  state.hoverTarget = target;
  positionOverlay(target);
  emitHoverPayload();
}

function handleHoverLeave(): void {
  if (!state.hoverActive) return;
  state.hoverTarget = null;
  if (!state.selectedTarget) {
    clearInspectorOverlay();
  }
  send({ kind: 'hover-cleared' });
}

function handleDocumentClick(event: MouseEvent): void {
  if (!state.hoverActive) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === INSPECTOR_OVERLAY_ID) return;
  event.preventDefault();
  event.stopPropagation();
  setSelectedTarget(target);
}

function setHoverActive(enabled: boolean): void {
  state.hoverActive = enabled;
  if (enabled) {
    ensureInspectorStyle();
    document.addEventListener('mousemove', handleHoverMove, true);
    document.addEventListener('mouseleave', handleHoverLeave, true);
    document.addEventListener('click', handleDocumentClick, true);
  } else {
    document.removeEventListener('mousemove', handleHoverMove, true);
    document.removeEventListener('mouseleave', handleHoverLeave, true);
    document.removeEventListener('click', handleDocumentClick, true);
    if (!state.selectedTarget) {
      clearInspectorOverlay();
    }
  }
}

function clearHighlights(): void {
  document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((node) => {
    node.removeAttribute(HIGHLIGHT_ATTR);
  });
}

function highlightToken(tokenId: string | null): void {
  clearHighlights();
  state.highlightedToken = tokenId;
  if (!tokenId) return;
  ensureInspectorStyle();

  const elements = document.querySelectorAll<HTMLElement>('body *');
  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    if (
      tokenFor(computed.color) === tokenId ||
      tokenFor(computed.backgroundColor) === tokenId ||
      tokenFor(computed.borderTopColor) === tokenId
    ) {
      el.setAttribute(HIGHLIGHT_ATTR, '1');
    }
  });
}

function setThemeMode(mode: string | null): void {
  const root = document.documentElement;

  if (mode === null) {
    if (state.liveThemeBaseline) {
      if (state.liveThemeBaseline.hadAttribute) {
        root.setAttribute('data-theme', state.liveThemeBaseline.value ?? '');
      } else {
        root.removeAttribute('data-theme');
      }
      state.liveThemeBaseline = null;
    }
  } else {
    if (!state.liveThemeBaseline) {
      state.liveThemeBaseline = {
        hadAttribute: root.hasAttribute('data-theme'),
        value: root.getAttribute('data-theme')
      };
    }

    root.dataset.theme = mode;
  }

  rebuildTokenLookup();
  flushPreviewStyle();
  emitSelectionPayload();
  emitHoverPayload();
}

function previewMode(): 'light' | 'dark' | 'alt' {
  const activeMode = document.documentElement.dataset.theme;
  if (activeMode === 'dark' || activeMode === 'alt') return activeMode;
  return 'light';
}

function ensurePreviewStyle(): HTMLStyleElement {
  let style = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = PREVIEW_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style;
}

function flushPreviewStyle(): void {
  const style = ensurePreviewStyle();
  if (!state.snapshot) {
    style.textContent = '';
    return;
  }

  const resolved = state.snapshot.resolved[previewMode()] ?? state.snapshot.resolved.light;
  const declarations = Object.entries(resolved.colors)
    .map(
      ([tokenId, payload]) =>
        `  --theme-${tokenId}: ${payload.css} !important;\n  --color-${tokenId}: ${payload.css} !important;`
    )
    .join('\n');
  const aliases = state.snapshot.manifest.aliases
    .map(
      (alias) => `  --${alias.name.replace(/^--/, '')}: var(--color-${alias.tokenId}) !important;`
    )
    .join('\n');

  style.textContent = `:root, :root[data-theme] {\n${declarations}\n${aliases}\n}`;
}

function ensureOverrideStyle(): HTMLStyleElement {
  let style = document.getElementById(OVERRIDE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = OVERRIDE_STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style;
}

function flushOverrideStyle(): void {
  const style = ensureOverrideStyle();
  if (state.overrides.size === 0) {
    style.textContent = '';
    return;
  }

  const declarations = [...state.overrides]
    .map(
      ([tokenId, css]) =>
        `  --theme-${tokenId}: ${css} !important;\n  --color-${tokenId}: ${css} !important;`
    )
    .join('\n');
  style.textContent = `:root, :root[data-theme] {\n${declarations}\n}`;
}

function setOverride(tokenId: string, css: string | null): void {
  if (css === null) {
    state.overrides.delete(tokenId);
  } else {
    state.overrides.set(tokenId, css);
  }
  flushOverrideStyle();
}

function clearAllOverrides(): void {
  state.overrides.clear();
  flushOverrideStyle();
}

function rebuildTokenLookup(): void {
  state.tokenColorMap.clear();
  state.tokenCssByTokenId.clear();
  state.tokenClassSet.clear();
  state.aliasMap.clear();

  if (!state.snapshot) {
    return;
  }

  const rootStyle = window.getComputedStyle(document.documentElement);
  const resolved = state.snapshot.resolved[previewMode()] ?? state.snapshot.resolved.light;
  for (const tokenId of Object.keys(state.snapshot.manifest.tokens)) {
    state.tokenClassSet.add(tokenId);
  }

  for (const [tokenId, resolvedColor] of Object.entries(resolved.colors)) {
    state.tokenCssByTokenId.set(tokenId, resolvedColor.css);

    const key = normalizeRgb(resolvedColor.css);
    if (key) state.tokenColorMap.set(key, tokenId);

    const live = rootStyle.getPropertyValue(`--theme-${tokenId}`);
    const liveKey = normalizeRgb(live);
    if (liveKey) state.tokenColorMap.set(liveKey, tokenId);

    const colorLive = rootStyle.getPropertyValue(`--color-${tokenId}`);
    const colorLiveKey = normalizeRgb(colorLive);
    if (colorLiveKey) state.tokenColorMap.set(colorLiveKey, tokenId);
  }

  for (const alias of state.snapshot.manifest.aliases) {
    const aliasName = alias.name.replace(/^--/, '');
    state.aliasMap.set(aliasName, alias.tokenId);
    const aliasValue = rootStyle.getPropertyValue(`--${aliasName}`);
    const aliasKey = normalizeRgb(aliasValue);
    if (aliasKey) state.tokenColorMap.set(aliasKey, alias.tokenId);
  }
}

function applySnapshot(snapshot: BridgeSnapshot): void {
  state.snapshot = snapshot;
  rebuildTokenLookup();
  flushPreviewStyle();
  emitSelectionPayload();
  emitHoverPayload();
}

function clearSnapshot(): void {
  state.snapshot = null;
  state.highlightedToken = null;
  state.tokenColorMap.clear();
  state.tokenCssByTokenId.clear();
  state.tokenClassSet.clear();
  state.aliasMap.clear();
  flushPreviewStyle();
  emitSelectionPayload();
  emitHoverPayload();
}

function rootCustomProperties(): Record<string, string> {
  const result: Record<string, string> = {};
  const rootStyle = window.getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyle.length; i += 1) {
    const name = rootStyle.item(i);
    if (name.startsWith('--')) {
      const value = rootStyle.getPropertyValue(name).trim();
      if (value) result[name] = value;
    }
  }
  return result;
}

function scanCoverage(): CoverageReport {
  const elements = document.querySelectorAll<HTMLElement>('body *');
  const byToken: Record<string, number> = {};
  const violations: CoverageReport['rawColorViolations'] = [];
  const tokenIds = [...state.tokenCssByTokenId.keys()];

  for (const tokenId of tokenIds) byToken[tokenId] = 0;

  const rawColorLimit = 30;

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const properties: Array<[CoverageReport['rawColorViolations'][number]['property'], string]> = [
      ['color', computed.color],
      ['background-color', computed.backgroundColor],
      ['border-color', computed.borderTopColor]
    ];

    for (const [prop, value] of properties) {
      const tokenId = tokenFor(value);
      if (tokenId) {
        byToken[tokenId] = (byToken[tokenId] ?? 0) + 1;
      } else {
        const parsed = parseCssColor(value);
        if (parsed && parsed.alpha > 0 && violations.length < rawColorLimit) {
          if (!(parsed.r === 0 && parsed.g === 0 && parsed.b === 0 && prop !== 'color')) {
            violations.push({ selector: elementSelector(el), property: prop, value });
          }
        }
      }
    }
  });

  const unusedTokens = tokenIds.filter((id) => (byToken[id] ?? 0) === 0);

  return {
    totalElements: elements.length,
    byToken,
    unusedTokens,
    rawColorViolations: violations,
    rootVariables: rootCustomProperties()
  };
}

function hasDirectText(el: Element): boolean {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && (child.nodeValue ?? '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

function scanContrast(): ContrastReport {
  const findings: ContrastFinding[] = [];
  const candidates = document.querySelectorAll<HTMLElement>('body *');
  let sampled = 0;
  const sampleLimit = 1500;
  const candidateLimit = 12000;
  let candidatesChecked = 0;

  for (const el of candidates) {
    if (sampled >= sampleLimit || candidatesChecked >= candidateLimit) break;
    candidatesChecked += 1;
    if (!hasDirectText(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width * rect.height < 4) continue;
    sampled += 1;

    const computed = window.getComputedStyle(el);
    const fgValue = computed.color;
    const bg = findOpaqueBackground(el);
    if (!bg) continue;
    const fg = parseCssColor(fgValue);
    const bgParsed = parseCssColor(bg.color);
    if (!fg || !bgParsed) continue;

    const lc = apcaContrast(fg, bgParsed);
    const severity = apcaSeverity(lc);
    if (severity === 'ok') continue;

    findings.push({
      selector: elementSelector(el),
      foreground: fgValue,
      background: bg.color,
      foregroundToken: tokenFor(fgValue),
      backgroundToken: tokenFor(bg.color),
      contrastLc: Math.round(lc * 10) / 10,
      severity,
      context: (el.textContent ?? '').trim().slice(0, 80)
    });
  }

  findings.sort((a, b) => Math.abs(a.contrastLc) - Math.abs(b.contrastLc));

  return { sampled, findings: findings.slice(0, 80) };
}

function handlePanelMessage(message: PanelToContentMessage): void {
  switch (message.kind) {
    case 'ping':
    case 'page-info':
      send({
        kind: 'page-info',
        url: location.href,
        title: document.title,
        theme: document.documentElement.dataset.theme ?? null
      });
      break;
    case 'clear-snapshot':
      clearSnapshot();
      break;
    case 'hover-inspector':
      setHoverActive(message.enabled);
      break;
    case 'select-element':
      setSelectedTarget(state.hoverTarget);
      break;
    case 'clear-selection':
      setSelectedTarget(null);
      break;
    case 'highlight-token':
    case 'focus-token':
    case 'reveal-token-usage':
      highlightToken(message.tokenId);
      break;
    case 'override-token':
      setOverride(message.tokenId, message.css);
      break;
    case 'clear-all-overrides':
      clearAllOverrides();
      break;
    case 'set-theme':
      setThemeMode(message.mode);
      send({
        kind: 'page-info',
        url: location.href,
        title: document.title,
        theme: document.documentElement.dataset.theme ?? null
      });
      break;
    case 'update-snapshot':
      applySnapshot(message.snapshot);
      break;
    case 'scan-coverage':
      send({ kind: 'coverage-report', report: scanCoverage() });
      break;
    case 'scan-contrast':
      send({ kind: 'contrast-report', report: scanContrast() });
      break;
    default:
      break;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    handlePanelMessage(message as PanelToContentMessage);
    sendResponse({ ok: true });
  } catch (error) {
    send({
      kind: 'error',
      message: error instanceof Error ? error.message : 'Content script error'
    });
    sendResponse({ ok: false });
  }
  return true;
});

send({ kind: 'hello', url: location.href, title: document.title });
