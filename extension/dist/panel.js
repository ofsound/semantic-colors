"use strict";
(() => {
  // extension/src/shared/bridge-client.ts
  var BridgeClient = class {
    constructor(options) {
      this.options = options;
    }
    options;
    source = null;
    retryTimer = null;
    retryDelay = 1e3;
    stopped = false;
    start() {
      this.stopped = false;
      this.connect();
    }
    stop() {
      this.stopped = true;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      if (this.source) {
        this.source.close();
        this.source = null;
      }
    }
    async fetchSnapshot() {
      const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/snapshot`, {
        method: "GET",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Snapshot request failed with status ${response.status}`);
      }
      return await response.json();
    }
    async pushOverride(tokenId, mode, color, options = {}) {
      const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenId, mode, color, persist: options.persist ?? false })
      });
      if (!response.ok) {
        throw new Error(`Override failed with status ${response.status}`);
      }
    }
    connect() {
      if (this.stopped) return;
      this.options.onStatus("connecting");
      const url = `${this.options.getBaseUrl()}/api/bridge/events`;
      try {
        this.source = new EventSource(url);
      } catch (error) {
        this.options.onStatus("error", error instanceof Error ? error.message : "Unable to connect");
        this.scheduleReconnect();
        return;
      }
      this.source.addEventListener("hello", (event) => {
        this.retryDelay = 1e3;
        this.options.onStatus("connected");
        this.handleSnapshotEvent(event);
      });
      this.source.addEventListener("snapshot", (event) => {
        this.handleSnapshotEvent(event);
      });
      this.source.addEventListener("ping", () => {
      });
      this.source.onerror = () => {
        this.options.onStatus("error", "Stream disconnected");
        this.source?.close();
        this.source = null;
        this.scheduleReconnect();
      };
    }
    handleSnapshotEvent(event) {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.snapshot) {
          this.options.onSnapshot(parsed.snapshot);
        }
      } catch {
      }
    }
    scheduleReconnect() {
      if (this.stopped) return;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.retryDelay = Math.min(this.retryDelay * 2, 15e3);
        this.connect();
      }, this.retryDelay);
    }
  };

  // extension/src/shared/constants.ts
  var DEFAULT_BRIDGE_URL = "http://localhost:5173";
  var STORAGE_KEYS = {
    bridgeUrl: "semanticColors.bridgeUrl",
    lastSnapshot: "semanticColors.lastSnapshot"
  };

  // extension/src/shared/color.ts
  function linearToSrgb(value) {
    const v = value <= 31308e-7 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  function oklabToLinearSrgb(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }
  function oklchToRgb(color) {
    const hueRad = color.h * Math.PI / 180;
    const a = color.c * Math.cos(hueRad);
    const b = color.c * Math.sin(hueRad);
    const [lr, lg, lb] = oklabToLinearSrgb(color.l, a, b);
    return {
      r: linearToSrgb(lr),
      g: linearToSrgb(lg),
      b: linearToSrgb(lb),
      alpha: color.alpha ?? 1
    };
  }
  function oklchToCss(color) {
    const { r, g, b, alpha } = oklchToRgb(color);
    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }
  function formatOklch(color) {
    const l = (color.l * 100).toFixed(2);
    const c = color.c.toFixed(4);
    const h = color.h.toFixed(2);
    const alpha = color.alpha !== void 0 && color.alpha < 1 ? ` / ${color.alpha.toFixed(2)}` : "";
    return `oklch(${l}% ${c} ${h}${alpha})`;
  }

  // extension/src/shared/messaging.ts
  function panelPortName(tabId2) {
    return `panel:${tabId2}`;
  }

  // extension/src/panel.ts
  var tabId = chrome.devtools.inspectedWindow.tabId;
  var state = {
    bridgeUrl: DEFAULT_BRIDGE_URL,
    snapshot: null,
    coverage: null,
    highlightedToken: null,
    overrideTokenId: "",
    overrideColor: { l: 0.5, c: 0.1, h: 240, alpha: 1 },
    overrideMode: "both",
    persistOverride: false,
    activeMode: null,
    tokenFilter: "",
    hoverActive: false,
    pageInfo: { url: "", title: "", theme: null }
  };
  var el = {
    status: document.getElementById("bridge-status"),
    bridgeInput: document.getElementById("bridge-url"),
    bridgeBtn: document.getElementById("bridge-connect"),
    modeSwitch: document.querySelector(".mode-switch"),
    tabs: document.querySelectorAll(".tabs button"),
    tabPanels: document.querySelectorAll("[data-tab-panel]"),
    hoverToggle: document.getElementById("hover-toggle"),
    hoverDetails: document.getElementById("hover-details"),
    pageInfo: document.getElementById("page-info"),
    tokenFilter: document.getElementById("token-filter"),
    tokenList: document.getElementById("token-list"),
    clearHighlight: document.getElementById("clear-highlight"),
    scanCoverage: document.getElementById("scan-coverage"),
    coverageSummary: document.getElementById("coverage-summary"),
    coverageOutput: document.getElementById("coverage-output"),
    scanContrast: document.getElementById("scan-contrast"),
    contrastSummary: document.getElementById("contrast-summary"),
    contrastOutput: document.getElementById("contrast-output"),
    overrideToken: document.getElementById("override-token"),
    overrideSliders: document.getElementById("override-sliders"),
    overrideMode: document.getElementById("override-mode"),
    overridePersist: document.getElementById("override-persist"),
    clearOverrides: document.getElementById("clear-overrides"),
    pushOverride: document.getElementById("push-override")
  };
  var port = chrome.runtime.connect({ name: panelPortName(tabId) });
  function sendToContent(payload) {
    const envelope = { source: "panel", tabId, payload };
    port.postMessage(envelope);
  }
  port.onMessage.addListener((message) => {
    const envelope = message;
    if (envelope?.source !== "content") return;
    handleContentMessage(envelope.payload);
  });
  function handleContentMessage(message) {
    switch (message.kind) {
      case "hello":
      case "page-info":
        state.pageInfo = {
          url: message.url,
          title: message.title,
          theme: "theme" in message ? message.theme : null
        };
        renderPageInfo();
        pushSnapshotToContent();
        break;
      case "hover-element":
        renderHoverDetails(message.payload);
        break;
      case "hover-cleared":
        renderHoverDetails(null);
        break;
      case "coverage-report":
        state.coverage = message.report;
        renderCoverage();
        renderTokenList();
        break;
      case "contrast-report":
        renderContrast(message.report);
        break;
      case "error":
        console.warn("[semantic-colors] content error:", message.message);
        break;
    }
  }
  var bridge = new BridgeClient({
    getBaseUrl: () => state.bridgeUrl,
    onStatus: setConnectionStatus,
    onSnapshot: (snapshot) => {
      state.snapshot = snapshot;
      renderAll();
      pushSnapshotToContent();
    }
  });
  function setConnectionStatus(status, detail) {
    el.status.className = `status status-${status}`;
    el.status.textContent = detail ? `${status} \xB7 ${detail}` : status;
  }
  async function loadBridgeUrl() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEYS.bridgeUrl]);
      const value = stored[STORAGE_KEYS.bridgeUrl];
      if (typeof value === "string" && value.trim()) {
        state.bridgeUrl = value.trim();
      }
    } catch {
    }
    el.bridgeInput.value = state.bridgeUrl;
  }
  async function persistBridgeUrl(value) {
    state.bridgeUrl = value;
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.bridgeUrl]: value });
    } catch {
    }
  }
  el.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      if (!id) return;
      el.tabs.forEach((other) => other.classList.toggle("is-active", other === btn));
      el.tabPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.tabPanel === id);
      });
    });
  });
  el.modeSwitch.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.modeSwitch.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      const raw = btn.dataset.mode ?? "null";
      const mode = raw === "null" ? null : raw;
      state.activeMode = mode;
      sendToContent({ kind: "set-theme", mode });
      pushSnapshotToContent();
    });
  });
  el.hoverToggle.addEventListener("change", () => {
    state.hoverActive = el.hoverToggle.checked;
    sendToContent({ kind: "hover-inspector", enabled: state.hoverActive });
  });
  el.tokenFilter.addEventListener("input", () => {
    state.tokenFilter = el.tokenFilter.value.toLowerCase();
    renderTokenList();
  });
  el.clearHighlight.addEventListener("click", () => {
    state.highlightedToken = null;
    sendToContent({ kind: "highlight-token", tokenId: null });
    renderTokenList();
  });
  el.scanCoverage.addEventListener("click", () => {
    if (!state.snapshot) return;
    el.coverageSummary.textContent = "Scanning...";
    sendToContent({
      kind: "scan-coverage",
      tokenColors: snapshotTokenCss(),
      aliases: state.snapshot.manifest.aliases
    });
  });
  el.scanContrast.addEventListener("click", () => {
    if (!state.snapshot) return;
    el.contrastSummary.textContent = "Auditing...";
    sendToContent({
      kind: "scan-contrast",
      tokenColors: snapshotTokenCss(),
      aliases: state.snapshot.manifest.aliases
    });
  });
  el.overrideToken.addEventListener("change", () => {
    state.overrideTokenId = el.overrideToken.value;
    syncOverrideFromSnapshot();
    renderOverrideSliders();
  });
  el.overrideMode.addEventListener("change", () => {
    state.overrideMode = el.overrideMode.value;
  });
  el.overridePersist.addEventListener("change", () => {
    state.persistOverride = el.overridePersist.checked;
  });
  el.clearOverrides.addEventListener("click", () => {
    sendToContent({ kind: "clear-all-overrides" });
  });
  el.pushOverride.addEventListener("click", async () => {
    if (!state.overrideTokenId) return;
    try {
      await bridge.pushOverride(state.overrideTokenId, state.overrideMode, state.overrideColor, {
        persist: state.persistOverride
      });
    } catch (error) {
      setConnectionStatus("error", error instanceof Error ? error.message : "push failed");
    }
  });
  el.bridgeBtn.addEventListener("click", async () => {
    const input = el.bridgeInput.value.trim();
    if (!input) return;
    await persistBridgeUrl(input);
    bridge.stop();
    bridge.start();
  });
  function snapshotTokenCss() {
    if (!state.snapshot) return {};
    const mode = resolvedModeForPreview();
    const resolved = state.snapshot.resolved[mode];
    const out = {};
    for (const [tokenId, payload] of Object.entries(resolved.colors)) {
      out[tokenId] = payload.css;
    }
    return out;
  }
  function resolvedModeForPreview() {
    if (state.activeMode) return state.activeMode;
    if (state.pageInfo.theme === "dark" || state.pageInfo.theme === "alt")
      return state.pageInfo.theme;
    return "light";
  }
  function pushSnapshotToContent() {
    if (!state.snapshot) return;
    sendToContent({ kind: "update-snapshot", snapshot: state.snapshot });
  }
  function renderAll() {
    renderTokenList();
    renderOverrideTokenOptions();
    if (!state.overrideTokenId && state.snapshot) {
      state.overrideTokenId = Object.keys(state.snapshot.manifest.tokens)[0] ?? "";
      syncOverrideFromSnapshot();
    }
    renderOverrideSliders();
  }
  function renderPageInfo() {
    el.pageInfo.textContent = state.pageInfo.url ? `Inspecting: ${state.pageInfo.title || "(untitled)"} \u2014 ${state.pageInfo.url} \xB7 data-theme=${state.pageInfo.theme ?? "(none)"}` : "Waiting for inspected page to load...";
  }
  function renderHoverDetails(payload) {
    if (!payload) {
      el.hoverDetails.innerHTML = '<p class="placeholder">Move your mouse over the inspected page to read live token info.</p>';
      return;
    }
    const swatch = (color) => color ? `<span class="swatch" style="background:${color}"></span>` : "";
    const contrast = payload.contrastLc === null ? "\u2014" : `${payload.contrastLc.toFixed(1)} Lc`;
    const alias = payload.aliasChain.length ? payload.aliasChain.join(", ") : "\u2014";
    const token = payload.matchedToken ? `${payload.matchedToken} <span class="meta">(${payload.matchedTokenChannel ?? "\u2014"})</span>` : "<em>no token match</em>";
    el.hoverDetails.innerHTML = `
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${escapeHtml(payload.selector)}</code></dd>
      <dt>Token</dt><dd>${token}</dd>
      <dt>Alias</dt><dd>${escapeHtml(alias)}</dd>
      <dt>Color</dt><dd class="swatch-row">${swatch(payload.computedColor)} <code>${escapeHtml(payload.computedColor ?? "\u2014")}</code></dd>
      <dt>Background</dt><dd class="swatch-row">${swatch(payload.computedBackground)} <code>${escapeHtml(payload.computedBackground ?? "\u2014")}</code></dd>
      <dt>APCA</dt><dd>${contrast}</dd>
    </dl>
  `;
  }
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return "&#39;";
      }
    });
  }
  function renderTokenList() {
    if (!state.snapshot) {
      el.tokenList.innerHTML = '<p class="placeholder">Connect to the engine to load tokens.</p>';
      return;
    }
    const mode = resolvedModeForPreview();
    const resolved = state.snapshot.resolved[mode];
    const filter = state.tokenFilter;
    const parts = [];
    for (const group of state.snapshot.tokenGroups) {
      const ids = (state.snapshot.tokensByGroup[group] ?? []).filter((id) => id.includes(filter));
      if (!ids.length) continue;
      parts.push(`<div class="token-group-heading">${escapeHtml(group)}</div>`);
      for (const tokenId of ids) {
        const token = state.snapshot.manifest.tokens[tokenId];
        if (!token) continue;
        const color = resolved.colors[tokenId]?.css ?? "";
        const count = state.coverage?.byToken[tokenId];
        const highlighted = state.highlightedToken === tokenId ? " is-highlighted" : "";
        parts.push(
          `<button class="token-row${highlighted}" data-token-id="${tokenId}">
          <span class="swatch" style="background:${color}"></span>
          <div>
            <div class="token-name">${escapeHtml(token.label)}</div>
            <div class="token-value">${tokenId} \xB7 ${escapeHtml(color)}</div>
          </div>
          <span class="token-count">${count === void 0 ? "\xB7" : `${count} used`}</span>
          <span aria-hidden="true">\u203A</span>
        </button>`
        );
      }
    }
    el.tokenList.innerHTML = parts.join("");
    el.tokenList.querySelectorAll(".token-row").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.dataset.tokenId ?? null;
        if (!id) return;
        state.highlightedToken = state.highlightedToken === id ? null : id;
        sendToContent({ kind: "highlight-token", tokenId: state.highlightedToken });
        renderTokenList();
      });
    });
  }
  function renderCoverage() {
    const coverage = state.coverage;
    if (!coverage) {
      el.coverageOutput.innerHTML = '<p class="placeholder">Run a scan to see token usage.</p>';
      el.coverageSummary.textContent = "";
      return;
    }
    const used = Object.entries(coverage.byToken).filter(([, n]) => n > 0).length;
    const total = Object.keys(coverage.byToken).length;
    el.coverageSummary.textContent = `${coverage.totalElements} elements \xB7 ${used}/${total} tokens used \xB7 ${coverage.rawColorViolations.length} raw colors`;
    const top = [...Object.entries(coverage.byToken)].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const unused = coverage.unusedTokens.slice(0, 20);
    const violations = coverage.rawColorViolations.slice(0, 20);
    el.coverageOutput.innerHTML = `
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${top.map(
      ([tokenId, count]) => `<div class="report-item"><span>${escapeHtml(tokenId)}</span><span class="meta">${count} elements</span><span></span></div>`
    ).join("")}
    </div>
    <p class="report-subhead">Unused tokens (${unused.length})</p>
    <div class="report-list">
      ${unused.map((id) => `<div class="report-item"><span>${escapeHtml(id)}</span><span class="meta">0</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Raw color violations (${violations.length})</p>
    <div class="report-list">
      ${violations.map(
      (v) => `<div class="report-item severity-warn"><span><code>${escapeHtml(v.selector)}</code></span><span class="meta">${escapeHtml(v.property)}: ${escapeHtml(v.value)}</span><span></span></div>`
    ).join("")}
    </div>
  `;
  }
  function renderContrast(report) {
    el.contrastSummary.textContent = `${report.sampled} sampled \xB7 ${report.findings.length} potential failures`;
    if (!report.findings.length) {
      el.contrastOutput.innerHTML = '<p class="placeholder">No APCA failures detected in the sampled text elements.</p>';
      return;
    }
    el.contrastOutput.innerHTML = `
    <div class="report-list">
      ${report.findings.map(
      (finding) => `
          <div class="report-item severity-${finding.severity}">
            <span>
              <code>${escapeHtml(finding.selector)}</code>
              <div class="meta">${escapeHtml(finding.context || "\u2014")}</div>
            </span>
            <span class="meta">
              fg ${escapeHtml(finding.foregroundToken ?? finding.foreground)}
              \xB7 bg ${escapeHtml(finding.backgroundToken ?? finding.background)}
            </span>
            <span class="meta">${finding.contrastLc.toFixed(1)} Lc</span>
          </div>
        `
    ).join("")}
    </div>
  `;
  }
  function renderOverrideTokenOptions() {
    if (!state.snapshot) return;
    const tokens = Object.values(state.snapshot.manifest.tokens);
    el.overrideToken.innerHTML = tokens.map((token) => `<option value="${token.id}">${escapeHtml(token.label)} (${token.id})</option>`).join("");
    if (state.overrideTokenId) el.overrideToken.value = state.overrideTokenId;
  }
  function syncOverrideFromSnapshot() {
    if (!state.snapshot || !state.overrideTokenId) return;
    const token = state.snapshot.manifest.tokens[state.overrideTokenId];
    if (!token) return;
    const mode = resolvedModeForPreview();
    state.overrideColor = { ...mode === "dark" ? token.dark : token.light };
  }
  function renderOverrideSliders() {
    const color = state.overrideColor;
    const channels = [
      { key: "l", label: "L", min: 0, max: 1, step: 1e-3 },
      { key: "c", label: "C", min: 0, max: 0.4, step: 1e-3 },
      { key: "h", label: "H", min: 0, max: 360, step: 0.1 }
    ];
    const preview = oklchToCss(color);
    el.overrideSliders.innerHTML = `
    <div class="override-preview">
      <div class="preview-swatch" style="background:${preview}"></div>
      <code>${escapeHtml(formatOklch(color))}</code>
    </div>
    ${channels.map(
      (ch) => `
        <div class="slider-row">
          <span class="channel">${ch.label}</span>
          <input type="range" min="${ch.min}" max="${ch.max}" step="${ch.step}" value="${color[ch.key]}" data-channel="${ch.key}" />
          <span class="readout">${color[ch.key].toFixed(ch.key === "h" ? 2 : 3)}</span>
        </div>
      `
    ).join("")}
  `;
    el.overrideSliders.querySelectorAll("input[type=range]").forEach((input) => {
      input.addEventListener("input", () => {
        const channel = input.dataset.channel;
        state.overrideColor = { ...state.overrideColor, [channel]: Number(input.value) };
        renderOverrideSliders();
        if (state.overrideTokenId) {
          sendToContent({
            kind: "override-token",
            tokenId: state.overrideTokenId,
            css: oklchToCss(state.overrideColor)
          });
        }
      });
    });
  }
  (async () => {
    await loadBridgeUrl();
    bridge.start();
    sendToContent({ kind: "ping" });
    renderHoverDetails(null);
    renderPageInfo();
    renderCoverage();
  })();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9icmlkZ2UtY2xpZW50LnRzIiwgIi4uL3NyYy9zaGFyZWQvY29uc3RhbnRzLnRzIiwgIi4uL3NyYy9zaGFyZWQvY29sb3IudHMiLCAiLi4vc3JjL3NoYXJlZC9tZXNzYWdpbmcudHMiLCAiLi4vc3JjL3BhbmVsLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7IEJyaWRnZVNuYXBzaG90LCBPa2xjaENvbG9yIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCB0eXBlIEJyaWRnZVN0YXR1cyA9ICdpZGxlJyB8ICdjb25uZWN0aW5nJyB8ICdjb25uZWN0ZWQnIHwgJ2Vycm9yJztcblxuZXhwb3J0IGludGVyZmFjZSBCcmlkZ2VDbGllbnRPcHRpb25zIHtcbiAgZ2V0QmFzZVVybDogKCkgPT4gc3RyaW5nO1xuICBvblN0YXR1czogKHN0YXR1czogQnJpZGdlU3RhdHVzLCBkZXRhaWw/OiBzdHJpbmcpID0+IHZvaWQ7XG4gIG9uU25hcHNob3Q6IChzbmFwc2hvdDogQnJpZGdlU25hcHNob3QpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBCcmlkZ2VDbGllbnQge1xuICBwcml2YXRlIHNvdXJjZTogRXZlbnRTb3VyY2UgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByZXRyeVRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJldHJ5RGVsYXkgPSAxMDAwO1xuICBwcml2YXRlIHN0b3BwZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IEJyaWRnZUNsaWVudE9wdGlvbnMpIHt9XG5cbiAgc3RhcnQoKTogdm9pZCB7XG4gICAgdGhpcy5zdG9wcGVkID0gZmFsc2U7XG4gICAgdGhpcy5jb25uZWN0KCk7XG4gIH1cblxuICBzdG9wKCk6IHZvaWQge1xuICAgIHRoaXMuc3RvcHBlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMucmV0cnlUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmV0cnlUaW1lcik7XG4gICAgICB0aGlzLnJldHJ5VGltZXIgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlLmNsb3NlKCk7XG4gICAgICB0aGlzLnNvdXJjZSA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZmV0Y2hTbmFwc2hvdCgpOiBQcm9taXNlPEJyaWRnZVNuYXBzaG90PiB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLm9wdGlvbnMuZ2V0QmFzZVVybCgpfS9hcGkvYnJpZGdlL3NuYXBzaG90YCwge1xuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIGNhY2hlOiAnbm8tc3RvcmUnXG4gICAgfSk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTbmFwc2hvdCByZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyAke3Jlc3BvbnNlLnN0YXR1c31gKTtcbiAgICB9XG4gICAgcmV0dXJuIChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIEJyaWRnZVNuYXBzaG90O1xuICB9XG5cbiAgYXN5bmMgcHVzaE92ZXJyaWRlKFxuICAgIHRva2VuSWQ6IHN0cmluZyxcbiAgICBtb2RlOiAnbGlnaHQnIHwgJ2RhcmsnIHwgJ2JvdGgnLFxuICAgIGNvbG9yOiBPa2xjaENvbG9yLFxuICAgIG9wdGlvbnM6IHsgcGVyc2lzdD86IGJvb2xlYW4gfSA9IHt9XG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5vcHRpb25zLmdldEJhc2VVcmwoKX0vYXBpL2JyaWRnZS90b2tlbmAsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHRva2VuSWQsIG1vZGUsIGNvbG9yLCBwZXJzaXN0OiBvcHRpb25zLnBlcnNpc3QgPz8gZmFsc2UgfSlcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE92ZXJyaWRlIGZhaWxlZCB3aXRoIHN0YXR1cyAke3Jlc3BvbnNlLnN0YXR1c31gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbm5lY3QoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RvcHBlZCkgcmV0dXJuO1xuICAgIHRoaXMub3B0aW9ucy5vblN0YXR1cygnY29ubmVjdGluZycpO1xuICAgIGNvbnN0IHVybCA9IGAke3RoaXMub3B0aW9ucy5nZXRCYXNlVXJsKCl9L2FwaS9icmlkZ2UvZXZlbnRzYDtcbiAgICB0cnkge1xuICAgICAgdGhpcy5zb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UodXJsKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5vcHRpb25zLm9uU3RhdHVzKCdlcnJvcicsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1VuYWJsZSB0byBjb25uZWN0Jyk7XG4gICAgICB0aGlzLnNjaGVkdWxlUmVjb25uZWN0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignaGVsbG8nLCAoZXZlbnQpID0+IHtcbiAgICAgIHRoaXMucmV0cnlEZWxheSA9IDEwMDA7XG4gICAgICB0aGlzLm9wdGlvbnMub25TdGF0dXMoJ2Nvbm5lY3RlZCcpO1xuICAgICAgdGhpcy5oYW5kbGVTbmFwc2hvdEV2ZW50KGV2ZW50IGFzIE1lc3NhZ2VFdmVudDxzdHJpbmc+KTtcbiAgICB9KTtcbiAgICB0aGlzLnNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdzbmFwc2hvdCcsIChldmVudCkgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVTbmFwc2hvdEV2ZW50KGV2ZW50IGFzIE1lc3NhZ2VFdmVudDxzdHJpbmc+KTtcbiAgICB9KTtcbiAgICB0aGlzLnNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdwaW5nJywgKCkgPT4ge1xuICAgICAgLy8ga2VlcC1hbGl2ZVxuICAgIH0pO1xuICAgIHRoaXMuc291cmNlLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICB0aGlzLm9wdGlvbnMub25TdGF0dXMoJ2Vycm9yJywgJ1N0cmVhbSBkaXNjb25uZWN0ZWQnKTtcbiAgICAgIHRoaXMuc291cmNlPy5jbG9zZSgpO1xuICAgICAgdGhpcy5zb3VyY2UgPSBudWxsO1xuICAgICAgdGhpcy5zY2hlZHVsZVJlY29ubmVjdCgpO1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZVNuYXBzaG90RXZlbnQoZXZlbnQ6IE1lc3NhZ2VFdmVudDxzdHJpbmc+KTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSkgYXMgeyBzbmFwc2hvdD86IEJyaWRnZVNuYXBzaG90IH07XG4gICAgICBpZiAocGFyc2VkLnNuYXBzaG90KSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5vblNuYXBzaG90KHBhcnNlZC5zbmFwc2hvdCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBpZ25vcmUgbWFsZm9ybWVkIHBheWxvYWRzXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZVJlY29ubmVjdCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdG9wcGVkKSByZXR1cm47XG4gICAgaWYgKHRoaXMucmV0cnlUaW1lcikgY2xlYXJUaW1lb3V0KHRoaXMucmV0cnlUaW1lcik7XG4gICAgdGhpcy5yZXRyeVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJldHJ5RGVsYXkgPSBNYXRoLm1pbih0aGlzLnJldHJ5RGVsYXkgKiAyLCAxNV8wMDApO1xuICAgICAgdGhpcy5jb25uZWN0KCk7XG4gICAgfSwgdGhpcy5yZXRyeURlbGF5KTtcbiAgfVxufVxuIiwgImV4cG9ydCBjb25zdCBERUZBVUxUX0JSSURHRV9VUkwgPSAnaHR0cDovL2xvY2FsaG9zdDo1MTczJztcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIGJyaWRnZVVybDogJ3NlbWFudGljQ29sb3JzLmJyaWRnZVVybCcsXG4gIGxhc3RTbmFwc2hvdDogJ3NlbWFudGljQ29sb3JzLmxhc3RTbmFwc2hvdCdcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBPVkVSUklERV9BVFRSID0gJ2RhdGEtc2VtYW50aWMtY29sb3JzLW92ZXJyaWRlJztcbmV4cG9ydCBjb25zdCBISUdITElHSFRfQVRUUiA9ICdkYXRhLXNlbWFudGljLWNvbG9ycy1oaWdobGlnaHQnO1xuZXhwb3J0IGNvbnN0IElOU1BFQ1RPUl9PVkVSTEFZX0lEID0gJ3NlbWFudGljLWNvbG9ycy1pbnNwZWN0b3Itb3ZlcmxheSc7XG5leHBvcnQgY29uc3QgSU5TUEVDVE9SX1NUWUxFX0lEID0gJ3NlbWFudGljLWNvbG9ycy1pbnNwZWN0b3Itc3R5bGUnO1xuZXhwb3J0IGNvbnN0IE9WRVJSSURFX1NUWUxFX0lEID0gJ3NlbWFudGljLWNvbG9ycy1vdmVycmlkZS1zdHlsZSc7XG4iLCAiaW1wb3J0IHR5cGUgeyBPa2xjaENvbG9yIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8vIC0tLSBPS0xDSCA8LT4gc1JHQiBjb252ZXJzaW9ucyAoRDY1LCBsaW5lYXItc1JHQiB2aWEgT2tsYWIpLiAtLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBzcmdiVG9MaW5lYXIodmFsdWU6IG51bWJlcik6IG51bWJlciB7XG4gIGNvbnN0IHYgPSB2YWx1ZSAvIDI1NTtcbiAgcmV0dXJuIHYgPD0gMC4wNDA0NSA/IHYgLyAxMi45MiA6ICgodiArIDAuMDU1KSAvIDEuMDU1KSAqKiAyLjQ7XG59XG5cbmZ1bmN0aW9uIGxpbmVhclRvU3JnYih2YWx1ZTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgdiA9IHZhbHVlIDw9IDAuMDAzMTMwOCA/IHZhbHVlICogMTIuOTIgOiAxLjA1NSAqIE1hdGgucG93KHZhbHVlLCAxIC8gMi40KSAtIDAuMDU1O1xuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHYgKiAyNTUpKSk7XG59XG5cbmZ1bmN0aW9uIG9rbGFiVG9MaW5lYXJTcmdiKEw6IG51bWJlciwgYTogbnVtYmVyLCBiOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xuICBjb25zdCBsXyA9IEwgKyAwLjM5NjMzNzc3NzQgKiBhICsgMC4yMTU4MDM3NTczICogYjtcbiAgY29uc3QgbV8gPSBMIC0gMC4xMDU1NjEzNDU4ICogYSAtIDAuMDYzODU0MTcyOCAqIGI7XG4gIGNvbnN0IHNfID0gTCAtIDAuMDg5NDg0MTc3NSAqIGEgLSAxLjI5MTQ4NTU0OCAqIGI7XG5cbiAgY29uc3QgbCA9IGxfICoqIDM7XG4gIGNvbnN0IG0gPSBtXyAqKiAzO1xuICBjb25zdCBzID0gc18gKiogMztcblxuICByZXR1cm4gW1xuICAgIDQuMDc2NzQxNjYyMSAqIGwgLSAzLjMwNzcxMTU5MTMgKiBtICsgMC4yMzA5Njk5MjkyICogcyxcbiAgICAtMS4yNjg0MzgwMDQ2ICogbCArIDIuNjA5NzU3NDAxMSAqIG0gLSAwLjM0MTMxOTM5NjUgKiBzLFxuICAgIC0wLjAwNDE5NjA4NjMgKiBsIC0gMC43MDM0MTg2MTQ3ICogbSArIDEuNzA3NjE0NzAxICogc1xuICBdO1xufVxuXG5mdW5jdGlvbiBsaW5lYXJTcmdiVG9Pa2xhYihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgY29uc3QgbCA9IE1hdGguY2JydCgwLjQxMjIyMTQ3MDggKiByICsgMC41MzYzMzI1MzYzICogZyArIDAuMDUxNDQ1OTkyOSAqIGIpO1xuICBjb25zdCBtID0gTWF0aC5jYnJ0KDAuMjExOTAzNDk4MiAqIHIgKyAwLjY4MDY5OTU0NTEgKiBnICsgMC4xMDczOTY5NTY2ICogYik7XG4gIGNvbnN0IHMgPSBNYXRoLmNicnQoMC4wODgzMDI0NjE5ICogciArIDAuMjgxNzE4ODM3NiAqIGcgKyAwLjYyOTk3ODcwMDUgKiBiKTtcblxuICByZXR1cm4gW1xuICAgIDAuMjEwNDU0MjU1MyAqIGwgKyAwLjc5MzYxNzc4NSAqIG0gLSAwLjAwNDA3MjA0NjggKiBzLFxuICAgIDEuOTc3OTk4NDk1MSAqIGwgLSAyLjQyODU5MjIwNSAqIG0gKyAwLjQ1MDU5MzcwOTkgKiBzLFxuICAgIDAuMDI1OTA0MDM3MSAqIGwgKyAwLjc4Mjc3MTc2NjIgKiBtIC0gMC44MDg2NzU3NjYgKiBzXG4gIF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBva2xjaFRvUmdiKGNvbG9yOiBPa2xjaENvbG9yKTogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhbHBoYTogbnVtYmVyIH0ge1xuICBjb25zdCBodWVSYWQgPSAoY29sb3IuaCAqIE1hdGguUEkpIC8gMTgwO1xuICBjb25zdCBhID0gY29sb3IuYyAqIE1hdGguY29zKGh1ZVJhZCk7XG4gIGNvbnN0IGIgPSBjb2xvci5jICogTWF0aC5zaW4oaHVlUmFkKTtcbiAgY29uc3QgW2xyLCBsZywgbGJdID0gb2tsYWJUb0xpbmVhclNyZ2IoY29sb3IubCwgYSwgYik7XG4gIHJldHVybiB7XG4gICAgcjogbGluZWFyVG9TcmdiKGxyKSxcbiAgICBnOiBsaW5lYXJUb1NyZ2IobGcpLFxuICAgIGI6IGxpbmVhclRvU3JnYihsYiksXG4gICAgYWxwaGE6IGNvbG9yLmFscGhhID8/IDFcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJnYlRvT2tsY2gocjogbnVtYmVyLCBnOiBudW1iZXIsIGI6IG51bWJlciwgYWxwaGEgPSAxKTogT2tsY2hDb2xvciB7XG4gIGNvbnN0IFtMLCBhLCBiTGFiXSA9IGxpbmVhclNyZ2JUb09rbGFiKHNyZ2JUb0xpbmVhcihyKSwgc3JnYlRvTGluZWFyKGcpLCBzcmdiVG9MaW5lYXIoYikpO1xuICBjb25zdCBjID0gTWF0aC5zcXJ0KGEgKiBhICsgYkxhYiAqIGJMYWIpO1xuICBsZXQgaCA9IChNYXRoLmF0YW4yKGJMYWIsIGEpICogMTgwKSAvIE1hdGguUEk7XG4gIGlmIChoIDwgMCkgaCArPSAzNjA7XG4gIHJldHVybiB7IGw6IEwsIGMsIGgsIGFscGhhIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBva2xjaFRvQ3NzKGNvbG9yOiBPa2xjaENvbG9yKTogc3RyaW5nIHtcbiAgY29uc3QgeyByLCBnLCBiLCBhbHBoYSB9ID0gb2tsY2hUb1JnYihjb2xvcik7XG4gIGlmIChhbHBoYSA8IDEpIHtcbiAgICByZXR1cm4gYHJnYmEoJHtyfSwgJHtnfSwgJHtifSwgJHthbHBoYS50b0ZpeGVkKDMpfSlgO1xuICB9XG4gIHJldHVybiBgcmdiKCR7cn0sICR7Z30sICR7Yn0pYDtcbn1cblxuLy8gLS0tIFBhcnNlIGFueSBDU1MgY29sb3Igc3RyaW5nIGludG8gc1JHQiB0dXBsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubGV0IHByb2JlQ29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgbnVsbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGdldFByb2JlQ29udGV4dCgpOiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsIHtcbiAgaWYgKHByb2JlQ29udGV4dCkgcmV0dXJuIHByb2JlQ29udGV4dDtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgY2FudmFzLmhlaWdodCA9IDE7XG4gICAgcHJvYmVDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywgeyB3aWxsUmVhZEZyZXF1ZW50bHk6IHRydWUgfSk7XG4gICAgcmV0dXJuIHByb2JlQ29udGV4dDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRDb2xvciB7XG4gIHI6IG51bWJlcjtcbiAgZzogbnVtYmVyO1xuICBiOiBudW1iZXI7XG4gIGFscGhhOiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNzc0NvbG9yKGlucHV0OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkKTogUGFyc2VkQ29sb3IgfCBudWxsIHtcbiAgaWYgKCFpbnB1dCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHRleHQgPSBpbnB1dC50cmltKCk7XG4gIGlmICghdGV4dCB8fCB0ZXh0ID09PSAnbm9uZScgfHwgdGV4dCA9PT0gJ3RyYW5zcGFyZW50JykgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgY3R4ID0gZ2V0UHJvYmVDb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gbnVsbDtcblxuICBjdHguY2xlYXJSZWN0KDAsIDAsIDEsIDEpO1xuICB0cnkge1xuICAgIGN0eC5maWxsU3R5bGUgPSAnIzAwMCc7XG4gICAgY3R4LmZpbGxTdHlsZSA9IHRleHQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY3R4LmZpbGxSZWN0KDAsIDAsIDEsIDEpO1xuICBjb25zdCBkYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAxKS5kYXRhO1xuICBjb25zdCBhbHBoYSA9IGRhdGFbM10gLyAyNTU7XG4gIGlmIChhbHBoYSA9PT0gMCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHI6IGRhdGFbMF0sIGc6IGRhdGFbMV0sIGI6IGRhdGFbMl0sIGFscGhhIH07XG59XG5cbi8vIC0tLSBBUENBIGNvbnRyYXN0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNaW5pbWFsIEFQQ0EgKEFjY2Vzc2libGUgUGVyY2VwdHVhbCBDb250cmFzdCBBbGdvcml0aG0pIGltcGxlbWVudGF0aW9uLlxuLy8gTWF0Y2hlcyBhcGNhLXczIG91dHB1dHMgd2l0aGluIGRpc3BsYXkgcHJlY2lzaW9uIGZvciBzUkdCIGlucHV0cy5cblxuY29uc3Qgbm9ybUJHID0gMC41NjtcbmNvbnN0IG5vcm1UWFQgPSAwLjU3O1xuY29uc3QgcmV2VFhUID0gMC42MjtcbmNvbnN0IHJldkJHID0gMC42NTtcbmNvbnN0IGJsa1RocnMgPSAwLjAyMjtcbmNvbnN0IGJsa0NsbXAgPSAxLjQxNDtcbmNvbnN0IHNjYWxlQm9XID0gMS4xNDtcbmNvbnN0IHNjYWxlV29CID0gMS4xNDtcbmNvbnN0IGxvQm9Xb2Zmc2V0ID0gMC4wMjc7XG5jb25zdCBsb1dvQm9mZnNldCA9IDAuMDI3O1xuY29uc3QgZGVsdGFZbWluID0gMC4wMDA1O1xuXG5mdW5jdGlvbiBzUkdCdG9ZKHJnYjogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyIH0pOiBudW1iZXIge1xuICBjb25zdCByID0gKHJnYi5yIC8gMjU1KSAqKiAyLjQ7XG4gIGNvbnN0IGcgPSAocmdiLmcgLyAyNTUpICoqIDIuNDtcbiAgY29uc3QgYiA9IChyZ2IuYiAvIDI1NSkgKiogMi40O1xuICByZXR1cm4gMC4yMTI2NzI5ICogciArIDAuNzE1MTUyMiAqIGcgKyAwLjA3MjE3NSAqIGI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcGNhQ29udHJhc3QoZm9yZWdyb3VuZDogUGFyc2VkQ29sb3IsIGJhY2tncm91bmQ6IFBhcnNlZENvbG9yKTogbnVtYmVyIHtcbiAgbGV0IHR4dFkgPSBzUkdCdG9ZKGZvcmVncm91bmQpO1xuICBsZXQgYmdZID0gc1JHQnRvWShiYWNrZ3JvdW5kKTtcblxuICBpZiAoTWF0aC5hYnMoYmdZIC0gdHh0WSkgPCBkZWx0YVltaW4pIHJldHVybiAwO1xuXG4gIGlmICh0eHRZIDw9IGJsa1RocnMpIHR4dFkgKz0gKGJsa1RocnMgLSB0eHRZKSAqKiBibGtDbG1wO1xuICBpZiAoYmdZIDw9IGJsa1RocnMpIGJnWSArPSAoYmxrVGhycyAtIGJnWSkgKiogYmxrQ2xtcDtcblxuICBsZXQgb3V0cHV0Q29udHJhc3Q6IG51bWJlcjtcbiAgaWYgKGJnWSA+IHR4dFkpIHtcbiAgICBjb25zdCBTQVBDID0gKGJnWSAqKiBub3JtQkcgLSB0eHRZICoqIG5vcm1UWFQpICogc2NhbGVCb1c7XG4gICAgb3V0cHV0Q29udHJhc3QgPSBTQVBDIDwgbG9Cb1dvZmZzZXQgPyAwIDogU0FQQyAtIGxvQm9Xb2Zmc2V0O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IFNBUEMgPSAoYmdZICoqIHJldkJHIC0gdHh0WSAqKiByZXZUWFQpICogc2NhbGVXb0I7XG4gICAgb3V0cHV0Q29udHJhc3QgPSBTQVBDID4gLWxvV29Cb2Zmc2V0ID8gMCA6IFNBUEMgKyBsb1dvQm9mZnNldDtcbiAgfVxuICByZXR1cm4gb3V0cHV0Q29udHJhc3QgKiAxMDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcGNhU2V2ZXJpdHkobGM6IG51bWJlcik6ICdvaycgfCAnd2FybicgfCAnZmFpbCcge1xuICBjb25zdCBhYnMgPSBNYXRoLmFicyhsYyk7XG4gIGlmIChhYnMgPj0gNzUpIHJldHVybiAnb2snO1xuICBpZiAoYWJzID49IDYwKSByZXR1cm4gJ29rJztcbiAgaWYgKGFicyA+PSA0NSkgcmV0dXJuICd3YXJuJztcbiAgcmV0dXJuICdmYWlsJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdE9rbGNoKGNvbG9yOiBPa2xjaENvbG9yKTogc3RyaW5nIHtcbiAgY29uc3QgbCA9IChjb2xvci5sICogMTAwKS50b0ZpeGVkKDIpO1xuICBjb25zdCBjID0gY29sb3IuYy50b0ZpeGVkKDQpO1xuICBjb25zdCBoID0gY29sb3IuaC50b0ZpeGVkKDIpO1xuICBjb25zdCBhbHBoYSA9IGNvbG9yLmFscGhhICE9PSB1bmRlZmluZWQgJiYgY29sb3IuYWxwaGEgPCAxID8gYCAvICR7Y29sb3IuYWxwaGEudG9GaXhlZCgyKX1gIDogJyc7XG4gIHJldHVybiBgb2tsY2goJHtsfSUgJHtjfSAke2h9JHthbHBoYX0pYDtcbn1cbiIsICJpbXBvcnQgdHlwZSB7IENvbnRlbnRUb1BhbmVsTWVzc2FnZSwgUGFuZWxUb0NvbnRlbnRNZXNzYWdlIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogVGhlIGJhY2tncm91bmQgc2VydmljZSB3b3JrZXIgYWN0cyBhcyBhIHJlbGF5OlxuICogICBwYW5lbCAgPFx1MjAxNHBvcnRcdTIwMTQ+ICBiYWNrZ3JvdW5kICA8XHUyMDE0cnVudGltZSBtZXNzYWdlXHUyMDE0PiAgY29udGVudCBzY3JpcHRcbiAqXG4gKiBUaGUgcGFuZWwgb3BlbnMgYSBsb25nLWxpdmVkIHBvcnQgbmFtZWQgYHBhbmVsOjx0YWJJZD5gOyB0aGUgU1cgc3RvcmVzIGl0LlxuICogQ29udGVudCBzY3JpcHRzIHVzZSBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTsgdGhlIFNXIGxvb2tzIHVwIHRoZSBwb3J0XG4gKiBmb3IgdGhlIHNlbmRlciB0YWIgYW5kIGZvcndhcmRzLlxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwYW5lbFBvcnROYW1lKHRhYklkOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gYHBhbmVsOiR7dGFiSWR9YDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYW5lbE1lc3NhZ2VFbnZlbG9wZSB7XG4gIHNvdXJjZTogJ3BhbmVsJztcbiAgdGFiSWQ6IG51bWJlcjtcbiAgcGF5bG9hZDogUGFuZWxUb0NvbnRlbnRNZXNzYWdlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnRlbnRNZXNzYWdlRW52ZWxvcGUge1xuICBzb3VyY2U6ICdjb250ZW50JztcbiAgcGF5bG9hZDogQ29udGVudFRvUGFuZWxNZXNzYWdlO1xufVxuXG5leHBvcnQgdHlwZSBSZWxheU1lc3NhZ2UgPSBQYW5lbE1lc3NhZ2VFbnZlbG9wZSB8IENvbnRlbnRNZXNzYWdlRW52ZWxvcGU7XG4iLCAiaW1wb3J0IHsgQnJpZGdlQ2xpZW50IH0gZnJvbSAnLi9zaGFyZWQvYnJpZGdlLWNsaWVudCc7XG5pbXBvcnQgdHlwZSB7IEJyaWRnZVN0YXR1cyB9IGZyb20gJy4vc2hhcmVkL2JyaWRnZS1jbGllbnQnO1xuaW1wb3J0IHsgREVGQVVMVF9CUklER0VfVVJMLCBTVE9SQUdFX0tFWVMgfSBmcm9tICcuL3NoYXJlZC9jb25zdGFudHMnO1xuaW1wb3J0IHsgZm9ybWF0T2tsY2gsIG9rbGNoVG9Dc3MsIHBhcnNlQ3NzQ29sb3IsIHJnYlRvT2tsY2ggfSBmcm9tICcuL3NoYXJlZC9jb2xvcic7XG5pbXBvcnQgeyBwYW5lbFBvcnROYW1lIH0gZnJvbSAnLi9zaGFyZWQvbWVzc2FnaW5nJztcbmltcG9ydCB0eXBlIHsgQ29udGVudE1lc3NhZ2VFbnZlbG9wZSwgUGFuZWxNZXNzYWdlRW52ZWxvcGUgfSBmcm9tICcuL3NoYXJlZC9tZXNzYWdpbmcnO1xuaW1wb3J0IHR5cGUge1xuICBCcmlkZ2VTbmFwc2hvdCxcbiAgQ29udGVudFRvUGFuZWxNZXNzYWdlLFxuICBDb250cmFzdFJlcG9ydCxcbiAgQ292ZXJhZ2VSZXBvcnQsXG4gIEhvdmVyRWxlbWVudFBheWxvYWQsXG4gIE9rbGNoQ29sb3IsXG4gIFBhbmVsVG9Db250ZW50TWVzc2FnZSxcbiAgVGhlbWVNb2RlLFxuICBUb2tlblJlY29yZFxufSBmcm9tICcuL3NoYXJlZC90eXBlcyc7XG5cbmNvbnN0IHRhYklkID0gY2hyb21lLmRldnRvb2xzLmluc3BlY3RlZFdpbmRvdy50YWJJZDtcblxuY29uc3Qgc3RhdGUgPSB7XG4gIGJyaWRnZVVybDogREVGQVVMVF9CUklER0VfVVJMLFxuICBzbmFwc2hvdDogbnVsbCBhcyBCcmlkZ2VTbmFwc2hvdCB8IG51bGwsXG4gIGNvdmVyYWdlOiBudWxsIGFzIENvdmVyYWdlUmVwb3J0IHwgbnVsbCxcbiAgaGlnaGxpZ2h0ZWRUb2tlbjogbnVsbCBhcyBzdHJpbmcgfCBudWxsLFxuICBvdmVycmlkZVRva2VuSWQ6ICcnIGFzIHN0cmluZyxcbiAgb3ZlcnJpZGVDb2xvcjogeyBsOiAwLjUsIGM6IDAuMSwgaDogMjQwLCBhbHBoYTogMSB9IGFzIE9rbGNoQ29sb3IsXG4gIG92ZXJyaWRlTW9kZTogJ2JvdGgnIGFzICdsaWdodCcgfCAnZGFyaycgfCAnYm90aCcsXG4gIHBlcnNpc3RPdmVycmlkZTogZmFsc2UsXG4gIGFjdGl2ZU1vZGU6IG51bGwgYXMgVGhlbWVNb2RlIHwgbnVsbCxcbiAgdG9rZW5GaWx0ZXI6ICcnLFxuICBob3ZlckFjdGl2ZTogZmFsc2UsXG4gIHBhZ2VJbmZvOiB7IHVybDogJycsIHRpdGxlOiAnJywgdGhlbWU6IG51bGwgYXMgc3RyaW5nIHwgbnVsbCB9XG59O1xuXG5jb25zdCBlbCA9IHtcbiAgc3RhdHVzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJpZGdlLXN0YXR1cycpIGFzIEhUTUxTcGFuRWxlbWVudCxcbiAgYnJpZGdlSW5wdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicmlkZ2UtdXJsJykgYXMgSFRNTElucHV0RWxlbWVudCxcbiAgYnJpZGdlQnRuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJpZGdlLWNvbm5lY3QnKSBhcyBIVE1MQnV0dG9uRWxlbWVudCxcbiAgbW9kZVN3aXRjaDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGUtc3dpdGNoJykgYXMgSFRNTEVsZW1lbnQsXG4gIHRhYnM6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCcudGFicyBidXR0b24nKSxcbiAgdGFiUGFuZWxzOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignW2RhdGEtdGFiLXBhbmVsXScpLFxuICBob3ZlclRvZ2dsZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvdmVyLXRvZ2dsZScpIGFzIEhUTUxJbnB1dEVsZW1lbnQsXG4gIGhvdmVyRGV0YWlsczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hvdmVyLWRldGFpbHMnKSBhcyBIVE1MRGl2RWxlbWVudCxcbiAgcGFnZUluZm86IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYWdlLWluZm8nKSBhcyBIVE1MRGl2RWxlbWVudCxcbiAgdG9rZW5GaWx0ZXI6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2tlbi1maWx0ZXInKSBhcyBIVE1MSW5wdXRFbGVtZW50LFxuICB0b2tlbkxpc3Q6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2tlbi1saXN0JykgYXMgSFRNTERpdkVsZW1lbnQsXG4gIGNsZWFySGlnaGxpZ2h0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2xlYXItaGlnaGxpZ2h0JykgYXMgSFRNTEJ1dHRvbkVsZW1lbnQsXG4gIHNjYW5Db3ZlcmFnZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NjYW4tY292ZXJhZ2UnKSBhcyBIVE1MQnV0dG9uRWxlbWVudCxcbiAgY292ZXJhZ2VTdW1tYXJ5OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY292ZXJhZ2Utc3VtbWFyeScpIGFzIEhUTUxTcGFuRWxlbWVudCxcbiAgY292ZXJhZ2VPdXRwdXQ6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb3ZlcmFnZS1vdXRwdXQnKSBhcyBIVE1MRGl2RWxlbWVudCxcbiAgc2NhbkNvbnRyYXN0OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2Nhbi1jb250cmFzdCcpIGFzIEhUTUxCdXR0b25FbGVtZW50LFxuICBjb250cmFzdFN1bW1hcnk6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250cmFzdC1zdW1tYXJ5JykgYXMgSFRNTFNwYW5FbGVtZW50LFxuICBjb250cmFzdE91dHB1dDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRyYXN0LW91dHB1dCcpIGFzIEhUTUxEaXZFbGVtZW50LFxuICBvdmVycmlkZVRva2VuOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3ZlcnJpZGUtdG9rZW4nKSBhcyBIVE1MU2VsZWN0RWxlbWVudCxcbiAgb3ZlcnJpZGVTbGlkZXJzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnb3ZlcnJpZGUtc2xpZGVycycpIGFzIEhUTUxEaXZFbGVtZW50LFxuICBvdmVycmlkZU1vZGU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvdmVycmlkZS1tb2RlJykgYXMgSFRNTFNlbGVjdEVsZW1lbnQsXG4gIG92ZXJyaWRlUGVyc2lzdDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ292ZXJyaWRlLXBlcnNpc3QnKSBhcyBIVE1MSW5wdXRFbGVtZW50LFxuICBjbGVhck92ZXJyaWRlczogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyLW92ZXJyaWRlcycpIGFzIEhUTUxCdXR0b25FbGVtZW50LFxuICBwdXNoT3ZlcnJpZGU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwdXNoLW92ZXJyaWRlJykgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbn07XG5cbi8vIC0tLSBNZXNzYWdpbmcgcmVsYXkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IHBvcnQgPSBjaHJvbWUucnVudGltZS5jb25uZWN0KHsgbmFtZTogcGFuZWxQb3J0TmFtZSh0YWJJZCkgfSk7XG5cbmZ1bmN0aW9uIHNlbmRUb0NvbnRlbnQocGF5bG9hZDogUGFuZWxUb0NvbnRlbnRNZXNzYWdlKTogdm9pZCB7XG4gIGNvbnN0IGVudmVsb3BlOiBQYW5lbE1lc3NhZ2VFbnZlbG9wZSA9IHsgc291cmNlOiAncGFuZWwnLCB0YWJJZCwgcGF5bG9hZCB9O1xuICBwb3J0LnBvc3RNZXNzYWdlKGVudmVsb3BlKTtcbn1cblxucG9ydC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UpID0+IHtcbiAgY29uc3QgZW52ZWxvcGUgPSBtZXNzYWdlIGFzIENvbnRlbnRNZXNzYWdlRW52ZWxvcGU7XG4gIGlmIChlbnZlbG9wZT8uc291cmNlICE9PSAnY29udGVudCcpIHJldHVybjtcbiAgaGFuZGxlQ29udGVudE1lc3NhZ2UoZW52ZWxvcGUucGF5bG9hZCk7XG59KTtcblxuZnVuY3Rpb24gaGFuZGxlQ29udGVudE1lc3NhZ2UobWVzc2FnZTogQ29udGVudFRvUGFuZWxNZXNzYWdlKTogdm9pZCB7XG4gIHN3aXRjaCAobWVzc2FnZS5raW5kKSB7XG4gICAgY2FzZSAnaGVsbG8nOlxuICAgIGNhc2UgJ3BhZ2UtaW5mbyc6XG4gICAgICBzdGF0ZS5wYWdlSW5mbyA9IHtcbiAgICAgICAgdXJsOiBtZXNzYWdlLnVybCxcbiAgICAgICAgdGl0bGU6IG1lc3NhZ2UudGl0bGUsXG4gICAgICAgIHRoZW1lOiAndGhlbWUnIGluIG1lc3NhZ2UgPyBtZXNzYWdlLnRoZW1lIDogbnVsbFxuICAgICAgfTtcbiAgICAgIHJlbmRlclBhZ2VJbmZvKCk7XG4gICAgICBwdXNoU25hcHNob3RUb0NvbnRlbnQoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2hvdmVyLWVsZW1lbnQnOlxuICAgICAgcmVuZGVySG92ZXJEZXRhaWxzKG1lc3NhZ2UucGF5bG9hZCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdob3Zlci1jbGVhcmVkJzpcbiAgICAgIHJlbmRlckhvdmVyRGV0YWlscyhudWxsKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NvdmVyYWdlLXJlcG9ydCc6XG4gICAgICBzdGF0ZS5jb3ZlcmFnZSA9IG1lc3NhZ2UucmVwb3J0O1xuICAgICAgcmVuZGVyQ292ZXJhZ2UoKTtcbiAgICAgIHJlbmRlclRva2VuTGlzdCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY29udHJhc3QtcmVwb3J0JzpcbiAgICAgIHJlbmRlckNvbnRyYXN0KG1lc3NhZ2UucmVwb3J0KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgIGNvbnNvbGUud2FybignW3NlbWFudGljLWNvbG9yc10gY29udGVudCBlcnJvcjonLCBtZXNzYWdlLm1lc3NhZ2UpO1xuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuLy8gLS0tIEJyaWRnZSBjb25uZWN0aW9uIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgYnJpZGdlID0gbmV3IEJyaWRnZUNsaWVudCh7XG4gIGdldEJhc2VVcmw6ICgpID0+IHN0YXRlLmJyaWRnZVVybCxcbiAgb25TdGF0dXM6IHNldENvbm5lY3Rpb25TdGF0dXMsXG4gIG9uU25hcHNob3Q6IChzbmFwc2hvdCkgPT4ge1xuICAgIHN0YXRlLnNuYXBzaG90ID0gc25hcHNob3Q7XG4gICAgcmVuZGVyQWxsKCk7XG4gICAgcHVzaFNuYXBzaG90VG9Db250ZW50KCk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBzZXRDb25uZWN0aW9uU3RhdHVzKHN0YXR1czogQnJpZGdlU3RhdHVzLCBkZXRhaWw/OiBzdHJpbmcpOiB2b2lkIHtcbiAgZWwuc3RhdHVzLmNsYXNzTmFtZSA9IGBzdGF0dXMgc3RhdHVzLSR7c3RhdHVzfWA7XG4gIGVsLnN0YXR1cy50ZXh0Q29udGVudCA9IGRldGFpbCA/IGAke3N0YXR1c30gXHUwMEI3ICR7ZGV0YWlsfWAgOiBzdGF0dXM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRCcmlkZ2VVcmwoKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RvcmVkID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtTVE9SQUdFX0tFWVMuYnJpZGdlVXJsXSk7XG4gICAgY29uc3QgdmFsdWUgPSBzdG9yZWRbU1RPUkFHRV9LRVlTLmJyaWRnZVVybF07XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUudHJpbSgpKSB7XG4gICAgICBzdGF0ZS5icmlkZ2VVcmwgPSB2YWx1ZS50cmltKCk7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBmYWxsIHRocm91Z2ggdG8gZGVmYXVsdFxuICB9XG4gIGVsLmJyaWRnZUlucHV0LnZhbHVlID0gc3RhdGUuYnJpZGdlVXJsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwZXJzaXN0QnJpZGdlVXJsKHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3RhdGUuYnJpZGdlVXJsID0gdmFsdWU7XG4gIHRyeSB7XG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5icmlkZ2VVcmxdOiB2YWx1ZSB9KTtcbiAgfSBjYXRjaCB7XG4gICAgLy8gaWdub3JlXG4gIH1cbn1cblxuLy8gLS0tIFRhYnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZWwudGFicy5mb3JFYWNoKChidG4pID0+IHtcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIGNvbnN0IGlkID0gYnRuLmRhdGFzZXQudGFiO1xuICAgIGlmICghaWQpIHJldHVybjtcbiAgICBlbC50YWJzLmZvckVhY2goKG90aGVyKSA9PiBvdGhlci5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnLCBvdGhlciA9PT0gYnRuKSk7XG4gICAgZWwudGFiUGFuZWxzLmZvckVhY2goKHBhbmVsKSA9PiB7XG4gICAgICBwYW5lbC5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnLCBwYW5lbC5kYXRhc2V0LnRhYlBhbmVsID09PSBpZCk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vIC0tLSBNb2RlIHN3aXRjaCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmVsLm1vZGVTd2l0Y2gucXVlcnlTZWxlY3RvckFsbDxIVE1MQnV0dG9uRWxlbWVudD4oJ2J1dHRvbicpLmZvckVhY2goKGJ0bikgPT4ge1xuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgZWwubW9kZVN3aXRjaFxuICAgICAgLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCdidXR0b24nKVxuICAgICAgLmZvckVhY2goKGIpID0+IGIuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtYWN0aXZlJywgYiA9PT0gYnRuKSk7XG4gICAgY29uc3QgcmF3ID0gYnRuLmRhdGFzZXQubW9kZSA/PyAnbnVsbCc7XG4gICAgY29uc3QgbW9kZSA9IHJhdyA9PT0gJ251bGwnID8gbnVsbCA6IChyYXcgYXMgVGhlbWVNb2RlKTtcbiAgICBzdGF0ZS5hY3RpdmVNb2RlID0gbW9kZTtcbiAgICBzZW5kVG9Db250ZW50KHsga2luZDogJ3NldC10aGVtZScsIG1vZGUgfSk7XG4gICAgcHVzaFNuYXBzaG90VG9Db250ZW50KCk7XG4gIH0pO1xufSk7XG5cbi8vIC0tLSBIb3ZlciAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmVsLmhvdmVyVG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgc3RhdGUuaG92ZXJBY3RpdmUgPSBlbC5ob3ZlclRvZ2dsZS5jaGVja2VkO1xuICBzZW5kVG9Db250ZW50KHsga2luZDogJ2hvdmVyLWluc3BlY3RvcicsIGVuYWJsZWQ6IHN0YXRlLmhvdmVyQWN0aXZlIH0pO1xufSk7XG5cbi8vIC0tLSBUb2tlbiBsaXN0IC8gaGlnaGxpZ2h0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZWwudG9rZW5GaWx0ZXIuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gIHN0YXRlLnRva2VuRmlsdGVyID0gZWwudG9rZW5GaWx0ZXIudmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgcmVuZGVyVG9rZW5MaXN0KCk7XG59KTtcblxuZWwuY2xlYXJIaWdobGlnaHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gIHN0YXRlLmhpZ2hsaWdodGVkVG9rZW4gPSBudWxsO1xuICBzZW5kVG9Db250ZW50KHsga2luZDogJ2hpZ2hsaWdodC10b2tlbicsIHRva2VuSWQ6IG51bGwgfSk7XG4gIHJlbmRlclRva2VuTGlzdCgpO1xufSk7XG5cbi8vIC0tLSBDb3ZlcmFnZSArIENvbnRyYXN0IHNjYW5zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmVsLnNjYW5Db3ZlcmFnZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgaWYgKCFzdGF0ZS5zbmFwc2hvdCkgcmV0dXJuO1xuICBlbC5jb3ZlcmFnZVN1bW1hcnkudGV4dENvbnRlbnQgPSAnU2Nhbm5pbmcuLi4nO1xuICBzZW5kVG9Db250ZW50KHtcbiAgICBraW5kOiAnc2Nhbi1jb3ZlcmFnZScsXG4gICAgdG9rZW5Db2xvcnM6IHNuYXBzaG90VG9rZW5Dc3MoKSxcbiAgICBhbGlhc2VzOiBzdGF0ZS5zbmFwc2hvdC5tYW5pZmVzdC5hbGlhc2VzXG4gIH0pO1xufSk7XG5cbmVsLnNjYW5Db250cmFzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgaWYgKCFzdGF0ZS5zbmFwc2hvdCkgcmV0dXJuO1xuICBlbC5jb250cmFzdFN1bW1hcnkudGV4dENvbnRlbnQgPSAnQXVkaXRpbmcuLi4nO1xuICBzZW5kVG9Db250ZW50KHtcbiAgICBraW5kOiAnc2Nhbi1jb250cmFzdCcsXG4gICAgdG9rZW5Db2xvcnM6IHNuYXBzaG90VG9rZW5Dc3MoKSxcbiAgICBhbGlhc2VzOiBzdGF0ZS5zbmFwc2hvdC5tYW5pZmVzdC5hbGlhc2VzXG4gIH0pO1xufSk7XG5cbi8vIC0tLSBPdmVycmlkZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmVsLm92ZXJyaWRlVG9rZW4uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICBzdGF0ZS5vdmVycmlkZVRva2VuSWQgPSBlbC5vdmVycmlkZVRva2VuLnZhbHVlO1xuICBzeW5jT3ZlcnJpZGVGcm9tU25hcHNob3QoKTtcbiAgcmVuZGVyT3ZlcnJpZGVTbGlkZXJzKCk7XG59KTtcblxuZWwub3ZlcnJpZGVNb2RlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgc3RhdGUub3ZlcnJpZGVNb2RlID0gZWwub3ZlcnJpZGVNb2RlLnZhbHVlIGFzIHR5cGVvZiBzdGF0ZS5vdmVycmlkZU1vZGU7XG59KTtcblxuZWwub3ZlcnJpZGVQZXJzaXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgc3RhdGUucGVyc2lzdE92ZXJyaWRlID0gZWwub3ZlcnJpZGVQZXJzaXN0LmNoZWNrZWQ7XG59KTtcblxuZWwuY2xlYXJPdmVycmlkZXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gIHNlbmRUb0NvbnRlbnQoeyBraW5kOiAnY2xlYXItYWxsLW92ZXJyaWRlcycgfSk7XG59KTtcblxuZWwucHVzaE92ZXJyaWRlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuICBpZiAoIXN0YXRlLm92ZXJyaWRlVG9rZW5JZCkgcmV0dXJuO1xuICB0cnkge1xuICAgIGF3YWl0IGJyaWRnZS5wdXNoT3ZlcnJpZGUoc3RhdGUub3ZlcnJpZGVUb2tlbklkLCBzdGF0ZS5vdmVycmlkZU1vZGUsIHN0YXRlLm92ZXJyaWRlQ29sb3IsIHtcbiAgICAgIHBlcnNpc3Q6IHN0YXRlLnBlcnNpc3RPdmVycmlkZVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNldENvbm5lY3Rpb25TdGF0dXMoJ2Vycm9yJywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAncHVzaCBmYWlsZWQnKTtcbiAgfVxufSk7XG5cbi8vIC0tLSBCcmlkZ2UgY29ubmVjdCBidXR0b24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmVsLmJyaWRnZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgaW5wdXQgPSBlbC5icmlkZ2VJbnB1dC52YWx1ZS50cmltKCk7XG4gIGlmICghaW5wdXQpIHJldHVybjtcbiAgYXdhaXQgcGVyc2lzdEJyaWRnZVVybChpbnB1dCk7XG4gIGJyaWRnZS5zdG9wKCk7XG4gIGJyaWRnZS5zdGFydCgpO1xufSk7XG5cbi8vIC0tLSBSZW5kZXJpbmcgaGVscGVycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIHNuYXBzaG90VG9rZW5Dc3MoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gIGlmICghc3RhdGUuc25hcHNob3QpIHJldHVybiB7fTtcbiAgY29uc3QgbW9kZSA9IHJlc29sdmVkTW9kZUZvclByZXZpZXcoKTtcbiAgY29uc3QgcmVzb2x2ZWQgPSBzdGF0ZS5zbmFwc2hvdC5yZXNvbHZlZFttb2RlXTtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGZvciAoY29uc3QgW3Rva2VuSWQsIHBheWxvYWRdIG9mIE9iamVjdC5lbnRyaWVzKHJlc29sdmVkLmNvbG9ycykpIHtcbiAgICBvdXRbdG9rZW5JZF0gPSBwYXlsb2FkLmNzcztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiByZXNvbHZlZE1vZGVGb3JQcmV2aWV3KCk6IFRoZW1lTW9kZSB7XG4gIGlmIChzdGF0ZS5hY3RpdmVNb2RlKSByZXR1cm4gc3RhdGUuYWN0aXZlTW9kZTtcbiAgaWYgKHN0YXRlLnBhZ2VJbmZvLnRoZW1lID09PSAnZGFyaycgfHwgc3RhdGUucGFnZUluZm8udGhlbWUgPT09ICdhbHQnKVxuICAgIHJldHVybiBzdGF0ZS5wYWdlSW5mby50aGVtZTtcbiAgcmV0dXJuICdsaWdodCc7XG59XG5cbmZ1bmN0aW9uIHB1c2hTbmFwc2hvdFRvQ29udGVudCgpOiB2b2lkIHtcbiAgaWYgKCFzdGF0ZS5zbmFwc2hvdCkgcmV0dXJuO1xuICBzZW5kVG9Db250ZW50KHsga2luZDogJ3VwZGF0ZS1zbmFwc2hvdCcsIHNuYXBzaG90OiBzdGF0ZS5zbmFwc2hvdCB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQWxsKCk6IHZvaWQge1xuICByZW5kZXJUb2tlbkxpc3QoKTtcbiAgcmVuZGVyT3ZlcnJpZGVUb2tlbk9wdGlvbnMoKTtcbiAgaWYgKCFzdGF0ZS5vdmVycmlkZVRva2VuSWQgJiYgc3RhdGUuc25hcHNob3QpIHtcbiAgICBzdGF0ZS5vdmVycmlkZVRva2VuSWQgPSBPYmplY3Qua2V5cyhzdGF0ZS5zbmFwc2hvdC5tYW5pZmVzdC50b2tlbnMpWzBdID8/ICcnO1xuICAgIHN5bmNPdmVycmlkZUZyb21TbmFwc2hvdCgpO1xuICB9XG4gIHJlbmRlck92ZXJyaWRlU2xpZGVycygpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJQYWdlSW5mbygpOiB2b2lkIHtcbiAgZWwucGFnZUluZm8udGV4dENvbnRlbnQgPSBzdGF0ZS5wYWdlSW5mby51cmxcbiAgICA/IGBJbnNwZWN0aW5nOiAke3N0YXRlLnBhZ2VJbmZvLnRpdGxlIHx8ICcodW50aXRsZWQpJ30gXHUyMDE0ICR7c3RhdGUucGFnZUluZm8udXJsfSBcdTAwQjcgZGF0YS10aGVtZT0ke3N0YXRlLnBhZ2VJbmZvLnRoZW1lID8/ICcobm9uZSknfWBcbiAgICA6ICdXYWl0aW5nIGZvciBpbnNwZWN0ZWQgcGFnZSB0byBsb2FkLi4uJztcbn1cblxuZnVuY3Rpb24gcmVuZGVySG92ZXJEZXRhaWxzKHBheWxvYWQ6IEhvdmVyRWxlbWVudFBheWxvYWQgfCBudWxsKTogdm9pZCB7XG4gIGlmICghcGF5bG9hZCkge1xuICAgIGVsLmhvdmVyRGV0YWlscy5pbm5lckhUTUwgPVxuICAgICAgJzxwIGNsYXNzPVwicGxhY2Vob2xkZXJcIj5Nb3ZlIHlvdXIgbW91c2Ugb3ZlciB0aGUgaW5zcGVjdGVkIHBhZ2UgdG8gcmVhZCBsaXZlIHRva2VuIGluZm8uPC9wPic7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc3dhdGNoID0gKGNvbG9yOiBzdHJpbmcgfCBudWxsKSA9PlxuICAgIGNvbG9yID8gYDxzcGFuIGNsYXNzPVwic3dhdGNoXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiR7Y29sb3J9XCI+PC9zcGFuPmAgOiAnJztcblxuICBjb25zdCBjb250cmFzdCA9IHBheWxvYWQuY29udHJhc3RMYyA9PT0gbnVsbCA/ICdcdTIwMTQnIDogYCR7cGF5bG9hZC5jb250cmFzdExjLnRvRml4ZWQoMSl9IExjYDtcbiAgY29uc3QgYWxpYXMgPSBwYXlsb2FkLmFsaWFzQ2hhaW4ubGVuZ3RoID8gcGF5bG9hZC5hbGlhc0NoYWluLmpvaW4oJywgJykgOiAnXHUyMDE0JztcbiAgY29uc3QgdG9rZW4gPSBwYXlsb2FkLm1hdGNoZWRUb2tlblxuICAgID8gYCR7cGF5bG9hZC5tYXRjaGVkVG9rZW59IDxzcGFuIGNsYXNzPVwibWV0YVwiPigke3BheWxvYWQubWF0Y2hlZFRva2VuQ2hhbm5lbCA/PyAnXHUyMDE0J30pPC9zcGFuPmBcbiAgICA6ICc8ZW0+bm8gdG9rZW4gbWF0Y2g8L2VtPic7XG5cbiAgZWwuaG92ZXJEZXRhaWxzLmlubmVySFRNTCA9IGBcbiAgICA8ZGwgY2xhc3M9XCJob3Zlci1ncmlkXCI+XG4gICAgICA8ZHQ+RWxlbWVudDwvZHQ+PGRkPjxjb2RlPiR7ZXNjYXBlSHRtbChwYXlsb2FkLnNlbGVjdG9yKX08L2NvZGU+PC9kZD5cbiAgICAgIDxkdD5Ub2tlbjwvZHQ+PGRkPiR7dG9rZW59PC9kZD5cbiAgICAgIDxkdD5BbGlhczwvZHQ+PGRkPiR7ZXNjYXBlSHRtbChhbGlhcyl9PC9kZD5cbiAgICAgIDxkdD5Db2xvcjwvZHQ+PGRkIGNsYXNzPVwic3dhdGNoLXJvd1wiPiR7c3dhdGNoKHBheWxvYWQuY29tcHV0ZWRDb2xvcil9IDxjb2RlPiR7ZXNjYXBlSHRtbChwYXlsb2FkLmNvbXB1dGVkQ29sb3IgPz8gJ1x1MjAxNCcpfTwvY29kZT48L2RkPlxuICAgICAgPGR0PkJhY2tncm91bmQ8L2R0PjxkZCBjbGFzcz1cInN3YXRjaC1yb3dcIj4ke3N3YXRjaChwYXlsb2FkLmNvbXB1dGVkQmFja2dyb3VuZCl9IDxjb2RlPiR7ZXNjYXBlSHRtbChwYXlsb2FkLmNvbXB1dGVkQmFja2dyb3VuZCA/PyAnXHUyMDE0Jyl9PC9jb2RlPjwvZGQ+XG4gICAgICA8ZHQ+QVBDQTwvZHQ+PGRkPiR7Y29udHJhc3R9PC9kZD5cbiAgICA8L2RsPlxuICBgO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIChjaCkgPT4ge1xuICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgIGNhc2UgJyYnOlxuICAgICAgICByZXR1cm4gJyZhbXA7JztcbiAgICAgIGNhc2UgJzwnOlxuICAgICAgICByZXR1cm4gJyZsdDsnO1xuICAgICAgY2FzZSAnPic6XG4gICAgICAgIHJldHVybiAnJmd0Oyc7XG4gICAgICBjYXNlICdcIic6XG4gICAgICAgIHJldHVybiAnJnF1b3Q7JztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiAnJiMzOTsnO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRva2VuTGlzdCgpOiB2b2lkIHtcbiAgaWYgKCFzdGF0ZS5zbmFwc2hvdCkge1xuICAgIGVsLnRva2VuTGlzdC5pbm5lckhUTUwgPSAnPHAgY2xhc3M9XCJwbGFjZWhvbGRlclwiPkNvbm5lY3QgdG8gdGhlIGVuZ2luZSB0byBsb2FkIHRva2Vucy48L3A+JztcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBtb2RlID0gcmVzb2x2ZWRNb2RlRm9yUHJldmlldygpO1xuICBjb25zdCByZXNvbHZlZCA9IHN0YXRlLnNuYXBzaG90LnJlc29sdmVkW21vZGVdO1xuICBjb25zdCBmaWx0ZXIgPSBzdGF0ZS50b2tlbkZpbHRlcjtcblxuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBncm91cCBvZiBzdGF0ZS5zbmFwc2hvdC50b2tlbkdyb3Vwcykge1xuICAgIGNvbnN0IGlkcyA9IChzdGF0ZS5zbmFwc2hvdC50b2tlbnNCeUdyb3VwW2dyb3VwXSA/PyBbXSkuZmlsdGVyKChpZCkgPT4gaWQuaW5jbHVkZXMoZmlsdGVyKSk7XG4gICAgaWYgKCFpZHMubGVuZ3RoKSBjb250aW51ZTtcbiAgICBwYXJ0cy5wdXNoKGA8ZGl2IGNsYXNzPVwidG9rZW4tZ3JvdXAtaGVhZGluZ1wiPiR7ZXNjYXBlSHRtbChncm91cCl9PC9kaXY+YCk7XG4gICAgZm9yIChjb25zdCB0b2tlbklkIG9mIGlkcykge1xuICAgICAgY29uc3QgdG9rZW4gPSBzdGF0ZS5zbmFwc2hvdC5tYW5pZmVzdC50b2tlbnNbdG9rZW5JZF07XG4gICAgICBpZiAoIXRva2VuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNvbG9yID0gcmVzb2x2ZWQuY29sb3JzW3Rva2VuSWRdPy5jc3MgPz8gJyc7XG4gICAgICBjb25zdCBjb3VudCA9IHN0YXRlLmNvdmVyYWdlPy5ieVRva2VuW3Rva2VuSWRdO1xuICAgICAgY29uc3QgaGlnaGxpZ2h0ZWQgPSBzdGF0ZS5oaWdobGlnaHRlZFRva2VuID09PSB0b2tlbklkID8gJyBpcy1oaWdobGlnaHRlZCcgOiAnJztcbiAgICAgIHBhcnRzLnB1c2goXG4gICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidG9rZW4tcm93JHtoaWdobGlnaHRlZH1cIiBkYXRhLXRva2VuLWlkPVwiJHt0b2tlbklkfVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3dhdGNoXCIgc3R5bGU9XCJiYWNrZ3JvdW5kOiR7Y29sb3J9XCI+PC9zcGFuPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9rZW4tbmFtZVwiPiR7ZXNjYXBlSHRtbCh0b2tlbi5sYWJlbCl9PC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9rZW4tdmFsdWVcIj4ke3Rva2VuSWR9IFx1MDBCNyAke2VzY2FwZUh0bWwoY29sb3IpfTwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidG9rZW4tY291bnRcIj4ke2NvdW50ID09PSB1bmRlZmluZWQgPyAnXHUwMEI3JyA6IGAke2NvdW50fSB1c2VkYH08L3NwYW4+XG4gICAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+XHUyMDNBPC9zcGFuPlxuICAgICAgICA8L2J1dHRvbj5gXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGVsLnRva2VuTGlzdC5pbm5lckhUTUwgPSBwYXJ0cy5qb2luKCcnKTtcblxuICBlbC50b2tlbkxpc3QucXVlcnlTZWxlY3RvckFsbDxIVE1MQnV0dG9uRWxlbWVudD4oJy50b2tlbi1yb3cnKS5mb3JFYWNoKChyb3cpID0+IHtcbiAgICByb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBjb25zdCBpZCA9IHJvdy5kYXRhc2V0LnRva2VuSWQgPz8gbnVsbDtcbiAgICAgIGlmICghaWQpIHJldHVybjtcbiAgICAgIHN0YXRlLmhpZ2hsaWdodGVkVG9rZW4gPSBzdGF0ZS5oaWdobGlnaHRlZFRva2VuID09PSBpZCA/IG51bGwgOiBpZDtcbiAgICAgIHNlbmRUb0NvbnRlbnQoeyBraW5kOiAnaGlnaGxpZ2h0LXRva2VuJywgdG9rZW5JZDogc3RhdGUuaGlnaGxpZ2h0ZWRUb2tlbiB9KTtcbiAgICAgIHJlbmRlclRva2VuTGlzdCgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQ292ZXJhZ2UoKTogdm9pZCB7XG4gIGNvbnN0IGNvdmVyYWdlID0gc3RhdGUuY292ZXJhZ2U7XG4gIGlmICghY292ZXJhZ2UpIHtcbiAgICBlbC5jb3ZlcmFnZU91dHB1dC5pbm5lckhUTUwgPSAnPHAgY2xhc3M9XCJwbGFjZWhvbGRlclwiPlJ1biBhIHNjYW4gdG8gc2VlIHRva2VuIHVzYWdlLjwvcD4nO1xuICAgIGVsLmNvdmVyYWdlU3VtbWFyeS50ZXh0Q29udGVudCA9ICcnO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHVzZWQgPSBPYmplY3QuZW50cmllcyhjb3ZlcmFnZS5ieVRva2VuKS5maWx0ZXIoKFssIG5dKSA9PiBuID4gMCkubGVuZ3RoO1xuICBjb25zdCB0b3RhbCA9IE9iamVjdC5rZXlzKGNvdmVyYWdlLmJ5VG9rZW4pLmxlbmd0aDtcbiAgZWwuY292ZXJhZ2VTdW1tYXJ5LnRleHRDb250ZW50ID0gYCR7Y292ZXJhZ2UudG90YWxFbGVtZW50c30gZWxlbWVudHMgXHUwMEI3ICR7dXNlZH0vJHt0b3RhbH0gdG9rZW5zIHVzZWQgXHUwMEI3ICR7Y292ZXJhZ2UucmF3Q29sb3JWaW9sYXRpb25zLmxlbmd0aH0gcmF3IGNvbG9yc2A7XG5cbiAgY29uc3QgdG9wID0gWy4uLk9iamVjdC5lbnRyaWVzKGNvdmVyYWdlLmJ5VG9rZW4pXVxuICAgIC5maWx0ZXIoKFssIG5dKSA9PiBuID4gMClcbiAgICAuc29ydCgoYSwgYikgPT4gYlsxXSAtIGFbMV0pXG4gICAgLnNsaWNlKDAsIDIwKTtcblxuICBjb25zdCB1bnVzZWQgPSBjb3ZlcmFnZS51bnVzZWRUb2tlbnMuc2xpY2UoMCwgMjApO1xuICBjb25zdCB2aW9sYXRpb25zID0gY292ZXJhZ2UucmF3Q29sb3JWaW9sYXRpb25zLnNsaWNlKDAsIDIwKTtcblxuICBlbC5jb3ZlcmFnZU91dHB1dC5pbm5lckhUTUwgPSBgXG4gICAgPHAgY2xhc3M9XCJyZXBvcnQtc3ViaGVhZFwiPk1vc3QgdXNlZCB0b2tlbnM8L3A+XG4gICAgPGRpdiBjbGFzcz1cInJlcG9ydC1saXN0XCI+XG4gICAgICAke3RvcFxuICAgICAgICAubWFwKFxuICAgICAgICAgIChbdG9rZW5JZCwgY291bnRdKSA9PlxuICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJyZXBvcnQtaXRlbVwiPjxzcGFuPiR7ZXNjYXBlSHRtbCh0b2tlbklkKX08L3NwYW4+PHNwYW4gY2xhc3M9XCJtZXRhXCI+JHtjb3VudH0gZWxlbWVudHM8L3NwYW4+PHNwYW4+PC9zcGFuPjwvZGl2PmBcbiAgICAgICAgKVxuICAgICAgICAuam9pbignJyl9XG4gICAgPC9kaXY+XG4gICAgPHAgY2xhc3M9XCJyZXBvcnQtc3ViaGVhZFwiPlVudXNlZCB0b2tlbnMgKCR7dW51c2VkLmxlbmd0aH0pPC9wPlxuICAgIDxkaXYgY2xhc3M9XCJyZXBvcnQtbGlzdFwiPlxuICAgICAgJHt1bnVzZWQubWFwKChpZCkgPT4gYDxkaXYgY2xhc3M9XCJyZXBvcnQtaXRlbVwiPjxzcGFuPiR7ZXNjYXBlSHRtbChpZCl9PC9zcGFuPjxzcGFuIGNsYXNzPVwibWV0YVwiPjA8L3NwYW4+PHNwYW4+PC9zcGFuPjwvZGl2PmApLmpvaW4oJycpfVxuICAgIDwvZGl2PlxuICAgIDxwIGNsYXNzPVwicmVwb3J0LXN1YmhlYWRcIj5SYXcgY29sb3IgdmlvbGF0aW9ucyAoJHt2aW9sYXRpb25zLmxlbmd0aH0pPC9wPlxuICAgIDxkaXYgY2xhc3M9XCJyZXBvcnQtbGlzdFwiPlxuICAgICAgJHt2aW9sYXRpb25zXG4gICAgICAgIC5tYXAoXG4gICAgICAgICAgKHYpID0+XG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInJlcG9ydC1pdGVtIHNldmVyaXR5LXdhcm5cIj48c3Bhbj48Y29kZT4ke2VzY2FwZUh0bWwodi5zZWxlY3Rvcil9PC9jb2RlPjwvc3Bhbj48c3BhbiBjbGFzcz1cIm1ldGFcIj4ke2VzY2FwZUh0bWwodi5wcm9wZXJ0eSl9OiAke2VzY2FwZUh0bWwodi52YWx1ZSl9PC9zcGFuPjxzcGFuPjwvc3Bhbj48L2Rpdj5gXG4gICAgICAgIClcbiAgICAgICAgLmpvaW4oJycpfVxuICAgIDwvZGl2PlxuICBgO1xufVxuXG5mdW5jdGlvbiByZW5kZXJDb250cmFzdChyZXBvcnQ6IENvbnRyYXN0UmVwb3J0KTogdm9pZCB7XG4gIGVsLmNvbnRyYXN0U3VtbWFyeS50ZXh0Q29udGVudCA9IGAke3JlcG9ydC5zYW1wbGVkfSBzYW1wbGVkIFx1MDBCNyAke3JlcG9ydC5maW5kaW5ncy5sZW5ndGh9IHBvdGVudGlhbCBmYWlsdXJlc2A7XG4gIGlmICghcmVwb3J0LmZpbmRpbmdzLmxlbmd0aCkge1xuICAgIGVsLmNvbnRyYXN0T3V0cHV0LmlubmVySFRNTCA9XG4gICAgICAnPHAgY2xhc3M9XCJwbGFjZWhvbGRlclwiPk5vIEFQQ0EgZmFpbHVyZXMgZGV0ZWN0ZWQgaW4gdGhlIHNhbXBsZWQgdGV4dCBlbGVtZW50cy48L3A+JztcbiAgICByZXR1cm47XG4gIH1cblxuICBlbC5jb250cmFzdE91dHB1dC5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBjbGFzcz1cInJlcG9ydC1saXN0XCI+XG4gICAgICAke3JlcG9ydC5maW5kaW5nc1xuICAgICAgICAubWFwKFxuICAgICAgICAgIChmaW5kaW5nKSA9PiBgXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInJlcG9ydC1pdGVtIHNldmVyaXR5LSR7ZmluZGluZy5zZXZlcml0eX1cIj5cbiAgICAgICAgICAgIDxzcGFuPlxuICAgICAgICAgICAgICA8Y29kZT4ke2VzY2FwZUh0bWwoZmluZGluZy5zZWxlY3Rvcil9PC9jb2RlPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWV0YVwiPiR7ZXNjYXBlSHRtbChmaW5kaW5nLmNvbnRleHQgfHwgJ1x1MjAxNCcpfTwvZGl2PlxuICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJtZXRhXCI+XG4gICAgICAgICAgICAgIGZnICR7ZXNjYXBlSHRtbChmaW5kaW5nLmZvcmVncm91bmRUb2tlbiA/PyBmaW5kaW5nLmZvcmVncm91bmQpfVxuICAgICAgICAgICAgICBcdTAwQjcgYmcgJHtlc2NhcGVIdG1sKGZpbmRpbmcuYmFja2dyb3VuZFRva2VuID8/IGZpbmRpbmcuYmFja2dyb3VuZCl9XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm1ldGFcIj4ke2ZpbmRpbmcuY29udHJhc3RMYy50b0ZpeGVkKDEpfSBMYzwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYFxuICAgICAgICApXG4gICAgICAgIC5qb2luKCcnKX1cbiAgICA8L2Rpdj5cbiAgYDtcbn1cblxuLy8gLS0tIE92ZXJyaWRlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gcmVuZGVyT3ZlcnJpZGVUb2tlbk9wdGlvbnMoKTogdm9pZCB7XG4gIGlmICghc3RhdGUuc25hcHNob3QpIHJldHVybjtcbiAgY29uc3QgdG9rZW5zID0gT2JqZWN0LnZhbHVlcyhzdGF0ZS5zbmFwc2hvdC5tYW5pZmVzdC50b2tlbnMpIGFzIFRva2VuUmVjb3JkW107XG4gIGVsLm92ZXJyaWRlVG9rZW4uaW5uZXJIVE1MID0gdG9rZW5zXG4gICAgLm1hcCgodG9rZW4pID0+IGA8b3B0aW9uIHZhbHVlPVwiJHt0b2tlbi5pZH1cIj4ke2VzY2FwZUh0bWwodG9rZW4ubGFiZWwpfSAoJHt0b2tlbi5pZH0pPC9vcHRpb24+YClcbiAgICAuam9pbignJyk7XG4gIGlmIChzdGF0ZS5vdmVycmlkZVRva2VuSWQpIGVsLm92ZXJyaWRlVG9rZW4udmFsdWUgPSBzdGF0ZS5vdmVycmlkZVRva2VuSWQ7XG59XG5cbmZ1bmN0aW9uIHN5bmNPdmVycmlkZUZyb21TbmFwc2hvdCgpOiB2b2lkIHtcbiAgaWYgKCFzdGF0ZS5zbmFwc2hvdCB8fCAhc3RhdGUub3ZlcnJpZGVUb2tlbklkKSByZXR1cm47XG4gIGNvbnN0IHRva2VuID0gc3RhdGUuc25hcHNob3QubWFuaWZlc3QudG9rZW5zW3N0YXRlLm92ZXJyaWRlVG9rZW5JZF07XG4gIGlmICghdG9rZW4pIHJldHVybjtcbiAgY29uc3QgbW9kZSA9IHJlc29sdmVkTW9kZUZvclByZXZpZXcoKTtcbiAgc3RhdGUub3ZlcnJpZGVDb2xvciA9IHsgLi4uKG1vZGUgPT09ICdkYXJrJyA/IHRva2VuLmRhcmsgOiB0b2tlbi5saWdodCkgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyT3ZlcnJpZGVTbGlkZXJzKCk6IHZvaWQge1xuICBjb25zdCBjb2xvciA9IHN0YXRlLm92ZXJyaWRlQ29sb3I7XG4gIGNvbnN0IGNoYW5uZWxzOiBBcnJheTx7XG4gICAga2V5OiAnbCcgfCAnYycgfCAnaCc7XG4gICAgbGFiZWw6IHN0cmluZztcbiAgICBtaW46IG51bWJlcjtcbiAgICBtYXg6IG51bWJlcjtcbiAgICBzdGVwOiBudW1iZXI7XG4gIH0+ID0gW1xuICAgIHsga2V5OiAnbCcsIGxhYmVsOiAnTCcsIG1pbjogMCwgbWF4OiAxLCBzdGVwOiAwLjAwMSB9LFxuICAgIHsga2V5OiAnYycsIGxhYmVsOiAnQycsIG1pbjogMCwgbWF4OiAwLjQsIHN0ZXA6IDAuMDAxIH0sXG4gICAgeyBrZXk6ICdoJywgbGFiZWw6ICdIJywgbWluOiAwLCBtYXg6IDM2MCwgc3RlcDogMC4xIH1cbiAgXTtcblxuICBjb25zdCBwcmV2aWV3ID0gb2tsY2hUb0Nzcyhjb2xvcik7XG4gIGVsLm92ZXJyaWRlU2xpZGVycy5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBjbGFzcz1cIm92ZXJyaWRlLXByZXZpZXdcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3LXN3YXRjaFwiIHN0eWxlPVwiYmFja2dyb3VuZDoke3ByZXZpZXd9XCI+PC9kaXY+XG4gICAgICA8Y29kZT4ke2VzY2FwZUh0bWwoZm9ybWF0T2tsY2goY29sb3IpKX08L2NvZGU+XG4gICAgPC9kaXY+XG4gICAgJHtjaGFubmVsc1xuICAgICAgLm1hcChcbiAgICAgICAgKGNoKSA9PiBgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzbGlkZXItcm93XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJjaGFubmVsXCI+JHtjaC5sYWJlbH08L3NwYW4+XG4gICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIG1pbj1cIiR7Y2gubWlufVwiIG1heD1cIiR7Y2gubWF4fVwiIHN0ZXA9XCIke2NoLnN0ZXB9XCIgdmFsdWU9XCIke2NvbG9yW2NoLmtleV19XCIgZGF0YS1jaGFubmVsPVwiJHtjaC5rZXl9XCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInJlYWRvdXRcIj4ke2NvbG9yW2NoLmtleV0udG9GaXhlZChjaC5rZXkgPT09ICdoJyA/IDIgOiAzKX08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgYFxuICAgICAgKVxuICAgICAgLmpvaW4oJycpfVxuICBgO1xuXG4gIGVsLm92ZXJyaWRlU2xpZGVycy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxJbnB1dEVsZW1lbnQ+KCdpbnB1dFt0eXBlPXJhbmdlXScpLmZvckVhY2goKGlucHV0KSA9PiB7XG4gICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBjaGFubmVsID0gaW5wdXQuZGF0YXNldC5jaGFubmVsIGFzICdsJyB8ICdjJyB8ICdoJztcbiAgICAgIHN0YXRlLm92ZXJyaWRlQ29sb3IgPSB7IC4uLnN0YXRlLm92ZXJyaWRlQ29sb3IsIFtjaGFubmVsXTogTnVtYmVyKGlucHV0LnZhbHVlKSB9O1xuICAgICAgcmVuZGVyT3ZlcnJpZGVTbGlkZXJzKCk7XG4gICAgICBpZiAoc3RhdGUub3ZlcnJpZGVUb2tlbklkKSB7XG4gICAgICAgIHNlbmRUb0NvbnRlbnQoe1xuICAgICAgICAgIGtpbmQ6ICdvdmVycmlkZS10b2tlbicsXG4gICAgICAgICAgdG9rZW5JZDogc3RhdGUub3ZlcnJpZGVUb2tlbklkLFxuICAgICAgICAgIGNzczogb2tsY2hUb0NzcyhzdGF0ZS5vdmVycmlkZUNvbG9yKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8vIC0tLSBJbml0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbihhc3luYyAoKSA9PiB7XG4gIGF3YWl0IGxvYWRCcmlkZ2VVcmwoKTtcbiAgYnJpZGdlLnN0YXJ0KCk7XG4gIHNlbmRUb0NvbnRlbnQoeyBraW5kOiAncGluZycgfSk7XG4gIHJlbmRlckhvdmVyRGV0YWlscyhudWxsKTtcbiAgcmVuZGVyUGFnZUluZm8oKTtcbiAgcmVuZGVyQ292ZXJhZ2UoKTtcbn0pKCk7XG5cbi8vIEF2b2lkIHVudXNlZCBpbXBvcnQgd2FybmluZ3MgZm9yIGhlbHBlcnMgdXNlZCBvbmx5IGNvbmRpdGlvbmFsbHkuXG52b2lkIHBhcnNlQ3NzQ29sb3I7XG52b2lkIHJnYlRvT2tsY2g7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7QUFVTyxNQUFNLGVBQU4sTUFBbUI7QUFBQSxJQU14QixZQUE2QixTQUE4QjtBQUE5QjtBQUFBLElBQStCO0FBQUEsSUFBL0I7QUFBQSxJQUxyQixTQUE2QjtBQUFBLElBQzdCLGFBQW1EO0FBQUEsSUFDbkQsYUFBYTtBQUFBLElBQ2IsVUFBVTtBQUFBLElBSWxCLFFBQWM7QUFDWixXQUFLLFVBQVU7QUFDZixXQUFLLFFBQVE7QUFBQSxJQUNmO0FBQUEsSUFFQSxPQUFhO0FBQ1gsV0FBSyxVQUFVO0FBQ2YsVUFBSSxLQUFLLFlBQVk7QUFDbkIscUJBQWEsS0FBSyxVQUFVO0FBQzVCLGFBQUssYUFBYTtBQUFBLE1BQ3BCO0FBQ0EsVUFBSSxLQUFLLFFBQVE7QUFDZixhQUFLLE9BQU8sTUFBTTtBQUNsQixhQUFLLFNBQVM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxJQUVBLE1BQU0sZ0JBQXlDO0FBQzdDLFlBQU0sV0FBVyxNQUFNLE1BQU0sR0FBRyxLQUFLLFFBQVEsV0FBVyxDQUFDLHdCQUF3QjtBQUFBLFFBQy9FLFFBQVE7QUFBQSxRQUNSLE9BQU87QUFBQSxNQUNULENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLGNBQU0sSUFBSSxNQUFNLHVDQUF1QyxTQUFTLE1BQU0sRUFBRTtBQUFBLE1BQzFFO0FBQ0EsYUFBUSxNQUFNLFNBQVMsS0FBSztBQUFBLElBQzlCO0FBQUEsSUFFQSxNQUFNLGFBQ0osU0FDQSxNQUNBLE9BQ0EsVUFBaUMsQ0FBQyxHQUNuQjtBQUNmLFlBQU0sV0FBVyxNQUFN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
