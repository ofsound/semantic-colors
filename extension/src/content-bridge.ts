import { apcaContrast, apcaSeverity, parseCssColor } from './shared/color';
import {
  HIGHLIGHT_ATTR,
  INSPECTOR_OVERLAY_ID,
  INSPECTOR_STYLE_ID,
  OVERRIDE_STYLE_ID
} from './shared/constants';
import type { ContentMessageEnvelope } from './shared/messaging';
import type {
  BridgeSnapshot,
  ContentToPanelMessage,
  ContrastFinding,
  ContrastReport,
  CoverageReport,
  HoverElementPayload,
  PanelToContentMessage
} from './shared/types';

/**
 * Content bridge: runs in every inspected page. Receives commands from the
 * panel (via background SW) and performs DOM inspection / mutation in the
 * live product page.
 */

const state = {
  hoverActive: false,
  hoverTarget: null as HTMLElement | null,
  highlightedToken: null as string | null,
  tokenColorMap: new Map<string, string>(), // normalized rgb(a) → tokenId
  tokenCssByTokenId: new Map<string, string>(), // tokenId → `--theme-foo` css
  aliasMap: new Map<string, string>(), // alias name (no `--`) → tokenId
  overrides: new Map<string, string>(), // tokenId → css value
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

// --- Hover inspector ------------------------------------------------------

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
    [${HIGHLIGHT_ATTR}] {
      outline: 2px dashed #ff7ab6 !important;
      outline-offset: 1px !important;
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

function buildHoverPayload(el: HTMLElement): HoverElementPayload {
  const computed = window.getComputedStyle(el);
  const bg = findOpaqueBackground(el);
  const fg = computed.color;

  const fgToken = tokenFor(fg);
  const bgToken = bg ? tokenFor(bg.color) : null;
  const matchedToken = fgToken ?? bgToken;
  const matchedChannel = fgToken ? 'color' : bgToken ? 'background' : null;

  let contrastLc: number | null = null;
  const fgParsed = parseCssColor(fg);
  const bgParsed = bg ? parseCssColor(bg.color) : null;
  if (fgParsed && bgParsed) {
    contrastLc = Math.round(apcaContrast(fgParsed, bgParsed) * 10) / 10;
  }

  const aliasChain: string[] = [];
  if (matchedToken) {
    for (const [alias, tokenId] of state.aliasMap) {
      if (tokenId === matchedToken) aliasChain.push(`--${alias}`);
    }
  }

  const rect = el.getBoundingClientRect();

  return {
    selector: elementSelector(el),
    tagName: el.tagName.toLowerCase(),
    classes: [...el.classList],
    role: el.getAttribute('role'),
    computedColor: fg,
    computedBackground: bg?.color ?? null,
    matchedToken,
    matchedTokenChannel: matchedChannel,
    aliasChain,
    contrastLc,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  };
}

function handleHoverMove(event: MouseEvent): void {
  if (!state.hoverActive) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === INSPECTOR_OVERLAY_ID) return;
  state.hoverTarget = target;

  const overlay = ensureInspectorOverlay();
  const rect = target.getBoundingClientRect();
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  send({ kind: 'hover-element', payload: buildHoverPayload(target) });
}

function handleHoverLeave(): void {
  if (!state.hoverActive) return;
  state.hoverTarget = null;
  clearInspectorOverlay();
  send({ kind: 'hover-cleared' });
}

function setHoverActive(enabled: boolean): void {
  state.hoverActive = enabled;
  if (enabled) {
    ensureInspectorStyle();
    document.addEventListener('mousemove', handleHoverMove, true);
    document.addEventListener('mouseleave', handleHoverLeave, true);
  } else {
    document.removeEventListener('mousemove', handleHoverMove, true);
    document.removeEventListener('mouseleave', handleHoverLeave, true);
    clearInspectorOverlay();
  }
}

// --- Highlight by token ---------------------------------------------------

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

// --- Theme mode ------------------------------------------------------------

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
    return;
  }

  if (!state.liveThemeBaseline) {
    state.liveThemeBaseline = {
      hadAttribute: root.hasAttribute('data-theme'),
      value: root.getAttribute('data-theme')
    };
  }

  root.dataset.theme = mode;
}

// --- Overrides ------------------------------------------------------------

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

// --- Snapshot update ------------------------------------------------------

function applySnapshot(snapshot: BridgeSnapshot): void {
  state.tokenColorMap.clear();
  state.tokenCssByTokenId.clear();
  state.aliasMap.clear();

  const rootStyle = window.getComputedStyle(document.documentElement);
  const activeMode = (document.documentElement.dataset.theme ?? 'light') as
    | 'light'
    | 'dark'
    | 'alt';

  const resolved = snapshot.resolved[activeMode] ?? snapshot.resolved.light;
  for (const [tokenId, resolvedColor] of Object.entries(resolved.colors)) {
    state.tokenCssByTokenId.set(tokenId, resolvedColor.css);
    // Index by the browser's normalized rgb form.
    const key = normalizeRgb(resolvedColor.css);
    if (key) state.tokenColorMap.set(key, tokenId);

    // Also index by the actual computed var value, in case the page resolves
    // tokens with slight gamut differences from our engine output.
    const live = rootStyle.getPropertyValue(`--theme-${tokenId}`);
    const liveKey = normalizeRgb(live);
    if (liveKey) state.tokenColorMap.set(liveKey, tokenId);

    const colorLive = rootStyle.getPropertyValue(`--color-${tokenId}`);
    const colorLiveKey = normalizeRgb(colorLive);
    if (colorLiveKey) state.tokenColorMap.set(colorLiveKey, tokenId);
  }

  for (const alias of snapshot.manifest.aliases) {
    state.aliasMap.set(alias.name.replace(/^--/, ''), alias.tokenId);
    const aliasValue = rootStyle.getPropertyValue(`--${alias.name.replace(/^--/, '')}`);
    const aliasKey = normalizeRgb(aliasValue);
    if (aliasKey) state.tokenColorMap.set(aliasKey, alias.tokenId);
  }
}

// --- Coverage scan --------------------------------------------------------

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
          // Filter out "default" colors to avoid noise.
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

// --- Contrast audit -------------------------------------------------------

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
  const limit = 1500;

  candidates.forEach((el) => {
    if (sampled > limit) return;
    if (!hasDirectText(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width * rect.height < 4) return;
    sampled += 1;

    const computed = window.getComputedStyle(el);
    const fgValue = computed.color;
    const bg = findOpaqueBackground(el);
    if (!bg) return;
    const fg = parseCssColor(fgValue);
    const bgParsed = parseCssColor(bg.color);
    if (!fg || !bgParsed) return;

    const lc = apcaContrast(fg, bgParsed);
    const severity = apcaSeverity(lc);
    if (severity === 'ok') return;

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
  });

  findings.sort((a, b) => Math.abs(a.contrastLc) - Math.abs(b.contrastLc));

  return { sampled, findings: findings.slice(0, 80) };
}

// --- Message dispatch -----------------------------------------------------

function handlePanelMessage(message: PanelToContentMessage): void {
  switch (message.kind) {
    case 'ping':
      send({
        kind: 'page-info',
        url: location.href,
        title: document.title,
        theme: document.documentElement.dataset.theme ?? null
      });
      break;
    case 'page-info':
      send({
        kind: 'page-info',
        url: location.href,
        title: document.title,
        theme: document.documentElement.dataset.theme ?? null
      });
      break;
    case 'hover-inspector':
      setHoverActive(message.enabled);
      break;
    case 'highlight-token':
      highlightToken(message.tokenId);
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
    case 'override-token':
      setOverride(message.tokenId, message.css);
      break;
    case 'clear-all-overrides':
      clearAllOverrides();
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
