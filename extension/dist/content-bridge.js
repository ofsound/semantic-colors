"use strict";
(() => {
  // extension/src/shared/color.ts
  var probeContext = null;
  function getProbeContext() {
    if (probeContext) return probeContext;
    if (typeof document === "undefined") return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      probeContext = canvas.getContext("2d", { willReadFrequently: true });
      return probeContext;
    } catch {
      return null;
    }
  }
  function parseCssColor(input) {
    if (!input) return null;
    const text = input.trim();
    if (!text || text === "none" || text === "transparent") return null;
    const ctx = getProbeContext();
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    try {
      ctx.fillStyle = "#000";
      ctx.fillStyle = text;
    } catch {
      return null;
    }
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const alpha = data[3] / 255;
    if (alpha === 0) return null;
    return { r: data[0], g: data[1], b: data[2], alpha };
  }
  var normBG = 0.56;
  var normTXT = 0.57;
  var revTXT = 0.62;
  var revBG = 0.65;
  var blkThrs = 0.022;
  var blkClmp = 1.414;
  var scaleBoW = 1.14;
  var scaleWoB = 1.14;
  var loBoWoffset = 0.027;
  var loWoBoffset = 0.027;
  var deltaYmin = 5e-4;
  function sRGBtoY(rgb) {
    const r = (rgb.r / 255) ** 2.4;
    const g = (rgb.g / 255) ** 2.4;
    const b = (rgb.b / 255) ** 2.4;
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  }
  function apcaContrast(foreground, background) {
    let txtY = sRGBtoY(foreground);
    let bgY = sRGBtoY(background);
    if (Math.abs(bgY - txtY) < deltaYmin) return 0;
    if (txtY <= blkThrs) txtY += (blkThrs - txtY) ** blkClmp;
    if (bgY <= blkThrs) bgY += (blkThrs - bgY) ** blkClmp;
    let outputContrast;
    if (bgY > txtY) {
      const SAPC = (bgY ** normBG - txtY ** normTXT) * scaleBoW;
      outputContrast = SAPC < loBoWoffset ? 0 : SAPC - loBoWoffset;
    } else {
      const SAPC = (bgY ** revBG - txtY ** revTXT) * scaleWoB;
      outputContrast = SAPC > -loWoBoffset ? 0 : SAPC + loWoBoffset;
    }
    return outputContrast * 100;
  }
  function apcaSeverity(lc) {
    const abs = Math.abs(lc);
    if (abs >= 75) return "ok";
    if (abs >= 60) return "ok";
    if (abs >= 45) return "warn";
    return "fail";
  }

  // extension/src/shared/constants.ts
  var HIGHLIGHT_ATTR = "data-semantic-colors-highlight";
  var INSPECTOR_OVERLAY_ID = "semantic-colors-inspector-overlay";
  var INSPECTOR_STYLE_ID = "semantic-colors-inspector-style";
  var OVERRIDE_STYLE_ID = "semantic-colors-override-style";

  // extension/src/content-bridge.ts
  var state = {
    hoverActive: false,
    hoverTarget: null,
    highlightedToken: null,
    tokenColorMap: /* @__PURE__ */ new Map(),
    // normalized rgb(a) → tokenId
    tokenCssByTokenId: /* @__PURE__ */ new Map(),
    // tokenId → `--theme-foo` css
    aliasMap: /* @__PURE__ */ new Map(),
    // alias name (no `--`) → tokenId
    overrides: /* @__PURE__ */ new Map()
    // tokenId → css value
  };
  function send(message) {
    const envelope = { source: "content", payload: message };
    try {
      chrome.runtime.sendMessage(envelope);
    } catch {
    }
  }
  function normalizeRgb(input) {
    const parsed = parseCssColor(input);
    if (!parsed) return null;
    if (parsed.alpha >= 1) return `${parsed.r},${parsed.g},${parsed.b}`;
    return `${parsed.r},${parsed.g},${parsed.b},${parsed.alpha.toFixed(3)}`;
  }
  function tokenFor(cssColor) {
    const key = normalizeRgb(cssColor);
    if (!key) return null;
    return state.tokenColorMap.get(key) ?? null;
  }
  function elementSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let current = el;
    let depth = 0;
    while (current && current !== document.documentElement && depth < 4) {
      const tag = current.tagName.toLowerCase();
      const cls = current.classList.length ? `.${[...current.classList].map((c) => CSS.escape(c)).join(".")}` : "";
      parts.unshift(`${tag}${cls}`);
      current = current.parentElement;
      depth += 1;
    }
    return parts.join(" > ");
  }
  function findOpaqueBackground(el) {
    let current = el;
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
  function ensureInspectorStyle() {
    if (document.getElementById(INSPECTOR_STYLE_ID)) return;
    const style = document.createElement("style");
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
  function ensureInspectorOverlay() {
    let overlay = document.getElementById(INSPECTOR_OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = INSPECTOR_OVERLAY_ID;
      document.documentElement.appendChild(overlay);
    }
    return overlay;
  }
  function clearInspectorOverlay() {
    document.getElementById(INSPECTOR_OVERLAY_ID)?.remove();
  }
  function buildHoverPayload(el) {
    const computed = window.getComputedStyle(el);
    const bg = findOpaqueBackground(el);
    const fg = computed.color;
    const fgToken = tokenFor(fg);
    const bgToken = bg ? tokenFor(bg.color) : null;
    const matchedToken = fgToken ?? bgToken;
    const matchedChannel = fgToken ? "color" : bgToken ? "background" : null;
    let contrastLc = null;
    const fgParsed = parseCssColor(fg);
    const bgParsed = bg ? parseCssColor(bg.color) : null;
    if (fgParsed && bgParsed) {
      contrastLc = Math.round(apcaContrast(fgParsed, bgParsed) * 10) / 10;
    }
    const aliasChain = [];
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
      role: el.getAttribute("role"),
      computedColor: fg,
      computedBackground: bg?.color ?? null,
      matchedToken,
      matchedTokenChannel: matchedChannel,
      aliasChain,
      contrastLc,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  }
  function handleHoverMove(event) {
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
    send({ kind: "hover-element", payload: buildHoverPayload(target) });
  }
  function handleHoverLeave() {
    if (!state.hoverActive) return;
    state.hoverTarget = null;
    clearInspectorOverlay();
    send({ kind: "hover-cleared" });
  }
  function setHoverActive(enabled) {
    state.hoverActive = enabled;
    if (enabled) {
      ensureInspectorStyle();
      document.addEventListener("mousemove", handleHoverMove, true);
      document.addEventListener("mouseleave", handleHoverLeave, true);
    } else {
      document.removeEventListener("mousemove", handleHoverMove, true);
      document.removeEventListener("mouseleave", handleHoverLeave, true);
      clearInspectorOverlay();
    }
  }
  function clearHighlights() {
    document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((node) => {
      node.removeAttribute(HIGHLIGHT_ATTR);
    });
  }
  function highlightToken(tokenId) {
    clearHighlights();
    state.highlightedToken = tokenId;
    if (!tokenId) return;
    ensureInspectorStyle();
    const elements = document.querySelectorAll("body *");
    elements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      if (tokenFor(computed.color) === tokenId || tokenFor(computed.backgroundColor) === tokenId || tokenFor(computed.borderTopColor) === tokenId) {
        el.setAttribute(HIGHLIGHT_ATTR, "1");
      }
    });
  }
  function setThemeMode(mode) {
    if (mode === null) {
      document.documentElement.removeAttribute("data-theme");
      return;
    }
    document.documentElement.dataset.theme = mode;
  }
  function ensureOverrideStyle() {
    let style = document.getElementById(OVERRIDE_STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = OVERRIDE_STYLE_ID;
      document.documentElement.appendChild(style);
    }
    return style;
  }
  function flushOverrideStyle() {
    const style = ensureOverrideStyle();
    if (state.overrides.size === 0) {
      style.textContent = "";
      return;
    }
    const declarations = [...state.overrides].map(
      ([tokenId, css]) => `  --theme-${tokenId}: ${css} !important;
  --color-${tokenId}: ${css} !important;`
    ).join("\n");
    style.textContent = `:root, :root[data-theme] {
${declarations}
}`;
  }
  function setOverride(tokenId, css) {
    if (css === null) {
      state.overrides.delete(tokenId);
    } else {
      state.overrides.set(tokenId, css);
    }
    flushOverrideStyle();
  }
  function clearAllOverrides() {
    state.overrides.clear();
    flushOverrideStyle();
  }
  function applySnapshot(snapshot) {
    state.tokenColorMap.clear();
    state.tokenCssByTokenId.clear();
    state.aliasMap.clear();
    const rootStyle = window.getComputedStyle(document.documentElement);
    const activeMode = document.documentElement.dataset.theme ?? "light";
    const resolved = snapshot.resolved[activeMode] ?? snapshot.resolved.light;
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
    for (const alias of snapshot.manifest.aliases) {
      state.aliasMap.set(alias.name.replace(/^--/, ""), alias.tokenId);
      const aliasValue = rootStyle.getPropertyValue(`--${alias.name.replace(/^--/, "")}`);
      const aliasKey = normalizeRgb(aliasValue);
      if (aliasKey) state.tokenColorMap.set(aliasKey, alias.tokenId);
    }
  }
  function rootCustomProperties() {
    const result = {};
    const rootStyle = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i += 1) {
      const name = rootStyle.item(i);
      if (name.startsWith("--")) {
        const value = rootStyle.getPropertyValue(name).trim();
        if (value) result[name] = value;
      }
    }
    return result;
  }
  function scanCoverage() {
    const elements = document.querySelectorAll("body *");
    const byToken = {};
    const violations = [];
    const tokenIds = [...state.tokenCssByTokenId.keys()];
    for (const tokenId of tokenIds) byToken[tokenId] = 0;
    const rawColorLimit = 30;
    elements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const properties = [
        ["color", computed.color],
        ["background-color", computed.backgroundColor],
        ["border-color", computed.borderTopColor]
      ];
      for (const [prop, value] of properties) {
        const tokenId = tokenFor(value);
        if (tokenId) {
          byToken[tokenId] = (byToken[tokenId] ?? 0) + 1;
        } else {
          const parsed = parseCssColor(value);
          if (parsed && parsed.alpha > 0 && violations.length < rawColorLimit) {
            if (!(parsed.r === 0 && parsed.g === 0 && parsed.b === 0 && prop !== "color")) {
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
  function hasDirectText(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && (child.nodeValue ?? "").trim().length > 0) {
        return true;
      }
    }
    return false;
  }
  function scanContrast() {
    const findings = [];
    const candidates = document.querySelectorAll("body *");
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
      if (severity === "ok") return;
      findings.push({
        selector: elementSelector(el),
        foreground: fgValue,
        background: bg.color,
        foregroundToken: tokenFor(fgValue),
        backgroundToken: tokenFor(bg.color),
        contrastLc: Math.round(lc * 10) / 10,
        severity,
        context: (el.textContent ?? "").trim().slice(0, 80)
      });
    });
    findings.sort((a, b) => Math.abs(a.contrastLc) - Math.abs(b.contrastLc));
    return { sampled, findings: findings.slice(0, 80) };
  }
  function handlePanelMessage(message) {
    switch (message.kind) {
      case "ping":
        send({
          kind: "page-info",
          url: location.href,
          title: document.title,
          theme: document.documentElement.dataset.theme ?? null
        });
        break;
      case "page-info":
        send({
          kind: "page-info",
          url: location.href,
          title: document.title,
          theme: document.documentElement.dataset.theme ?? null
        });
        break;
      case "hover-inspector":
        setHoverActive(message.enabled);
        break;
      case "highlight-token":
        highlightToken(message.tokenId);
        break;
      case "set-theme":
        setThemeMode(message.mode);
        break;
      case "override-token":
        setOverride(message.tokenId, message.css);
        break;
      case "clear-all-overrides":
        clearAllOverrides();
        break;
      case "update-snapshot":
        applySnapshot(message.snapshot);
        break;
      case "scan-coverage":
        send({ kind: "coverage-report", report: scanCoverage() });
        break;
      case "scan-contrast":
        send({ kind: "contrast-report", report: scanContrast() });
        break;
      default:
        break;
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      handlePanelMessage(message);
      sendResponse({ ok: true });
    } catch (error) {
      send({
        kind: "error",
        message: error instanceof Error ? error.message : "Content script error"
      });
      sendResponse({ ok: false });
    }
    return true;
  });
  send({ kind: "hello", url: location.href, title: document.title });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb2xvci50cyIsICIuLi9zcmMvc2hhcmVkL2NvbnN0YW50cy50cyIsICIuLi9zcmMvY29udGVudC1icmlkZ2UudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHsgT2tsY2hDb2xvciB9IGZyb20gJy4vdHlwZXMnO1xuXG4vLyAtLS0gT0tMQ0ggPC0+IHNSR0IgY29udmVyc2lvbnMgKEQ2NSwgbGluZWFyLXNSR0IgdmlhIE9rbGFiKS4gLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gc3JnYlRvTGluZWFyKHZhbHVlOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCB2ID0gdmFsdWUgLyAyNTU7XG4gIHJldHVybiB2IDw9IDAuMDQwNDUgPyB2IC8gMTIuOTIgOiAoKHYgKyAwLjA1NSkgLyAxLjA1NSkgKiogMi40O1xufVxuXG5mdW5jdGlvbiBsaW5lYXJUb1NyZ2IodmFsdWU6IG51bWJlcik6IG51bWJlciB7XG4gIGNvbnN0IHYgPSB2YWx1ZSA8PSAwLjAwMzEzMDggPyB2YWx1ZSAqIDEyLjkyIDogMS4wNTUgKiBNYXRoLnBvdyh2YWx1ZSwgMSAvIDIuNCkgLSAwLjA1NTtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh2ICogMjU1KSkpO1xufVxuXG5mdW5jdGlvbiBva2xhYlRvTGluZWFyU3JnYihMOiBudW1iZXIsIGE6IG51bWJlciwgYjogbnVtYmVyKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgbF8gPSBMICsgMC4zOTYzMzc3Nzc0ICogYSArIDAuMjE1ODAzNzU3MyAqIGI7XG4gIGNvbnN0IG1fID0gTCAtIDAuMTA1NTYxMzQ1OCAqIGEgLSAwLjA2Mzg1NDE3MjggKiBiO1xuICBjb25zdCBzXyA9IEwgLSAwLjA4OTQ4NDE3NzUgKiBhIC0gMS4yOTE0ODU1NDggKiBiO1xuXG4gIGNvbnN0IGwgPSBsXyAqKiAzO1xuICBjb25zdCBtID0gbV8gKiogMztcbiAgY29uc3QgcyA9IHNfICoqIDM7XG5cbiAgcmV0dXJuIFtcbiAgICA0LjA3Njc0MTY2MjEgKiBsIC0gMy4zMDc3MTE1OTEzICogbSArIDAuMjMwOTY5OTI5MiAqIHMsXG4gICAgLTEuMjY4NDM4MDA0NiAqIGwgKyAyLjYwOTc1NzQwMTEgKiBtIC0gMC4zNDEzMTkzOTY1ICogcyxcbiAgICAtMC4wMDQxOTYwODYzICogbCAtIDAuNzAzNDE4NjE0NyAqIG0gKyAxLjcwNzYxNDcwMSAqIHNcbiAgXTtcbn1cblxuZnVuY3Rpb24gbGluZWFyU3JnYlRvT2tsYWIocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlcik6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gIGNvbnN0IGwgPSBNYXRoLmNicnQoMC40MTIyMjE0NzA4ICogciArIDAuNTM2MzMyNTM2MyAqIGcgKyAwLjA1MTQ0NTk5MjkgKiBiKTtcbiAgY29uc3QgbSA9IE1hdGguY2JydCgwLjIxMTkwMzQ5ODIgKiByICsgMC42ODA2OTk1NDUxICogZyArIDAuMTA3Mzk2OTU2NiAqIGIpO1xuICBjb25zdCBzID0gTWF0aC5jYnJ0KDAuMDg4MzAyNDYxOSAqIHIgKyAwLjI4MTcxODgzNzYgKiBnICsgMC42Mjk5Nzg3MDA1ICogYik7XG5cbiAgcmV0dXJuIFtcbiAgICAwLjIxMDQ1NDI1NTMgKiBsICsgMC43OTM2MTc3ODUgKiBtIC0gMC4wMDQwNzIwNDY4ICogcyxcbiAgICAxLjk3Nzk5ODQ5NTEgKiBsIC0gMi40Mjg1OTIyMDUgKiBtICsgMC40NTA1OTM3MDk5ICogcyxcbiAgICAwLjAyNTkwNDAzNzEgKiBsICsgMC43ODI3NzE3NjYyICogbSAtIDAuODA4Njc1NzY2ICogc1xuICBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb2tsY2hUb1JnYihjb2xvcjogT2tsY2hDb2xvcik6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYWxwaGE6IG51bWJlciB9IHtcbiAgY29uc3QgaHVlUmFkID0gKGNvbG9yLmggKiBNYXRoLlBJKSAvIDE4MDtcbiAgY29uc3QgYSA9IGNvbG9yLmMgKiBNYXRoLmNvcyhodWVSYWQpO1xuICBjb25zdCBiID0gY29sb3IuYyAqIE1hdGguc2luKGh1ZVJhZCk7XG4gIGNvbnN0IFtsciwgbGcsIGxiXSA9IG9rbGFiVG9MaW5lYXJTcmdiKGNvbG9yLmwsIGEsIGIpO1xuICByZXR1cm4ge1xuICAgIHI6IGxpbmVhclRvU3JnYihsciksXG4gICAgZzogbGluZWFyVG9TcmdiKGxnKSxcbiAgICBiOiBsaW5lYXJUb1NyZ2IobGIpLFxuICAgIGFscGhhOiBjb2xvci5hbHBoYSA/PyAxXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZ2JUb09rbGNoKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIsIGFscGhhID0gMSk6IE9rbGNoQ29sb3Ige1xuICBjb25zdCBbTCwgYSwgYkxhYl0gPSBsaW5lYXJTcmdiVG9Pa2xhYihzcmdiVG9MaW5lYXIociksIHNyZ2JUb0xpbmVhcihnKSwgc3JnYlRvTGluZWFyKGIpKTtcbiAgY29uc3QgYyA9IE1hdGguc3FydChhICogYSArIGJMYWIgKiBiTGFiKTtcbiAgbGV0IGggPSAoTWF0aC5hdGFuMihiTGFiLCBhKSAqIDE4MCkgLyBNYXRoLlBJO1xuICBpZiAoaCA8IDApIGggKz0gMzYwO1xuICByZXR1cm4geyBsOiBMLCBjLCBoLCBhbHBoYSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb2tsY2hUb0Nzcyhjb2xvcjogT2tsY2hDb2xvcik6IHN0cmluZyB7XG4gIGNvbnN0IHsgciwgZywgYiwgYWxwaGEgfSA9IG9rbGNoVG9SZ2IoY29sb3IpO1xuICBpZiAoYWxwaGEgPCAxKSB7XG4gICAgcmV0dXJuIGByZ2JhKCR7cn0sICR7Z30sICR7Yn0sICR7YWxwaGEudG9GaXhlZCgzKX0pYDtcbiAgfVxuICByZXR1cm4gYHJnYigke3J9LCAke2d9LCAke2J9KWA7XG59XG5cbi8vIC0tLSBQYXJzZSBhbnkgQ1NTIGNvbG9yIHN0cmluZyBpbnRvIHNSR0IgdHVwbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmxldCBwcm9iZUNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCB8IG51bGwgPSBudWxsO1xuXG5mdW5jdGlvbiBnZXRQcm9iZUNvbnRleHQoKTogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgbnVsbCB7XG4gIGlmIChwcm9iZUNvbnRleHQpIHJldHVybiBwcm9iZUNvbnRleHQ7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBjYW52YXMud2lkdGggPSAxO1xuICAgIGNhbnZhcy5oZWlnaHQgPSAxO1xuICAgIHByb2JlQ29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcsIHsgd2lsbFJlYWRGcmVxdWVudGx5OiB0cnVlIH0pO1xuICAgIHJldHVybiBwcm9iZUNvbnRleHQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29sb3Ige1xuICByOiBudW1iZXI7XG4gIGc6IG51bWJlcjtcbiAgYjogbnVtYmVyO1xuICBhbHBoYTogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDc3NDb2xvcihpbnB1dDogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCk6IFBhcnNlZENvbG9yIHwgbnVsbCB7XG4gIGlmICghaW5wdXQpIHJldHVybiBudWxsO1xuICBjb25zdCB0ZXh0ID0gaW5wdXQudHJpbSgpO1xuICBpZiAoIXRleHQgfHwgdGV4dCA9PT0gJ25vbmUnIHx8IHRleHQgPT09ICd0cmFuc3BhcmVudCcpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGN0eCA9IGdldFByb2JlQ29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIG51bGw7XG5cbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCAxLCAxKTtcbiAgdHJ5IHtcbiAgICBjdHguZmlsbFN0eWxlID0gJyMwMDAnO1xuICAgIGN0eC5maWxsU3R5bGUgPSB0ZXh0O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGN0eC5maWxsUmVjdCgwLCAwLCAxLCAxKTtcbiAgY29uc3QgZGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgMSwgMSkuZGF0YTtcbiAgY29uc3QgYWxwaGEgPSBkYXRhWzNdIC8gMjU1O1xuICBpZiAoYWxwaGEgPT09IDApIHJldHVybiBudWxsO1xuICByZXR1cm4geyByOiBkYXRhWzBdLCBnOiBkYXRhWzFdLCBiOiBkYXRhWzJdLCBhbHBoYSB9O1xufVxuXG4vLyAtLS0gQVBDQSBjb250cmFzdCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gTWluaW1hbCBBUENBIChBY2Nlc3NpYmxlIFBlcmNlcHR1YWwgQ29udHJhc3QgQWxnb3JpdGhtKSBpbXBsZW1lbnRhdGlvbi5cbi8vIE1hdGNoZXMgYXBjYS13MyBvdXRwdXRzIHdpdGhpbiBkaXNwbGF5IHByZWNpc2lvbiBmb3Igc1JHQiBpbnB1dHMuXG5cbmNvbnN0IG5vcm1CRyA9IDAuNTY7XG5jb25zdCBub3JtVFhUID0gMC41NztcbmNvbnN0IHJldlRYVCA9IDAuNjI7XG5jb25zdCByZXZCRyA9IDAuNjU7XG5jb25zdCBibGtUaHJzID0gMC4wMjI7XG5jb25zdCBibGtDbG1wID0gMS40MTQ7XG5jb25zdCBzY2FsZUJvVyA9IDEuMTQ7XG5jb25zdCBzY2FsZVdvQiA9IDEuMTQ7XG5jb25zdCBsb0JvV29mZnNldCA9IDAuMDI3O1xuY29uc3QgbG9Xb0JvZmZzZXQgPSAwLjAyNztcbmNvbnN0IGRlbHRhWW1pbiA9IDAuMDAwNTtcblxuZnVuY3Rpb24gc1JHQnRvWShyZ2I6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlciB9KTogbnVtYmVyIHtcbiAgY29uc3QgciA9IChyZ2IuciAvIDI1NSkgKiogMi40O1xuICBjb25zdCBnID0gKHJnYi5nIC8gMjU1KSAqKiAyLjQ7XG4gIGNvbnN0IGIgPSAocmdiLmIgLyAyNTUpICoqIDIuNDtcbiAgcmV0dXJuIDAuMjEyNjcyOSAqIHIgKyAwLjcxNTE1MjIgKiBnICsgMC4wNzIxNzUgKiBiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBjYUNvbnRyYXN0KGZvcmVncm91bmQ6IFBhcnNlZENvbG9yLCBiYWNrZ3JvdW5kOiBQYXJzZWRDb2xvcik6IG51bWJlciB7XG4gIGxldCB0eHRZID0gc1JHQnRvWShmb3JlZ3JvdW5kKTtcbiAgbGV0IGJnWSA9IHNSR0J0b1koYmFja2dyb3VuZCk7XG5cbiAgaWYgKE1hdGguYWJzKGJnWSAtIHR4dFkpIDwgZGVsdGFZbWluKSByZXR1cm4gMDtcblxuICBpZiAodHh0WSA8PSBibGtUaHJzKSB0eHRZICs9IChibGtUaHJzIC0gdHh0WSkgKiogYmxrQ2xtcDtcbiAgaWYgKGJnWSA8PSBibGtUaHJzKSBiZ1kgKz0gKGJsa1RocnMgLSBiZ1kpICoqIGJsa0NsbXA7XG5cbiAgbGV0IG91dHB1dENvbnRyYXN0OiBudW1iZXI7XG4gIGlmIChiZ1kgPiB0eHRZKSB7XG4gICAgY29uc3QgU0FQQyA9IChiZ1kgKiogbm9ybUJHIC0gdHh0WSAqKiBub3JtVFhUKSAqIHNjYWxlQm9XO1xuICAgIG91dHB1dENvbnRyYXN0ID0gU0FQQyA8IGxvQm9Xb2Zmc2V0ID8gMCA6IFNBUEMgLSBsb0JvV29mZnNldDtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBTQVBDID0gKGJnWSAqKiByZXZCRyAtIHR4dFkgKiogcmV2VFhUKSAqIHNjYWxlV29CO1xuICAgIG91dHB1dENvbnRyYXN0ID0gU0FQQyA+IC1sb1dvQm9mZnNldCA/IDAgOiBTQVBDICsgbG9Xb0JvZmZzZXQ7XG4gIH1cbiAgcmV0dXJuIG91dHB1dENvbnRyYXN0ICogMTAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBjYVNldmVyaXR5KGxjOiBudW1iZXIpOiAnb2snIHwgJ3dhcm4nIHwgJ2ZhaWwnIHtcbiAgY29uc3QgYWJzID0gTWF0aC5hYnMobGMpO1xuICBpZiAoYWJzID49IDc1KSByZXR1cm4gJ29rJztcbiAgaWYgKGFicyA+PSA2MCkgcmV0dXJuICdvayc7XG4gIGlmIChhYnMgPj0gNDUpIHJldHVybiAnd2Fybic7XG4gIHJldHVybiAnZmFpbCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRPa2xjaChjb2xvcjogT2tsY2hDb2xvcik6IHN0cmluZyB7XG4gIGNvbnN0IGwgPSAoY29sb3IubCAqIDEwMCkudG9GaXhlZCgyKTtcbiAgY29uc3QgYyA9IGNvbG9yLmMudG9GaXhlZCg0KTtcbiAgY29uc3QgaCA9IGNvbG9yLmgudG9GaXhlZCgyKTtcbiAgY29uc3QgYWxwaGEgPSBjb2xvci5hbHBoYSAhPT0gdW5kZWZpbmVkICYmIGNvbG9yLmFscGhhIDwgMSA/IGAgLyAke2NvbG9yLmFscGhhLnRvRml4ZWQoMil9YCA6ICcnO1xuICByZXR1cm4gYG9rbGNoKCR7bH0lICR7Y30gJHtofSR7YWxwaGF9KWA7XG59XG4iLCAiZXhwb3J0IGNvbnN0IERFRkFVTFRfQlJJREdFX1VSTCA9ICdodHRwOi8vbG9jYWxob3N0OjUxNzMnO1xuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgYnJpZGdlVXJsOiAnc2VtYW50aWNDb2xvcnMuYnJpZGdlVXJsJyxcbiAgbGFzdFNuYXBzaG90OiAnc2VtYW50aWNDb2xvcnMubGFzdFNuYXBzaG90J1xufSBhcyBjb25zdDtcblxuZXhwb3J0IGNvbnN0IE9WRVJSSURFX0FUVFIgPSAnZGF0YS1zZW1hbnRpYy1jb2xvcnMtb3ZlcnJpZGUnO1xuZXhwb3J0IGNvbnN0IEhJR0hMSUdIVF9BVFRSID0gJ2RhdGEtc2VtYW50aWMtY29sb3JzLWhpZ2hsaWdodCc7XG5leHBvcnQgY29uc3QgSU5TUEVDVE9SX09WRVJMQVlfSUQgPSAnc2VtYW50aWMtY29sb3JzLWluc3BlY3Rvci1vdmVybGF5JztcbmV4cG9ydCBjb25zdCBJTlNQRUNUT1JfU1RZTEVfSUQgPSAnc2VtYW50aWMtY29sb3JzLWluc3BlY3Rvci1zdHlsZSc7XG5leHBvcnQgY29uc3QgT1ZFUlJJREVfU1RZTEVfSUQgPSAnc2VtYW50aWMtY29sb3JzLW92ZXJyaWRlLXN0eWxlJztcbiIsICJpbXBvcnQgeyBhcGNhQ29udHJhc3QsIGFwY2FTZXZlcml0eSwgcGFyc2VDc3NDb2xvciB9IGZyb20gJy4vc2hhcmVkL2NvbG9yJztcbmltcG9ydCB7XG4gIEhJR0hMSUdIVF9BVFRSLFxuICBJTlNQRUNUT1JfT1ZFUkxBWV9JRCxcbiAgSU5TUEVDVE9SX1NUWUxFX0lELFxuICBPVkVSUklERV9TVFlMRV9JRFxufSBmcm9tICcuL3NoYXJlZC9jb25zdGFudHMnO1xuaW1wb3J0IHR5cGUgeyBDb250ZW50TWVzc2FnZUVudmVsb3BlIH0gZnJvbSAnLi9zaGFyZWQvbWVzc2FnaW5nJztcbmltcG9ydCB0eXBlIHtcbiAgQnJpZGdlU25hcHNob3QsXG4gIENvbnRlbnRUb1BhbmVsTWVzc2FnZSxcbiAgQ29udHJhc3RGaW5kaW5nLFxuICBDb250cmFzdFJlcG9ydCxcbiAgQ292ZXJhZ2VSZXBvcnQsXG4gIEhvdmVyRWxlbWVudFBheWxvYWQsXG4gIFBhbmVsVG9Db250ZW50TWVzc2FnZVxufSBmcm9tICcuL3NoYXJlZC90eXBlcyc7XG5cbi8qKlxuICogQ29udGVudCBicmlkZ2U6IHJ1bnMgaW4gZXZlcnkgaW5zcGVjdGVkIHBhZ2UuIFJlY2VpdmVzIGNvbW1hbmRzIGZyb20gdGhlXG4gKiBwYW5lbCAodmlhIGJhY2tncm91bmQgU1cpIGFuZCBwZXJmb3JtcyBET00gaW5zcGVjdGlvbiAvIG11dGF0aW9uIGluIHRoZVxuICogbGl2ZSBwcm9kdWN0IHBhZ2UuXG4gKi9cblxuY29uc3Qgc3RhdGUgPSB7XG4gIGhvdmVyQWN0aXZlOiBmYWxzZSxcbiAgaG92ZXJUYXJnZXQ6IG51bGwgYXMgSFRNTEVsZW1lbnQgfCBudWxsLFxuICBoaWdobGlnaHRlZFRva2VuOiBudWxsIGFzIHN0cmluZyB8IG51bGwsXG4gIHRva2VuQ29sb3JNYXA6IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCksIC8vIG5vcm1hbGl6ZWQgcmdiKGEpIFx1MjE5MiB0b2tlbklkXG4gIHRva2VuQ3NzQnlUb2tlbklkOiBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpLCAvLyB0b2tlbklkIFx1MjE5MiBgLS10aGVtZS1mb29gIGNzc1xuICBhbGlhc01hcDogbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKSwgLy8gYWxpYXMgbmFtZSAobm8gYC0tYCkgXHUyMTkyIHRva2VuSWRcbiAgb3ZlcnJpZGVzOiBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpIC8vIHRva2VuSWQgXHUyMTkyIGNzcyB2YWx1ZVxufTtcblxuZnVuY3Rpb24gc2VuZChtZXNzYWdlOiBDb250ZW50VG9QYW5lbE1lc3NhZ2UpOiB2b2lkIHtcbiAgY29uc3QgZW52ZWxvcGU6IENvbnRlbnRNZXNzYWdlRW52ZWxvcGUgPSB7IHNvdXJjZTogJ2NvbnRlbnQnLCBwYXlsb2FkOiBtZXNzYWdlIH07XG4gIHRyeSB7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoZW52ZWxvcGUpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBFeHRlbnNpb24gY29udGV4dCBpbnZhbGlkYXRlZCAoZS5nLiwgcmVsb2FkKS4gSWdub3JlLlxuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVJnYihpbnB1dDogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBwYXJzZWQgPSBwYXJzZUNzc0NvbG9yKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQpIHJldHVybiBudWxsO1xuICBpZiAocGFyc2VkLmFscGhhID49IDEpIHJldHVybiBgJHtwYXJzZWQucn0sJHtwYXJzZWQuZ30sJHtwYXJzZWQuYn1gO1xuICByZXR1cm4gYCR7cGFyc2VkLnJ9LCR7cGFyc2VkLmd9LCR7cGFyc2VkLmJ9LCR7cGFyc2VkLmFscGhhLnRvRml4ZWQoMyl9YDtcbn1cblxuZnVuY3Rpb24gdG9rZW5Gb3IoY3NzQ29sb3I6IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3Qga2V5ID0gbm9ybWFsaXplUmdiKGNzc0NvbG9yKTtcbiAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICByZXR1cm4gc3RhdGUudG9rZW5Db2xvck1hcC5nZXQoa2V5KSA/PyBudWxsO1xufVxuXG5mdW5jdGlvbiBlbGVtZW50U2VsZWN0b3IoZWw6IEVsZW1lbnQpOiBzdHJpbmcge1xuICBpZiAoZWwuaWQpIHJldHVybiBgIyR7Q1NTLmVzY2FwZShlbC5pZCl9YDtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBjdXJyZW50OiBFbGVtZW50IHwgbnVsbCA9IGVsO1xuICBsZXQgZGVwdGggPSAwO1xuICB3aGlsZSAoY3VycmVudCAmJiBjdXJyZW50ICE9PSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiYgZGVwdGggPCA0KSB7XG4gICAgY29uc3QgdGFnID0gY3VycmVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgY2xzID0gY3VycmVudC5jbGFzc0xpc3QubGVuZ3RoXG4gICAgICA/IGAuJHtbLi4uY3VycmVudC5jbGFzc0xpc3RdLm1hcCgoYykgPT4gQ1NTLmVzY2FwZShjKSkuam9pbignLicpfWBcbiAgICAgIDogJyc7XG4gICAgcGFydHMudW5zaGlmdChgJHt0YWd9JHtjbHN9YCk7XG4gICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50RWxlbWVudDtcbiAgICBkZXB0aCArPSAxO1xuICB9XG4gIHJldHVybiBwYXJ0cy5qb2luKCcgPiAnKTtcbn1cblxuZnVuY3Rpb24gZmluZE9wYXF1ZUJhY2tncm91bmQoZWw6IEVsZW1lbnQpOiB7IGVsOiBFbGVtZW50OyBjb2xvcjogc3RyaW5nIH0gfCBudWxsIHtcbiAgbGV0IGN1cnJlbnQ6IEVsZW1lbnQgfCBudWxsID0gZWw7XG4gIHdoaWxlIChjdXJyZW50ICYmIGN1cnJlbnQgIT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgIGNvbnN0IGNvbXB1dGVkID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoY3VycmVudCk7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VDc3NDb2xvcihjb21wdXRlZC5iYWNrZ3JvdW5kQ29sb3IpO1xuICAgIGlmIChwYXJzZWQgJiYgcGFyc2VkLmFscGhhID4gMC45NSkge1xuICAgICAgcmV0dXJuIHsgZWw6IGN1cnJlbnQsIGNvbG9yOiBjb21wdXRlZC5iYWNrZ3JvdW5kQ29sb3IgfTtcbiAgICB9XG4gICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50RWxlbWVudDtcbiAgfVxuICBjb25zdCByb290U3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuICBpZiAocm9vdFN0eWxlLmJhY2tncm91bmRDb2xvcikge1xuICAgIHJldHVybiB7IGVsOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGNvbG9yOiByb290U3R5bGUuYmFja2dyb3VuZENvbG9yIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIC0tLSBIb3ZlciBpbnNwZWN0b3IgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGVuc3VyZUluc3BlY3RvclN0eWxlKCk6IHZvaWQge1xuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoSU5TUEVDVE9SX1NUWUxFX0lEKSkgcmV0dXJuO1xuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gIHN0eWxlLmlkID0gSU5TUEVDVE9SX1NUWUxFX0lEO1xuICBzdHlsZS50ZXh0Q29udGVudCA9IGBcbiAgICAjJHtJTlNQRUNUT1JfT1ZFUkxBWV9JRH0ge1xuICAgICAgcG9zaXRpb246IGZpeGVkO1xuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgICB6LWluZGV4OiAyMTQ3NDgzNjQwO1xuICAgICAgYm9yZGVyOiAycHggc29saWQgIzdjOWVmZjtcbiAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCByZ2JhKDAsIDAsIDAsIDAuMzUpLCAwIDZweCAxNHB4IHJnYmEoMCwgMCwgMCwgMC4yNSk7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDEyNCwgMTU4LCAyNTUsIDAuMTIpO1xuICAgICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICAgICAgdHJhbnNpdGlvbjogYWxsIDYwbXMgZWFzZS1vdXQ7XG4gICAgfVxuICAgIFske0hJR0hMSUdIVF9BVFRSfV0ge1xuICAgICAgb3V0bGluZTogMnB4IGRhc2hlZCAjZmY3YWI2ICFpbXBvcnRhbnQ7XG4gICAgICBvdXRsaW5lLW9mZnNldDogMXB4ICFpbXBvcnRhbnQ7XG4gICAgfVxuICBgO1xuICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVJbnNwZWN0b3JPdmVybGF5KCk6IEhUTUxFbGVtZW50IHtcbiAgbGV0IG92ZXJsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJTlNQRUNUT1JfT1ZFUkxBWV9JRCk7XG4gIGlmICghb3ZlcmxheSkge1xuICAgIG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdmVybGF5LmlkID0gSU5TUEVDVE9SX09WRVJMQVlfSUQ7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICB9XG4gIHJldHVybiBvdmVybGF5IGFzIEhUTUxFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBjbGVhckluc3BlY3Rvck92ZXJsYXkoKTogdm9pZCB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOU1BFQ1RPUl9PVkVSTEFZX0lEKT8ucmVtb3ZlKCk7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkSG92ZXJQYXlsb2FkKGVsOiBIVE1MRWxlbWVudCk6IEhvdmVyRWxlbWVudFBheWxvYWQge1xuICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgY29uc3QgYmcgPSBmaW5kT3BhcXVlQmFja2dyb3VuZChlbCk7XG4gIGNvbnN0IGZnID0gY29tcHV0ZWQuY29sb3I7XG5cbiAgY29uc3QgZmdUb2tlbiA9IHRva2VuRm9yKGZnKTtcbiAgY29uc3QgYmdUb2tlbiA9IGJnID8gdG9rZW5Gb3IoYmcuY29sb3IpIDogbnVsbDtcbiAgY29uc3QgbWF0Y2hlZFRva2VuID0gZmdUb2tlbiA/PyBiZ1Rva2VuO1xuICBjb25zdCBtYXRjaGVkQ2hhbm5lbCA9IGZnVG9rZW4gPyAnY29sb3InIDogYmdUb2tlbiA/ICdiYWNrZ3JvdW5kJyA6IG51bGw7XG5cbiAgbGV0IGNvbnRyYXN0TGM6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBjb25zdCBmZ1BhcnNlZCA9IHBhcnNlQ3NzQ29sb3IoZmcpO1xuICBjb25zdCBiZ1BhcnNlZCA9IGJnID8gcGFyc2VDc3NDb2xvcihiZy5jb2xvcikgOiBudWxsO1xuICBpZiAoZmdQYXJzZWQgJiYgYmdQYXJzZWQpIHtcbiAgICBjb250cmFzdExjID0gTWF0aC5yb3VuZChhcGNhQ29udHJhc3QoZmdQYXJzZWQsIGJnUGFyc2VkKSAqIDEwKSAvIDEwO1xuICB9XG5cbiAgY29uc3QgYWxpYXNDaGFpbjogc3RyaW5nW10gPSBbXTtcbiAgaWYgKG1hdGNoZWRUb2tlbikge1xuICAgIGZvciAoY29uc3QgW2FsaWFzLCB0b2tlbklkXSBvZiBzdGF0ZS5hbGlhc01hcCkge1xuICAgICAgaWYgKHRva2VuSWQgPT09IG1hdGNoZWRUb2tlbikgYWxpYXNDaGFpbi5wdXNoKGAtLSR7YWxpYXN9YCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gIHJldHVybiB7XG4gICAgc2VsZWN0b3I6IGVsZW1lbnRTZWxlY3RvcihlbCksXG4gICAgdGFnTmFtZTogZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgIGNsYXNzZXM6IFsuLi5lbC5jbGFzc0xpc3RdLFxuICAgIHJvbGU6IGVsLmdldEF0dHJpYnV0ZSgncm9sZScpLFxuICAgIGNvbXB1dGVkQ29sb3I6IGZnLFxuICAgIGNvbXB1dGVkQmFja2dyb3VuZDogYmc/LmNvbG9yID8/IG51bGwsXG4gICAgbWF0Y2hlZFRva2VuLFxuICAgIG1hdGNoZWRUb2tlbkNoYW5uZWw6IG1hdGNoZWRDaGFubmVsLFxuICAgIGFsaWFzQ2hhaW4sXG4gICAgY29udHJhc3RMYyxcbiAgICByZWN0OiB7IHg6IHJlY3QueCwgeTogcmVjdC55LCB3aWR0aDogcmVjdC53aWR0aCwgaGVpZ2h0OiByZWN0LmhlaWdodCB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUhvdmVyTW92ZShldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICBpZiAoIXN0YXRlLmhvdmVyQWN0aXZlKSByZXR1cm47XG4gIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldDtcbiAgaWYgKCEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKSByZXR1cm47XG4gIGlmICh0YXJnZXQuaWQgPT09IElOU1BFQ1RPUl9PVkVSTEFZX0lEKSByZXR1cm47XG4gIHN0YXRlLmhvdmVyVGFyZ2V0ID0gdGFyZ2V0O1xuXG4gIGNvbnN0IG92ZXJsYXkgPSBlbnN1cmVJbnNwZWN0b3JPdmVybGF5KCk7XG4gIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIG92ZXJsYXkuc3R5bGUubGVmdCA9IGAke3JlY3QubGVmdH1weGA7XG4gIG92ZXJsYXkuc3R5bGUudG9wID0gYCR7cmVjdC50b3B9cHhgO1xuICBvdmVybGF5LnN0eWxlLndpZHRoID0gYCR7cmVjdC53aWR0aH1weGA7XG4gIG92ZXJsYXkuc3R5bGUuaGVpZ2h0ID0gYCR7cmVjdC5oZWlnaHR9cHhgO1xuXG4gIHNlbmQoeyBraW5kOiAnaG92ZXItZWxlbWVudCcsIHBheWxvYWQ6IGJ1aWxkSG92ZXJQYXlsb2FkKHRhcmdldCkgfSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUhvdmVyTGVhdmUoKTogdm9pZCB7XG4gIGlmICghc3RhdGUuaG92ZXJBY3RpdmUpIHJldHVybjtcbiAgc3RhdGUuaG92ZXJUYXJnZXQgPSBudWxsO1xuICBjbGVhckluc3BlY3Rvck92ZXJsYXkoKTtcbiAgc2VuZCh7IGtpbmQ6ICdob3Zlci1jbGVhcmVkJyB9KTtcbn1cblxuZnVuY3Rpb24gc2V0SG92ZXJBY3RpdmUoZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICBzdGF0ZS5ob3ZlckFjdGl2ZSA9IGVuYWJsZWQ7XG4gIGlmIChlbmFibGVkKSB7XG4gICAgZW5zdXJlSW5zcGVjdG9yU3R5bGUoKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBoYW5kbGVIb3Zlck1vdmUsIHRydWUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBoYW5kbGVIb3ZlckxlYXZlLCB0cnVlKTtcbiAgfSBlbHNlIHtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBoYW5kbGVIb3Zlck1vdmUsIHRydWUpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBoYW5kbGVIb3ZlckxlYXZlLCB0cnVlKTtcbiAgICBjbGVhckluc3BlY3Rvck92ZXJsYXkoKTtcbiAgfVxufVxuXG4vLyAtLS0gSGlnaGxpZ2h0IGJ5IHRva2VuIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBjbGVhckhpZ2hsaWdodHMoKTogdm9pZCB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYFske0hJR0hMSUdIVF9BVFRSfV1gKS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoSElHSExJR0hUX0FUVFIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaGlnaGxpZ2h0VG9rZW4odG9rZW5JZDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICBjbGVhckhpZ2hsaWdodHMoKTtcbiAgc3RhdGUuaGlnaGxpZ2h0ZWRUb2tlbiA9IHRva2VuSWQ7XG4gIGlmICghdG9rZW5JZCkgcmV0dXJuO1xuICBlbnN1cmVJbnNwZWN0b3JTdHlsZSgpO1xuXG4gIGNvbnN0IGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ2JvZHkgKicpO1xuICBlbGVtZW50cy5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGNvbnN0IGNvbXB1dGVkID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgIGlmIChcbiAgICAgIHRva2VuRm9yKGNvbXB1dGVkLmNvbG9yKSA9PT0gdG9rZW5JZCB8fFxuICAgICAgdG9rZW5Gb3IoY29tcHV0ZWQuYmFja2dyb3VuZENvbG9yKSA9PT0gdG9rZW5JZCB8fFxuICAgICAgdG9rZW5Gb3IoY29tcHV0ZWQuYm9yZGVyVG9wQ29sb3IpID09PSB0b2tlbklkXG4gICAgKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoSElHSExJR0hUX0FUVFIsICcxJyk7XG4gICAgfVxuICB9KTtcbn1cblxuLy8gLS0tIFRoZW1lIG1vZGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIHNldFRoZW1lTW9kZShtb2RlOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gIGlmIChtb2RlID09PSBudWxsKSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS10aGVtZScpO1xuICAgIHJldHVybjtcbiAgfVxuICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC50aGVtZSA9IG1vZGU7XG59XG5cbi8vIC0tLSBPdmVycmlkZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGVuc3VyZU92ZXJyaWRlU3R5bGUoKTogSFRNTFN0eWxlRWxlbWVudCB7XG4gIGxldCBzdHlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKE9WRVJSSURFX1NUWUxFX0lEKSBhcyBIVE1MU3R5bGVFbGVtZW50IHwgbnVsbDtcbiAgaWYgKCFzdHlsZSkge1xuICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS5pZCA9IE9WRVJSSURFX1NUWUxFX0lEO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChzdHlsZSk7XG4gIH1cbiAgcmV0dXJuIHN0eWxlO1xufVxuXG5mdW5jdGlvbiBmbHVzaE92ZXJyaWRlU3R5bGUoKTogdm9pZCB7XG4gIGNvbnN0IHN0eWxlID0gZW5zdXJlT3ZlcnJpZGVTdHlsZSgpO1xuICBpZiAoc3RhdGUub3ZlcnJpZGVzLnNpemUgPT09IDApIHtcbiAgICBzdHlsZS50ZXh0Q29udGVudCA9ICcnO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBkZWNsYXJhdGlvbnMgPSBbLi4uc3RhdGUub3ZlcnJpZGVzXVxuICAgIC5tYXAoXG4gICAgICAoW3Rva2VuSWQsIGNzc10pID0+XG4gICAgICAgIGAgIC0tdGhlbWUtJHt0b2tlbklkfTogJHtjc3N9ICFpbXBvcnRhbnQ7XFxuICAtLWNvbG9yLSR7dG9rZW5JZH06ICR7Y3NzfSAhaW1wb3J0YW50O2BcbiAgICApXG4gICAgLmpvaW4oJ1xcbicpO1xuICBzdHlsZS50ZXh0Q29udGVudCA9IGA6cm9vdCwgOnJvb3RbZGF0YS10aGVtZV0ge1xcbiR7ZGVjbGFyYXRpb25zfVxcbn1gO1xufVxuXG5mdW5jdGlvbiBzZXRPdmVycmlkZSh0b2tlbklkOiBzdHJpbmcsIGNzczogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICBpZiAoY3NzID09PSBudWxsKSB7XG4gICAgc3RhdGUub3ZlcnJpZGVzLmRlbGV0ZSh0b2tlbklkKTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5vdmVycmlkZXMuc2V0KHRva2VuSWQsIGNzcyk7XG4gIH1cbiAgZmx1c2hPdmVycmlkZVN0eWxlKCk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyQWxsT3ZlcnJpZGVzKCk6IHZvaWQge1xuICBzdGF0ZS5vdmVycmlkZXMuY2xlYXIoKTtcbiAgZmx1c2hPdmVycmlkZVN0eWxlKCk7XG59XG5cbi8vIC0tLSBTbmFwc2hvdCB1cGRhdGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGFwcGx5U25hcHNob3Qoc25hcHNob3Q6IEJyaWRnZVNuYXBzaG90KTogdm9pZCB7XG4gIHN0YXRlLnRva2VuQ29sb3JNYXAuY2xlYXIoKTtcbiAgc3RhdGUudG9rZW5Dc3NCeVRva2VuSWQuY2xlYXIoKTtcbiAgc3RhdGUuYWxpYXNNYXAuY2xlYXIoKTtcblxuICBjb25zdCByb290U3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuICBjb25zdCBhY3RpdmVNb2RlID0gKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LnRoZW1lID8/ICdsaWdodCcpIGFzXG4gICAgfCAnbGlnaHQnXG4gICAgfCAnZGFyaydcbiAgICB8ICdhbHQnO1xuXG4gIGNvbnN0IHJlc29sdmVkID0gc25hcHNob3QucmVzb2x2ZWRbYWN0aXZlTW9kZV0gPz8gc25hcHNob3QucmVzb2x2ZWQubGlnaHQ7XG4gIGZvciAoY29uc3QgW3Rva2VuSWQsIHJlc29sdmVkQ29sb3JdIG9mIE9iamVjdC5lbnRyaWVzKHJlc29sdmVkLmNvbG9ycykpIHtcbiAgICBzdGF0ZS50b2tlbkNzc0J5VG9rZW5JZC5zZXQodG9rZW5JZCwgcmVzb2x2ZWRDb2xvci5jc3MpO1xuICAgIC8vIEluZGV4IGJ5IHRoZSBicm93c2VyJ3Mgbm9ybWFsaXplZCByZ2IgZm9ybS5cbiAgICBjb25zdCBrZXkgPSBub3JtYWxpemVSZ2IocmVzb2x2ZWRDb2xvci5jc3MpO1xuICAgIGlmIChrZXkpIHN0YXRlLnRva2VuQ29sb3JNYXAuc2V0KGtleSwgdG9rZW5JZCk7XG5cbiAgICAvLyBBbHNvIGluZGV4IGJ5IHRoZSBhY3R1YWwgY29tcHV0ZWQgdmFyIHZhbHVlLCBpbiBjYXNlIHRoZSBwYWdlIHJlc29sdmVzXG4gICAgLy8gdG9rZW5zIHdpdGggc2xpZ2h0IGdhbXV0IGRpZmZlcmVuY2VzIGZyb20gb3VyIGVuZ2luZSBvdXRwdXQuXG4gICAgY29uc3QgbGl2ZSA9IHJvb3RTdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGAtLXRoZW1lLSR7dG9rZW5JZH1gKTtcbiAgICBjb25zdCBsaXZlS2V5ID0gbm9ybWFsaXplUmdiKGxpdmUpO1xuICAgIGlmIChsaXZlS2V5KSBzdGF0ZS50b2tlbkNvbG9yTWFwLnNldChsaXZlS2V5LCB0b2tlbklkKTtcblxuICAgIGNvbnN0IGNvbG9yTGl2ZSA9IHJvb3RTdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGAtLWNvbG9yLSR7dG9rZW5JZH1gKTtcbiAgICBjb25zdCBjb2xvckxpdmVLZXkgPSBub3JtYWxpemVSZ2IoY29sb3JMaXZlKTtcbiAgICBpZiAoY29sb3JMaXZlS2V5KSBzdGF0ZS50b2tlbkNvbG9yTWFwLnNldChjb2xvckxpdmVLZXksIHRva2VuSWQpO1xuICB9XG5cbiAgZm9yIChjb25zdCBhbGlhcyBvZiBzbmFwc2hvdC5tYW5pZmVzdC5hbGlhc2VzKSB7XG4gICAgc3RhdGUuYWxpYXNNYXAuc2V0KGFsaWFzLm5hbWUucmVwbGFjZSgvXi0tLywgJycpLCBhbGlhcy50b2tlbklkKTtcbiAgICBjb25zdCBhbGlhc1ZhbHVlID0gcm9vdFN0eWxlLmdldFByb3BlcnR5VmFsdWUoYC0tJHthbGlhcy5uYW1lLnJlcGxhY2UoL14tLS8sICcnKX1gKTtcbiAgICBjb25zdCBhbGlhc0tleSA9IG5vcm1hbGl6ZVJnYihhbGlhc1ZhbHVlKTtcbiAgICBpZiAoYWxpYXNLZXkpIHN0YXRlLnRva2VuQ29sb3JNYXAuc2V0KGFsaWFzS2V5LCBhbGlhcy50b2tlbklkKTtcbiAgfVxufVxuXG4vLyAtLS0gQ292ZXJhZ2Ugc2NhbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiByb290Q3VzdG9tUHJvcGVydGllcygpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGNvbnN0IHJvb3RTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vdFN0eWxlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbmFtZSA9IHJvb3RTdHlsZS5pdGVtKGkpO1xuICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcm9vdFN0eWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSkudHJpbSgpO1xuICAgICAgaWYgKHZhbHVlKSByZXN1bHRbbmFtZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gc2NhbkNvdmVyYWdlKCk6IENvdmVyYWdlUmVwb3J0IHtcbiAgY29uc3QgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignYm9keSAqJyk7XG4gIGNvbnN0IGJ5VG9rZW46IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgY29uc3QgdmlvbGF0aW9uczogQ292ZXJhZ2VSZXBvcnRbJ3Jhd0NvbG9yVmlvbGF0aW9ucyddID0gW107XG4gIGNvbnN0IHRva2VuSWRzID0gWy4uLnN0YXRlLnRva2VuQ3NzQnlUb2tlbklkLmtleXMoKV07XG5cbiAgZm9yIChjb25zdCB0b2tlbklkIG9mIHRva2VuSWRzKSBieVRva2VuW3Rva2VuSWRdID0gMDtcblxuICBjb25zdCByYXdDb2xvckxpbWl0ID0gMzA7XG5cbiAgZWxlbWVudHMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCBwcm9wZXJ0aWVzOiBBcnJheTxbQ292ZXJhZ2VSZXBvcnRbJ3Jhd0NvbG9yVmlvbGF0aW9ucyddW251bWJlcl1bJ3Byb3BlcnR5J10sIHN0cmluZ10+ID0gW1xuICAgICAgWydjb2xvcicsIGNvbXB1dGVkLmNvbG9yXSxcbiAgICAgIFsnYmFja2dyb3VuZC1jb2xvcicsIGNvbXB1dGVkLmJhY2tncm91bmRDb2xvcl0sXG4gICAgICBbJ2JvcmRlci1jb2xvcicsIGNvbXB1dGVkLmJvcmRlclRvcENvbG9yXVxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IFtwcm9wLCB2YWx1ZV0gb2YgcHJvcGVydGllcykge1xuICAgICAgY29uc3QgdG9rZW5JZCA9IHRva2VuRm9yKHZhbHVlKTtcbiAgICAgIGlmICh0b2tlbklkKSB7XG4gICAgICAgIGJ5VG9rZW5bdG9rZW5JZF0gPSAoYnlUb2tlblt0b2tlbklkXSA/PyAwKSArIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUNzc0NvbG9yKHZhbHVlKTtcbiAgICAgICAgaWYgKHBhcnNlZCAmJiBwYXJzZWQuYWxwaGEgPiAwICYmIHZpb2xhdGlvbnMubGVuZ3RoIDwgcmF3Q29sb3JMaW1pdCkge1xuICAgICAgICAgIC8vIEZpbHRlciBvdXQgXCJkZWZhdWx0XCIgY29sb3JzIHRvIGF2b2lkIG5vaXNlLlxuICAgICAgICAgIGlmICghKHBhcnNlZC5yID09PSAwICYmIHBhcnNlZC5nID09PSAwICYmIHBhcnNlZC5iID09PSAwICYmIHByb3AgIT09ICdjb2xvcicpKSB7XG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goeyBzZWxlY3RvcjogZWxlbWVudFNlbGVjdG9yKGVsKSwgcHJvcGVydHk6IHByb3AsIHZhbHVlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgdW51c2VkVG9rZW5zID0gdG9rZW5JZHMuZmlsdGVyKChpZCkgPT4gKGJ5VG9rZW5baWRdID8/IDApID09PSAwKTtcblxuICByZXR1cm4ge1xuICAgIHRvdGFsRWxlbWVudHM6IGVsZW1lbnRzLmxlbmd0aCxcbiAgICBieVRva2VuLFxuICAgIHVudXNlZFRva2VucyxcbiAgICByYXdDb2xvclZpb2xhdGlvbnM6IHZpb2xhdGlvbnMsXG4gICAgcm9vdFZhcmlhYmxlczogcm9vdEN1c3RvbVByb3BlcnRpZXMoKVxuICB9O1xufVxuXG4vLyAtLS0gQ29udHJhc3QgYXVkaXQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBoYXNEaXJlY3RUZXh0KGVsOiBFbGVtZW50KTogYm9vbGVhbiB7XG4gIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGROb2Rlcykge1xuICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgKGNoaWxkLm5vZGVWYWx1ZSA/PyAnJykudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNjYW5Db250cmFzdCgpOiBDb250cmFzdFJlcG9ydCB7XG4gIGNvbnN0IGZpbmRpbmdzOiBDb250cmFzdEZpbmRpbmdbXSA9IFtdO1xuICBjb25zdCBjYW5kaWRhdGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ2JvZHkgKicpO1xuICBsZXQgc2FtcGxlZCA9IDA7XG4gIGNvbnN0IGxpbWl0ID0gMTUwMDtcblxuICBjYW5kaWRhdGVzLmZvckVhY2goKGVsKSA9PiB7XG4gICAgaWYgKHNhbXBsZWQgPiBsaW1pdCkgcmV0dXJuO1xuICAgIGlmICghaGFzRGlyZWN0VGV4dChlbCkpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKHJlY3Qud2lkdGggKiByZWN0LmhlaWdodCA8IDQpIHJldHVybjtcbiAgICBzYW1wbGVkICs9IDE7XG5cbiAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCBmZ1ZhbHVlID0gY29tcHV0ZWQuY29sb3I7XG4gICAgY29uc3QgYmcgPSBmaW5kT3BhcXVlQmFja2dyb3VuZChlbCk7XG4gICAgaWYgKCFiZykgcmV0dXJuO1xuICAgIGNvbnN0IGZnID0gcGFyc2VDc3NDb2xvcihmZ1ZhbHVlKTtcbiAgICBjb25zdCBiZ1BhcnNlZCA9IHBhcnNlQ3NzQ29sb3IoYmcuY29sb3IpO1xuICAgIGlmICghZmcgfHwgIWJnUGFyc2VkKSByZXR1cm47XG5cbiAgICBjb25zdCBsYyA9IGFwY2FDb250cmFzdChmZywgYmdQYXJzZWQpO1xuICAgIGNvbnN0IHNldmVyaXR5ID0gYXBjYVNldmVyaXR5KGxjKTtcbiAgICBpZiAoc2V2ZXJpdHkgPT09ICdvaycpIHJldHVybjtcblxuICAgIGZpbmRpbmdzLnB1c2goe1xuICAgICAgc2VsZWN0b3I6IGVsZW1lbnRTZWxlY3RvcihlbCksXG4gICAgICBmb3JlZ3JvdW5kOiBmZ1ZhbHVlLFxuICAgICAgYmFja2dyb3VuZDogYmcuY29sb3IsXG4gICAgICBmb3JlZ3JvdW5kVG9rZW46IHRva2VuRm9yKGZnVmFsdWUpLFxuICAgICAgYmFja2dyb3VuZFRva2VuOiB0b2tlbkZvcihiZy5jb2xvciksXG4gICAgICBjb250cmFzdExjOiBNYXRoLnJvdW5kKGxjICogMTApIC8gMTAsXG4gICAgICBzZXZlcml0eSxcbiAgICAgIGNvbnRleHQ6IChlbC50ZXh0Q29udGVudCA/PyAnJykudHJpbSgpLnNsaWNlKDAsIDgwKVxuICAgIH0pO1xuICB9KTtcblxuICBmaW5kaW5ncy5zb3J0KChhLCBiKSA9PiBNYXRoLmFicyhhLmNvbnRyYXN0TGMpIC0gTWF0aC5hYnMoYi5jb250cmFzdExjKSk7XG5cbiAgcmV0dXJuIHsgc2FtcGxlZCwgZmluZGluZ3M6IGZpbmRpbmdzLnNsaWNlKDAsIDgwKSB9O1xufVxuXG4vLyAtLS0gTWVzc2FnZSBkaXNwYXRjaCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBoYW5kbGVQYW5lbE1lc3NhZ2UobWVzc2FnZTogUGFuZWxUb0NvbnRlbnRNZXNzYWdlKTogdm9pZCB7XG4gIHN3aXRjaCAobWVzc2FnZS5raW5kKSB7XG4gICAgY2FzZSAncGluZyc6XG4gICAgICBzZW5kKHtcbiAgICAgICAga2luZDogJ3BhZ2UtaW5mbycsXG4gICAgICAgIHVybDogbG9jYXRpb24uaHJlZixcbiAgICAgICAgdGl0bGU6IGRvY3VtZW50LnRpdGxlLFxuICAgICAgICB0aGVtZTogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQudGhlbWUgPz8gbnVsbFxuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwYWdlLWluZm8nOlxuICAgICAgc2VuZCh7XG4gICAgICAgIGtpbmQ6ICdwYWdlLWluZm8nLFxuICAgICAgICB1cmw6IGxvY2F0aW9uLmhyZWYsXG4gICAgICAgIHRpdGxlOiBkb2N1bWVudC50aXRsZSxcbiAgICAgICAgdGhlbWU6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LnRoZW1lID8/IG51bGxcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnaG92ZXItaW5zcGVjdG9yJzpcbiAgICAgIHNldEhvdmVyQWN0aXZlKG1lc3NhZ2UuZW5hYmxlZCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdoaWdobGlnaHQtdG9rZW4nOlxuICAgICAgaGlnaGxpZ2h0VG9rZW4obWVzc2FnZS50b2tlbklkKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NldC10aGVtZSc6XG4gICAgICBzZXRUaGVtZU1vZGUobWVzc2FnZS5tb2RlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ292ZXJyaWRlLXRva2VuJzpcbiAgICAgIHNldE92ZXJyaWRlKG1lc3NhZ2UudG9rZW5JZCwgbWVzc2FnZS5jc3MpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2xlYXItYWxsLW92ZXJyaWRlcyc6XG4gICAgICBjbGVhckFsbE92ZXJyaWRlcygpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndXBkYXRlLXNuYXBzaG90JzpcbiAgICAgIGFwcGx5U25hcHNob3QobWVzc2FnZS5zbmFwc2hvdCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdzY2FuLWNvdmVyYWdlJzpcbiAgICAgIHNlbmQoeyBraW5kOiAnY292ZXJhZ2UtcmVwb3J0JywgcmVwb3J0OiBzY2FuQ292ZXJhZ2UoKSB9KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NjYW4tY29udHJhc3QnOlxuICAgICAgc2VuZCh7IGtpbmQ6ICdjb250cmFzdC1yZXBvcnQnLCByZXBvcnQ6IHNjYW5Db250cmFzdCgpIH0pO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgX3NlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIHRyeSB7XG4gICAgaGFuZGxlUGFuZWxNZXNzYWdlKG1lc3NhZ2UgYXMgUGFuZWxUb0NvbnRlbnRNZXNzYWdlKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogdHJ1ZSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBzZW5kKHtcbiAgICAgIGtpbmQ6ICdlcnJvcicsXG4gICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdDb250ZW50IHNjcmlwdCBlcnJvcidcbiAgICB9KTtcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogZmFsc2UgfSk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59KTtcblxuc2VuZCh7IGtpbmQ6ICdoZWxsbycsIHVybDogbG9jYXRpb24uaHJlZiwgdGl0bGU6IGRvY3VtZW50LnRpdGxlIH0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7O0FBeUVBLE1BQUksZUFBZ0Q7QUFFcEQsV0FBUyxrQkFBbUQ7QUFDMUQsUUFBSSxhQUFjLFFBQU87QUFDekIsUUFBSSxPQUFPLGFBQWEsWUFBYSxRQUFPO0FBQzVDLFFBQUk7QUFDRixZQUFNLFNBQVMsU0FBUyxjQUFjLFFBQVE7QUFDOUMsYUFBTyxRQUFRO0FBQ2YsYUFBTyxTQUFTO0FBQ2hCLHFCQUFlLE9BQU8sV0FBVyxNQUFNLEVBQUUsb0JBQW9CLEtBQUssQ0FBQztBQUNuRSxhQUFPO0FBQUEsSUFDVCxRQUFRO0FBQ04sYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBU08sV0FBUyxjQUFjLE9BQXNEO0FBQ2xGLFFBQUksQ0FBQyxNQUFPLFFBQU87QUFDbkIsVUFBTSxPQUFPLE1BQU0sS0FBSztBQUN4QixRQUFJLENBQUMsUUFBUSxTQUFTLFVBQVUsU0FBUyxjQUFlLFFBQU87QUFFL0QsVUFBTSxNQUFNLGdCQUFnQjtBQUM1QixRQUFJLENBQUMsSUFBSyxRQUFPO0FBRWpCLFFBQUksVUFBVSxHQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ3hCLFFBQUk7QUFDRixVQUFJLFlBQVk7QUFDaEIsVUFBSSxZQUFZO0FBQUEsSUFDbEIsUUFBUTtBQUNOLGFBQU87QUFBQSxJQUNUO0FBRUEsUUFBSSxTQUFTLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDdkIsVUFBTSxPQUFPLElBQUksYUFBYSxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUU7QUFDMUMsVUFBTSxRQUFRLEtBQUssQ0FBQyxJQUFJO0FBQ3hCLFFBQUksVUFBVSxFQUFHLFFBQU87QUFDeEIsV0FBTyxFQUFFLEdBQUcsS0FBSyxD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
