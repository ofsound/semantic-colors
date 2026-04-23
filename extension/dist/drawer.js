"use strict";(()=>{var b="semantic-colors-inpage-drawer";function h(t){return typeof t=="object"&&t!==null}function v(t){return t==="light"||t==="dark"||t==="alt"}function p(t){return typeof t=="string"||t===null}function E(t){return!h(t)||t.source!==b?null:t.payload}function g(t){return{source:b,payload:t}}function y(t){let e=E(t);if(!h(e)||typeof e.kind!="string")return null;switch(e.kind){case"snapshot:update":return!v(e.mode)||!p(e.highlightedTokenId)||!p(e.focusedTokenId)||e.snapshot!==null&&!h(e.snapshot)?null:{kind:"snapshot:update",snapshot:e.snapshot,mode:e.mode,highlightedTokenId:e.highlightedTokenId,focusedTokenId:e.focusedTokenId};case"mode:update":return v(e.mode)?{kind:"mode:update",mode:e.mode}:null;case"token:highlight":return p(e.tokenId)?{kind:"token:highlight",tokenId:e.tokenId}:null;case"token:focus":return p(e.tokenId)?{kind:"token:focus",tokenId:e.tokenId}:null;default:return null}}var S=["text","text-secondary","text-muted","text-faint","text-inverse"],I=["accent","accent-strong","accent-surface","link","link-hover"],M=["border","border-subtle","border-strong","focus-ring"],P=["success","warning","danger","info"],a={snapshot:null,mode:"light",highlightedTokenId:null,focusedTokenId:null,activeTab:"preview",themeVarStyle:null},i={closeDrawer:document.getElementById("close-drawer"),modeLabel:document.getElementById("mode-label"),tabs:document.querySelectorAll("[data-tab]"),content:document.getElementById("drawer-content")};function f(t){return a.snapshot?.manifest.tokens[t]?.label??t}function T(){return a.snapshot?a.snapshot.resolved[a.mode]??a.snapshot.resolved.light:null}function d(t){return t in(a.snapshot?.manifest.tokens??{})}function $(t){let e=a.snapshot?.validations[a.mode]?.perToken[t];if(!e)return[];let n=[];return e.gamutAdjusted&&n.push("Adjusted to stay in display gamut."),n.push(...e.contrastIssues),n}function x(t){return t.some(e=>$(e).length>0)}function D(t){let e=[...new Set(t.flatMap(n=>$(n)))];return e.length===0?"No validation warnings.":`${e.length} validation warning${e.length===1?"":"s"}: ${e.join(" ")}`}function o(t){if(!x(t))return"";let e=D(t);return`<span aria-label="${r(e)}" class="warning-badge" title="${r(e)}">Warn</span>`}function s(t,e){let n=[e];return a.focusedTokenId&&t.includes(a.focusedTokenId)&&n.push("selected-usage"),a.highlightedTokenId&&t.includes(a.highlightedTokenId)&&n.push("highlighted-usage"),x(t)&&n.push("warning"),n.join(" ")}function L(t,e){window.parent.postMessage(g({kind:"token:focus",tokenId:t,source:e}),"*")}function A(){window.parent.postMessage(g({kind:"drawer:close"}),"*")}function C(t){return`Mode: ${t[0].toUpperCase()}${t.slice(1)}`}function r(t){return t.replace(/[&<>"']/g,e=>{switch(e){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}function F(){if(a.themeVarStyle||(a.themeVarStyle=document.createElement("style"),a.themeVarStyle.id="drawer-theme-vars",document.head.appendChild(a.themeVarStyle)),document.documentElement.dataset.theme=a.mode,!a.snapshot){a.themeVarStyle.textContent="";return}let t=T();if(!t){a.themeVarStyle.textContent="";return}let e=Object.entries(t.colors).map(([c,l])=>`  --theme-${c}: ${l.css};
  --color-${c}: ${l.css};`).join(`
`),n=a.snapshot.manifest.aliases.map(c=>`  --${c.name.replace(/^--/,"")}: var(--color-${c.tokenId});`).join(`
`);a.themeVarStyle.textContent=`:root {
${e}
${n}
}`}function j(){return a.snapshot?`<section id="preview-stage" class="stage ${a.snapshot.manifest.alt.grayscalePreview?"grayscale":""}" data-theme="${a.mode}">
    <div class="hero-grid">
      <button
        type="button"
        data-focus-token="app"
        data-focus-source="preview"
        class="${s(["app"],"surface-card surface-card-app")}"
      >
        ${o(["app"])}
        <span class="fixture-label">App</span>
      </button>

      <button
        type="button"
        data-focus-token="shell"
        data-focus-source="preview"
        class="${s(["shell"],"surface-card surface-card-shell")}"
      >
        ${o(["shell"])}
        <span class="fixture-label">Shell</span>
      </button>

      <div
        role="button"
        tabindex="0"
        data-keyboard-activate="true"
        data-focus-token="surface"
        data-focus-source="preview"
        class="${s(["surface","surface-raised","surface-muted","surface-subtle","field","text"],"surface-card surface-card-panel surface-card-panel-interactive")}"
      >
        ${o(["surface","surface-raised","surface-muted","surface-subtle","field","text"])}
        <span class="fixture-label">Primary surface</span>
        <div class="inner-stack">
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-raised"
            data-focus-source="preview"
            class="${s(["surface-raised"],"nested-surface")}"
          >Raised</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-muted"
            data-focus-source="preview"
            class="${s(["surface-muted"],"nested-surface nested-muted")}"
          >Muted</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="surface-subtle"
            data-focus-source="preview"
            class="${s(["surface-subtle"],"nested-surface nested-subtle")}"
          >Subtle</button>
          <button
            type="button"
            data-stop-propagation="true"
            data-focus-token="field"
            data-focus-source="preview"
            class="${s(["field","input"],"nested-surface nested-field")}"
          >Field</button>
        </div>
      </div>
    </div>

    <div class="fixture-shell-wrap" aria-label="Token samples shown on shell background">
      <div class="fixture-grid">
        <article class="fixture-panel">
          <div class="fixture-panel-header"><h3>Text hierarchy</h3></div>
          <div class="text-stack">
            ${S.filter(e=>d(e)).map(e=>`<button
                  type="button"
                  data-focus-token="${e}"
                  data-focus-source="preview"
                  class="${s([e],`text-sample text-sample-${e}`)}"
                >
                  ${o([e])}
                  <span>${r(f(e))}</span>
                  <strong>The quick brown fox jumps over the lazy dog.</strong>
                </button>`).join("")}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header"><h3>Accent and links</h3></div>
          <div class="accent-grid">
            ${I.filter(e=>d(e)).map(e=>`<button
                  type="button"
                  data-focus-token="${e}"
                  data-focus-source="preview"
                  class="${s([e],`accent-sample accent-sample-${e}`)}"
                >
                  ${o([e])}
                  <span>${r(f(e))}</span>
                </button>`).join("")}
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
                class="${s(["control-primary","control-primary-text"],"control-primary")}"
              >
                ${o(["control-primary","control-primary-text"])}
                Primary action
              </button>

              <button
                type="button"
                data-focus-token="control-secondary"
                data-focus-source="preview"
                class="${s(["control-secondary","control-secondary-border","control-secondary-text"],"control-secondary")}"
              >
                ${o(["control-secondary","control-secondary-border","control-secondary-text"])}
                Secondary
              </button>

              <button
                type="button"
                data-focus-token="control-ghost-hover"
                data-focus-source="preview"
                class="${s(["control-ghost-hover"],"control-ghost")}"
              >
                ${o(["control-ghost-hover"])}
                Ghost hover
              </button>

              <label
                data-focus-token="input"
                data-focus-source="preview"
                class="${s(["input","input-border","input-placeholder"],"input-preview")}"
              >
                ${o(["input","input-border","input-placeholder"])}
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
              ${M.filter(e=>d(e)).map(e=>`<button
                    type="button"
                    data-focus-token="${e}"
                    data-focus-source="preview"
                    class="${s([e],`border-sample border-sample-${e}`)}"
                  >
                    ${o([e])}
                    ${r(f(e))}
                  </button>`).join("")}
            </div>
          </article>

          <article class="fixture-panel">
            <div class="fixture-panel-header"><h3>Status pairs</h3></div>
            <div class="status-grid">
              ${P.filter(e=>d(e)&&d(`${e}-surface`)).map(e=>{let n=`${e}-surface`;return`<div
                    role="button"
                    tabindex="0"
                    data-keyboard-activate="true"
                    data-focus-token="${n}"
                    data-focus-source="preview"
                    class="${s([e,n],`status-card status-card-${e}`)}"
                  >
                    ${o([e,n])}
                    <button
                      type="button"
                      data-stop-propagation="true"
                      data-focus-token="${e}"
                      data-focus-source="preview"
                      class="status-card-text"
                    >
                      <strong>${r(e)}</strong>
                      <span>${r(f(e))}</span>
                    </button>
                  </div>`}).join("")}
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
                class="${s(["surface-overlay","text","border"],"overlay-card")}"
              >
                ${o(["surface-overlay","text","border"])}
                <strong>Overlay surface</strong>
                <p>Modal, popover, or detached chrome should read from the same semantic surface.</p>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>`:'<p class="empty-state">Connect from the DevTools panel to render semantic previews.</p>'}function R(){if(!a.snapshot)return'<p class="empty-state">Connect from the DevTools panel to list tokens.</p>';let t=T();return t?`<section class="inventory">
    ${a.snapshot.tokenGroups.map(e=>{let n=a.snapshot?.tokensByGroup[e]??[];return`<article class="token-group">
          <h2>${r(e)}</h2>
          ${n.map(c=>{let l=a.snapshot?.manifest.tokens[c];if(!l)return"";let m=t.colors[c]?.css??"transparent";return`<button
                type="button"
                data-focus-token="${r(c)}"
                data-focus-source="tokens"
                class="${s([c],"token-row")}"
              >
                <span class="token-swatch" style="background:${r(m)}"></span>
                <span>
                  <strong>${r(l.label)}</strong>
                  <code>${r(c)} \xB7 ${r(m)}</code>
                </span>
              </button>`}).join("")}
        </article>`}).join("")}
  </section>`:'<p class="empty-state">No resolved mode payload available.</p>'}function k(t){let e=t.dataset.focusToken;if(!e)return;let n=t.dataset.focusSource==="tokens"?"tokens":"preview";a.focusedTokenId=e,L(e,n),u()}function B(){i.content.querySelectorAll("[data-focus-token]").forEach(t=>{t.addEventListener("click",e=>{t.dataset.stopPropagation==="true"&&e.stopPropagation(),k(t)})}),i.content.querySelectorAll('[data-keyboard-activate="true"]').forEach(t=>{t.addEventListener("keydown",e=>{e.key!=="Enter"&&e.key!==" "||(e.preventDefault(),k(t))})})}function u(){i.modeLabel.textContent=C(a.mode),i.tabs.forEach(t=>{let e=t.dataset.tab===a.activeTab;t.classList.toggle("is-active",e),t.setAttribute("aria-selected",e?"true":"false")}),i.content.innerHTML=a.activeTab==="preview"?j():R(),B()}function w(){F(),u()}window.addEventListener("message",t=>{if(t.source!==window.parent)return;let e=y(t.data);if(e)switch(e.kind){case"snapshot:update":a.snapshot=e.snapshot,a.mode=e.mode,a.highlightedTokenId=e.highlightedTokenId,a.focusedTokenId=e.focusedTokenId,w();break;case"mode:update":a.mode=e.mode,w();break;case"token:highlight":a.highlightedTokenId=e.tokenId,u();break;case"token:focus":a.focusedTokenId=e.tokenId,u();break;default:break}});i.closeDrawer.addEventListener("click",A);i.tabs.forEach(t=>{t.addEventListener("click",()=>{let e=t.dataset.tab;e!=="preview"&&e!=="tokens"||(a.activeTab=e,u())})});u();})();
