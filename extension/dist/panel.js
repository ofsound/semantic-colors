"use strict";(()=>{var E=class{constructor(n){this.options=n}options;source=null;retryTimer=null;retryDelay=1e3;stopped=!1;start(){this.stopped=!1,this.connect()}stop(){this.stopped=!0,this.retryTimer&&(clearTimeout(this.retryTimer),this.retryTimer=null),this.source&&(this.source.close(),this.source=null)}async fetchSnapshot(){let n=await fetch(`${this.options.getBaseUrl()}/api/bridge/snapshot`,{method:"GET",cache:"no-store"});if(!n.ok)throw new Error(`Snapshot request failed with status ${n.status}`);return await n.json()}async pushOverride(n,o,a,s={}){let d=await fetch(`${this.options.getBaseUrl()}/api/bridge/token`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tokenId:n,mode:o,color:a,persist:s.persist??!1,configPath:s.configPath})});if(!d.ok)throw new Error(`Override failed with status ${d.status}`)}async applyDraft(n,o={}){let a=await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o.configPath,commands:n})});if(!a.ok)throw new Error(`Draft update failed with status ${a.status}`)}async commitDraft(n={}){let o=await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:n.configPath})});if(!o.ok)throw new Error(`Commit failed with status ${o.status}`)}async discardDraft(n={}){let o=await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:n.configPath})});if(!o.ok)throw new Error(`Discard failed with status ${o.status}`)}connect(){if(this.stopped)return;this.options.onStatus("connecting");let n=`${this.options.getBaseUrl()}/api/bridge/events`;try{this.source=new EventSource(n)}catch(o){this.options.onStatus("error",o instanceof Error?o.message:"Unable to connect"),this.scheduleReconnect();return}this.source.addEventListener("hello",o=>{this.retryDelay=1e3,this.options.onStatus("connected"),this.handleSnapshotEvent(o)}),this.source.addEventListener("snapshot",o=>{this.handleSnapshotEvent(o)}),this.source.addEventListener("ping",()=>{}),this.source.onerror=()=>{this.options.onStatus("error","Stream disconnected"),this.source?.close(),this.source=null,this.scheduleReconnect()}}handleSnapshotEvent(n){try{let o=JSON.parse(n.data);o.snapshot&&this.options.onSnapshot(o.snapshot)}catch{}}scheduleReconnect(){this.stopped||(this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=setTimeout(()=>{this.retryDelay=Math.min(this.retryDelay*2,15e3),this.connect()},this.retryDelay))}};var O="http://localhost:5173",T={bridgeUrl:"semanticColors.bridgeUrl",lastSnapshot:"semanticColors.lastSnapshot"};function S(e){let n=e<=.0031308?e*12.92:1.055*Math.pow(e,.4166666666666667)-.055;return Math.max(0,Math.min(255,Math.round(n*255)))}function te(e,n,o){let a=e+.3963377774*n+.2158037573*o,s=e-.1055613458*n-.0638541728*o,d=e-.0894841775*n-1.291485548*o,l=a**3,m=s**3,v=d**3;return[4.0767416621*l-3.3077115913*m+.2309699292*v,-1.2684380046*l+2.6097574011*m-.3413193965*v,-.0041960863*l-.7034186147*m+1.707614701*v]}function ne(e){let n=e.h*Math.PI/180,o=e.c*Math.cos(n),a=e.c*Math.sin(n),[s,d,l]=te(e.l,o,a);return{r:S(s),g:S(d),b:S(l),alpha:e.alpha??1}}function f(e){let{r:n,g:o,b:a,alpha:s}=ne(e);return s<1?`rgba(${n}, ${o}, ${a}, ${s.toFixed(3)})`:`rgb(${n}, ${o}, ${a})`}function I(e){let n=(e.l*100).toFixed(2),o=e.c.toFixed(4),a=e.h.toFixed(2),s=e.alpha!==void 0&&e.alpha<1?` / ${e.alpha.toFixed(2)}`:"";return`oklch(${n}% ${o} ${a}${s})`}function R(e,n,o){return{kind:"update-token-color",tokenId:e,mode:n,color:o}}function j(e,n){return{kind:"update-token-exception",tokenId:e,patch:n}}function U(e){return{kind:"update-alt-settings",patch:e}}function C(e,n){return{kind:"add-alias",alias:{name:e,tokenId:n}}}function N(e,n){return{kind:"update-alias",index:e,patch:n}}function F(e){return{kind:"remove-alias",index:e}}function _(){return{kind:"reset-manifest"}}function q(e,n){return{kind:"apply-import-review",proposal:e,selection:n}}function V(e,n,o){return n||(o==="dark"||o==="alt"?o:(e.manifest.alt.source==="dark"&&o==="light","light"))}function G(e,n,o){let a=e.validations[o]?.perToken[n];if(!a)return[];let s=[];return a.gamutAdjusted&&s.push("Adjusted to stay in display gamut."),s.push(...a.contrastIssues),s}function P(e){return e?.matches.find(n=>n.tokenId)?.tokenId??null}function Y(e){return`panel:${e}`}var J=chrome.devtools.inspectedWindow.tabId,t={bridgeUrl:O,snapshot:null,coverage:null,contrast:null,highlightedToken:null,focusedTokenId:"",overrideTokenId:"",overrideColor:{l:.5,c:.1,h:240,alpha:1},overrideMode:"both",persistOverride:!1,activeMode:null,tokenFilter:"",hoverActive:!1,hoveredElement:null,selectedElement:null,pageInfo:{url:"",title:"",theme:null},importSourcePath:"",importProposal:null,importSelection:{}},r={status:document.getElementById("bridge-status"),bridgeInput:document.getElementById("bridge-url"),bridgeBtn:document.getElementById("bridge-connect"),modeSwitch:document.querySelector(".mode-switch"),draftStatus:document.getElementById("draft-status"),commitDraft:document.getElementById("commit-draft"),discardDraft:document.getElementById("discard-draft"),resetManifest:document.getElementById("reset-manifest"),tabs:document.querySelectorAll(".tabs button"),tabPanels:document.querySelectorAll("[data-tab-panel]"),hoverToggle:document.getElementById("hover-toggle"),clearSelection:document.getElementById("clear-selection"),pageInfo:document.getElementById("page-info"),selectionDetails:document.getElementById("selection-details"),hoverDetails:document.getElementById("hover-details"),editorToken:document.getElementById("editor-token"),tokenEditor:document.getElementById("token-editor"),tokenValidation:document.getElementById("token-validation"),modeEditor:document.getElementById("mode-editor"),aliasList:document.getElementById("alias-list"),addAlias:document.getElementById("add-alias"),addAliasCurrent:document.getElementById("add-alias-current"),importSourcePath:document.getElementById("import-source-path"),scanImport:document.getElementById("scan-import"),applyImportReview:document.getElementById("apply-import-review"),importStatus:document.getElementById("import-status"),importReview:document.getElementById("import-review"),tokenFilter:document.getElementById("token-filter"),tokenList:document.getElementById("token-list"),clearHighlight:document.getElementById("clear-highlight"),scanCoverage:document.getElementById("scan-coverage"),coverageSummary:document.getElementById("coverage-summary"),coverageOutput:document.getElementById("coverage-output"),scanContrast:document.getElementById("scan-contrast"),contrastSummary:document.getElementById("contrast-summary"),contrastOutput:document.getElementById("contrast-output"),overrideToken:document.getElementById("override-token"),overrideSliders:document.getElementById("override-sliders"),overrideMode:document.getElementById("override-mode"),overridePersist:document.getElementById("override-persist"),clearOverrides:document.getElementById("clear-overrides"),pushOverride:document.getElementById("push-override")},K=chrome.runtime.connect({name:Y(J)});function u(e){let n={source:"panel",tabId:J,payload:e};K.postMessage(n)}K.onMessage.addListener(e=>{let n=e;n?.source==="content"&&oe(n.payload)});function oe(e){switch(e.kind){case"hello":case"page-info":t.pageInfo={url:e.url,title:e.title,theme:"theme"in e?e.theme:null},z(),t.snapshot&&B();break;case"hover-element":t.hoveredElement=e.payload,y();break;case"selected-element":t.selectedElement=e.payload,t.focusedTokenId||(t.focusedTokenId=P(e.payload)??t.focusedTokenId),L();break;case"hover-cleared":t.hoveredElement=null,y();break;case"selection-cleared":t.selectedElement=null,y();break;case"coverage-report":t.coverage=e.report,Q(),g();break;case"contrast-report":t.contrast=e.report,Z();break;case"error":console.warn("[semantic-colors] content error:",e.message);break}}var c=new E({getBaseUrl:()=>t.bridgeUrl,onStatus:p,onSnapshot:e=>{t.snapshot=e,t.focusedTokenId||(t.focusedTokenId=P(t.selectedElement)??Object.keys(e.manifest.tokens)[0]??""),L(),B()}});function p(e,n){r.status.className=`status status-${e}`,r.status.textContent=n?`${e} \xB7 ${n}`:e}async function re(){try{let n=(await chrome.storage.local.get([T.bridgeUrl]))[T.bridgeUrl];typeof n=="string"&&n.trim()&&(t.bridgeUrl=n.trim())}catch{}r.bridgeInput.value=t.bridgeUrl}async function ae(e){t.bridgeUrl=e;try{await chrome.storage.local.set({[T.bridgeUrl]:e})}catch{}}function x(e){r.tabs.forEach(n=>{n.classList.toggle("is-active",n.dataset.tab===e)}),r.tabPanels.forEach(n=>{n.classList.toggle("is-active",n.dataset.tabPanel===e)})}r.tabs.forEach(e=>{e.addEventListener("click",()=>{let n=e.dataset.tab;n&&x(n)})});r.modeSwitch.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{r.modeSwitch.querySelectorAll("button").forEach(o=>o.classList.toggle("is-active",o===e));let n=e.dataset.mode??"null";t.activeMode=n==="null"?null:n,u({kind:"set-theme",mode:t.activeMode}),t.overrideTokenId&&D(),L(),B()})});r.hoverToggle.addEventListener("change",()=>{t.hoverActive=r.hoverToggle.checked,u({kind:"hover-inspector",enabled:t.hoverActive})});r.clearSelection.addEventListener("click",()=>{t.selectedElement=null,u({kind:"clear-selection"}),y()});r.commitDraft.addEventListener("click",async()=>{if(t.snapshot)try{await c.commitDraft({configPath:t.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"commit failed")}});r.discardDraft.addEventListener("click",async()=>{if(t.snapshot)try{await c.discardDraft({configPath:t.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"discard failed")}});r.resetManifest.addEventListener("click",async()=>{if(t.snapshot)try{await c.applyDraft([_()],{configPath:t.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"reset failed")}});r.editorToken.addEventListener("change",()=>{t.focusedTokenId=r.editorToken.value,M(),g()});r.addAlias.addEventListener("click",async()=>{if(!t.snapshot)return;let e=t.focusedTokenId||Object.keys(t.snapshot.manifest.tokens)[0];if(e)try{await c.applyDraft([C("color-new-alias",e)],{configPath:t.snapshot.configPath}),x("aliases")}catch(n){p("error",n instanceof Error?n.message:"alias add failed")}});r.addAliasCurrent.addEventListener("click",async()=>{if(!(!t.snapshot||!t.focusedTokenId))try{await c.applyDraft([C(`color-${t.focusedTokenId}`,t.focusedTokenId)],{configPath:t.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"alias add failed")}});r.importSourcePath.addEventListener("input",()=>{t.importSourcePath=r.importSourcePath.value});r.scanImport.addEventListener("click",async()=>{if(!(!t.snapshot||!t.importSourcePath.trim())){r.importStatus.textContent="Scanning CSS variables...";try{let e=await fetch(`${t.bridgeUrl}/api/project/import`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:t.snapshot.configPath,sourcePath:t.importSourcePath.trim()})});if(!e.ok)throw new Error(`Import scan failed with status ${e.status}`);t.importProposal=await e.json(),t.importSelection=Object.fromEntries(t.importProposal.candidates.map(n=>[n.sourceName,n.suggestedTokenId??""])),r.importStatus.textContent=`Loaded ${t.importProposal.candidates.length} candidates.`,H()}catch(e){r.importStatus.textContent=e instanceof Error?e.message:"Import scan failed."}}});r.applyImportReview.addEventListener("click",async()=>{if(!(!t.snapshot||!t.importProposal))try{await c.applyDraft([q(t.importProposal,t.importSelection)],{configPath:t.snapshot.configPath}),t.importProposal=null,t.importSelection={},r.importStatus.textContent="Applied reviewed mappings into the draft manifest.",H()}catch(e){r.importStatus.textContent=e instanceof Error?e.message:"Import apply failed."}});r.tokenFilter.addEventListener("input",()=>{t.tokenFilter=r.tokenFilter.value.toLowerCase(),g()});r.clearHighlight.addEventListener("click",()=>{t.highlightedToken=null,u({kind:"highlight-token",tokenId:null}),g()});r.scanCoverage.addEventListener("click",()=>{t.snapshot&&(r.coverageSummary.textContent="Scanning...",u({kind:"scan-coverage",tokenColors:X(),aliases:t.snapshot.manifest.aliases}))});r.scanContrast.addEventListener("click",()=>{t.snapshot&&(r.contrastSummary.textContent="Auditing...",u({kind:"scan-contrast",tokenColors:X(),aliases:t.snapshot.manifest.aliases}))});r.overrideToken.addEventListener("change",()=>{t.overrideTokenId=r.overrideToken.value,D(),A()});r.overrideMode.addEventListener("change",()=>{t.overrideMode=r.overrideMode.value});r.overridePersist.addEventListener("change",()=>{t.persistOverride=r.overridePersist.checked});r.clearOverrides.addEventListener("click",()=>{u({kind:"clear-all-overrides"})});r.pushOverride.addEventListener("click",async()=>{if(t.overrideTokenId)try{await c.pushOverride(t.overrideTokenId,t.overrideMode,t.overrideColor,{persist:t.persistOverride,configPath:t.snapshot?.configPath})}catch(e){p("error",e instanceof Error?e.message:"push failed")}});r.bridgeBtn.addEventListener("click",async()=>{let e=r.bridgeInput.value.trim();e&&(await ae(e),c.stop(),c.start())});function b(){return t.snapshot?V(t.snapshot,t.activeMode,t.pageInfo.theme):"light"}function X(){if(!t.snapshot)return{};let e=t.snapshot.resolved[b()],n={};for(let[o,a]of Object.entries(e.colors))n[o]=a.css;return n}function B(){t.snapshot&&u({kind:"update-snapshot",snapshot:t.snapshot})}function L(){se(),z(),y(),de(),M(),me(),H(),g(),Q(),Z(),ge(),!t.overrideTokenId&&t.snapshot&&(t.overrideTokenId=Object.keys(t.snapshot.manifest.tokens)[0]??"",D()),A()}function se(){if(!t.snapshot){r.draftStatus.textContent="Waiting for bridge snapshot...";return}let e=t.snapshot.draft.dirty?`Draft dirty \xB7 base v${t.snapshot.draft.baseVersion} \xB7 last edit ${t.snapshot.draft.lastEditor}`:`Draft clean \xB7 synced at v${t.snapshot.version}`;r.draftStatus.textContent=e}function z(){r.pageInfo.textContent=t.pageInfo.url?`Inspecting: ${t.pageInfo.title||"(untitled)"} \u2014 ${t.pageInfo.url} \xB7 data-theme=${t.pageInfo.theme??"(none)"}`:"Waiting for inspected page to load..."}function k(e){return e?`<span class="swatch" style="background:${i(e)}"></span>`:""}function ie(e){return`
    <div class="token-match-list">
      ${e.matches.map(n=>{let o=n.tokenId?i(n.tokenId):"No token match",a=n.aliases.length?` \xB7 ${i(n.aliases.join(", "))}`:"",s=n.tokenId?`<button type="button" data-focus-token="${i(n.tokenId)}">${o}</button>`:o;return`
            <div class="report-item">
              <span>
                <strong>${i(n.channel)}</strong>
                <div class="meta">${i(n.cssValue??"\u2014")}</div>
              </span>
              <span class="token-chip">${k(n.cssValue)} ${s}</span>
              <span class="meta">${a||"\u2014"}</span>
            </div>
          `}).join("")}
    </div>
  `}function le(e){e.querySelectorAll("[data-focus-token]").forEach(n=>{n.addEventListener("click",()=>{let o=n.dataset.focusToken;o&&he(o,!0,!0)})})}function W(e,n,o){if(!n){e.innerHTML=`<p class="empty-state">${i(o)}</p>`;return}let a=n.contrastLc===null?"\u2014":`${n.contrastLc.toFixed(1)} Lc`;e.innerHTML=`
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${i(n.selector)}</code></dd>
      <dt>Colors</dt><dd>${k(n.computedColor)} <code>${i(n.computedColor??"\u2014")}</code></dd>
      <dt>Background</dt><dd>${k(n.computedBackground)} <code>${i(n.computedBackground??"\u2014")}</code></dd>
      <dt>Border</dt><dd>${k(n.computedBorder)} <code>${i(n.computedBorder??"\u2014")}</code></dd>
      <dt>APCA</dt><dd>${a}</dd>
    </dl>
    <p class="report-subhead">Matched channels</p>
    ${ie(n)}
  `,le(e)}function y(){W(r.selectionDetails,t.selectedElement,"Click a page element while inspect mode is enabled to lock its context."),W(r.hoverDetails,t.hoveredElement,"Move your mouse over the inspected page to preview live token info.")}function $(){return t.snapshot?Object.values(t.snapshot.manifest.tokens):[]}function w(e){return t.snapshot?.manifest.tokens[e]??null}function de(){if(!t.snapshot){r.editorToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=$();r.editorToken.innerHTML=e.map(n=>`<option value="${n.id}">${i(n.label)} (${n.id})</option>`).join(""),t.focusedTokenId||(t.focusedTokenId=e[0]?.id??""),r.editorToken.value=t.focusedTokenId}function h(e,n,o,a,s,d){return`
    <div class="slider-row">
      <span>${n.toUpperCase()}</span>
      <input
        type="range"
        min="${a}"
        max="${s}"
        step="${d}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${n}"
      />
      <input
        type="number"
        min="${a}"
        max="${s}"
        step="${d}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${n}"
      />
    </div>
  `}async function ce(e,n,o,a){let s=w(e);if(!s||!t.snapshot)return;let d={...n==="dark"?s.dark:s.light,[o]:a};await c.applyDraft([R(e,n,d)],{configPath:t.snapshot.configPath})}function pe(e){r.tokenEditor.querySelectorAll("[data-slider-prefix]").forEach(n=>{n.addEventListener("input",async()=>{let o=n.dataset.sliderPrefix,a=n.dataset.channel;if(!(!o||!a))try{await ce(e,o,a,Number(n.value))}catch(s){p("error",s instanceof Error?s.message:"token update failed")}})}),r.tokenEditor.querySelectorAll("[data-token-exception], [data-token-max-chroma]").forEach(n=>{let o=async()=>{try{let a=r.tokenEditor.querySelector("[data-token-exception]")?.value,s=r.tokenEditor.querySelector("[data-token-max-chroma]")?.value;await c.applyDraft([j(e,{altBehavior:a,maxChroma:s===""?null:Number(s)})],{configPath:t.snapshot?.configPath})}catch(a){p("error",a instanceof Error?a.message:"exception update failed")}};n.addEventListener("change",o),n.addEventListener("input",o)})}function ue(){r.modeEditor.querySelectorAll("[data-alt-setting]").forEach(e=>{let n=async()=>{if(!t.snapshot)return;let o=e.dataset.altSetting;if(!o)return;let a;o==="source"?a={source:e.value}:o==="harmonyLock"?a={harmonyLock:e.checked}:o==="grayscalePreview"?a={grayscalePreview:e.checked}:a={delta:{[o]:Number(e.value)}};try{await c.applyDraft([U(a)],{configPath:t.snapshot.configPath})}catch(s){p("error",s instanceof Error?s.message:"alt update failed")}};e.addEventListener("change",n),e.addEventListener("input",n)})}function M(){if(!t.snapshot||!t.focusedTokenId){r.tokenEditor.innerHTML='<p class="empty-state">Select a token to edit it.</p>',r.modeEditor.innerHTML='<p class="empty-state">Connect to the engine to edit theme state.</p>',r.tokenValidation.innerHTML='<p class="empty-state">No validation details yet.</p>';return}let e=w(t.focusedTokenId);if(!e){r.tokenEditor.innerHTML='<p class="empty-state">Selected token is unavailable.</p>';return}let n=b(),o=t.snapshot.resolved[n].colors[e.id],a=G(t.snapshot,e.id,n);r.tokenEditor.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${i(f(o))}"></span>
      <div>
        <strong>${i(e.label)}</strong>
        <div class="meta">${i(e.description)}</div>
        <code>${i(I(o))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      ${h("light","l",e.light.l,0,1,.005)}
      ${h("light","c",e.light.c,0,.37,.005)}
      ${h("light","h",e.light.h,0,360,1)}
    </div>
    <div class="editor-block">
      <h3>Dark anchor</h3>
      ${h("dark","l",e.dark.l,0,1,.005)}
      ${h("dark","c",e.dark.c,0,.37,.005)}
      ${h("dark","h",e.dark.h,0,360,1)}
    </div>
    <div class="editor-block">
      <h3>Alt exception</h3>
      <div class="field-grid">
        <label class="field-block">
          <span>Alt behavior</span>
          <select data-token-exception>
            <option value="derive" ${e.exception.altBehavior==="derive"?"selected":""}>Derive</option>
            <option value="pin" ${e.exception.altBehavior==="pin"?"selected":""}>Pin to source anchor</option>
            <option value="exclude" ${e.exception.altBehavior==="exclude"?"selected":""}>Exclude from Alt</option>
          </select>
        </label>
        <label class="field-block">
          <span>Max chroma</span>
          <input type="number" min="0" max="0.37" step="0.005" value="${e.exception.maxChroma??""}" data-token-max-chroma />
        </label>
      </div>
      <div class="meta">${e.altParent?`Alt derives from ${i(e.altParent)}.`:"No alt parent override."}</div>
    </div>
  `,r.modeEditor.innerHTML=`
    <div class="editor-block">
      <div class="field-grid">
        <label class="field-block">
          <span>Alt base</span>
          <select data-alt-setting="source">
            <option value="light" ${t.snapshot.manifest.alt.source==="light"?"selected":""}>Derive from Light</option>
            <option value="dark" ${t.snapshot.manifest.alt.source==="dark"?"selected":""}>Derive from Dark</option>
          </select>
        </label>
        <label class="field-block">
          <span>Lock harmony</span>
          <input type="checkbox" ${t.snapshot.manifest.alt.harmonyLock?"checked":""} data-alt-setting="harmonyLock" />
        </label>
      </div>
      <label class="switch">
        <input type="checkbox" ${t.snapshot.manifest.alt.grayscalePreview?"checked":""} data-alt-setting="grayscalePreview" />
        <span>Greyscale hierarchy overlay</span>
      </label>
    </div>
    <div class="editor-block">
      <h3>Alt deltas</h3>
      ${h("alt","h",t.snapshot.manifest.alt.delta.h,-180,180,1).replaceAll('data-slider-prefix="alt"','data-alt-setting="h"')}
      ${h("alt","c",t.snapshot.manifest.alt.delta.c,-.16,.16,.005).replaceAll('data-slider-prefix="alt"','data-alt-setting="c"')}
      ${h("alt","l",t.snapshot.manifest.alt.delta.l,-.2,.2,.01).replaceAll('data-slider-prefix="alt"','data-alt-setting="l"')}
    </div>
  `,r.tokenValidation.innerHTML=a.length?`<div class="report-list">${a.map(s=>`<div class="report-item severity-warn"><span>${i(s)}</span><span></span><span></span></div>`).join("")}</div>`:'<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>',pe(e.id),ue()}function me(){if(!t.snapshot){r.aliasList.innerHTML='<p class="empty-state">Connect to the engine to edit aliases.</p>';return}if(t.snapshot.manifest.aliases.length===0){r.aliasList.innerHTML='<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';return}r.aliasList.innerHTML=`
    <div class="alias-list">
      ${t.snapshot.manifest.aliases.map((e,n)=>`
            <div class="alias-row">
              <input type="text" value="${i(e.name)}" data-alias-index="${n}" data-alias-field="name" />
              <select data-alias-index="${n}" data-alias-field="tokenId">
                ${$().map(o=>`
                      <option value="${o.id}" ${o.id===e.tokenId?"selected":""}>
                        ${i(o.label)}
                      </option>
                    `).join("")}
              </select>
              <button type="button" data-remove-alias="${n}" class="secondary">Remove</button>
            </div>
          `).join("")}
    </div>
  `,r.aliasList.querySelectorAll("[data-alias-index]").forEach(e=>{let n=async()=>{if(!t.snapshot)return;let o=Number(e.dataset.aliasIndex),a=e.dataset.aliasField==="name"?{name:e.value}:{tokenId:e.value};try{await c.applyDraft([N(o,a)],{configPath:t.snapshot.configPath})}catch(s){p("error",s instanceof Error?s.message:"alias update failed")}};e.addEventListener("input",n),e.addEventListener("change",n)}),r.aliasList.querySelectorAll("[data-remove-alias]").forEach(e=>{e.addEventListener("click",async()=>{if(!t.snapshot)return;let n=Number(e.dataset.removeAlias);try{await c.applyDraft([F(n)],{configPath:t.snapshot.configPath})}catch(o){p("error",o instanceof Error?o.message:"alias remove failed")}})})}function H(){if(!t.importProposal){r.importReview.innerHTML='<p class="empty-state">Add a source CSS path, scan it, then review mappings before applying them to the draft.</p>';return}r.importReview.innerHTML=`
    <div class="import-list">
      ${t.importProposal.candidates.map(e=>`
            <div class="import-card">
              <div>
                <strong>--${i(e.sourceName)}</strong>
                <div class="meta">${i(e.rawValue)}</div>
                <div class="meta">${i(e.reason)}</div>
              </div>
              <select data-import-source="${i(e.sourceName)}">
                <option value="">Skip mapping</option>
                ${$().map(n=>`
                      <option value="${n.id}" ${t.importSelection[e.sourceName]===n.id?"selected":""}>
                        ${i(n.label)}
                      </option>
                    `).join("")}
              </select>
              <span class="token-chip">${k(e.light?f(e.light):null)} ${k(e.dark?f(e.dark):null)}</span>
            </div>
          `).join("")}
    </div>
  `,r.importReview.querySelectorAll("[data-import-source]").forEach(e=>{e.addEventListener("change",()=>{let n=e.dataset.importSource;n&&(t.importSelection[n]=e.value)})})}function he(e,n=!1,o=!1){t.focusedTokenId=e,o&&x("authoring"),n&&(t.highlightedToken=e,u({kind:"reveal-token-usage",tokenId:e})),M(),g()}function g(){if(!t.snapshot){r.tokenList.innerHTML='<p class="empty-state">Connect to the engine to load tokens.</p>';return}let e=b(),n=t.snapshot.resolved[e],o=t.tokenFilter,a=[];for(let s of t.snapshot.tokenGroups){let d=(t.snapshot.tokensByGroup[s]??[]).filter(l=>l.includes(o));if(d.length){a.push(`<div class="token-group-heading">${i(s)}</div>`);for(let l of d){let m=t.snapshot.manifest.tokens[l];if(!m)continue;let v=t.coverage?.byToken[l],ee=["token-row",t.highlightedToken===l?"is-highlighted":"",t.focusedTokenId===l?"is-focused":""].filter(Boolean).join(" ");a.push(`
        <button class="${ee}" data-token-id="${l}" type="button">
          <span class="swatch" style="background:${i(n.colors[l]?.css??"")}"></span>
          <div>
            <div class="token-name">${i(m.label)}</div>
            <div class="token-value">${i(l)} \xB7 ${i(n.colors[l]?.css??"")}</div>
          </div>
          <span class="token-count">${v===void 0?"\xB7":`${v} used`}</span>
          <span aria-hidden="true">\u203A</span>
        </button>
      `)}}}r.tokenList.innerHTML=a.join(""),r.tokenList.querySelectorAll("[data-token-id]").forEach(s=>{s.addEventListener("click",()=>{let d=s.dataset.tokenId;if(!d)return;let l=t.highlightedToken===d?null:d;t.highlightedToken=l,t.focusedTokenId=d,u({kind:"highlight-token",tokenId:l}),g(),M()})})}function Q(){let e=t.coverage;if(!e){r.coverageOutput.innerHTML='<p class="empty-state">Run a scan to see token usage.</p>',r.coverageSummary.textContent="";return}let n=Object.entries(e.byToken).filter(([,l])=>l>0).length,o=Object.keys(e.byToken).length,a=[...Object.entries(e.byToken)].filter(([,l])=>l>0).sort((l,m)=>m[1]-l[1]).slice(0,20),s=e.unusedTokens.slice(0,20),d=e.rawColorViolations.slice(0,20);r.coverageSummary.textContent=`${e.totalElements} elements \xB7 ${n}/${o} tokens used \xB7 ${e.rawColorViolations.length} raw colors`,r.coverageOutput.innerHTML=`
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${a.map(([l,m])=>`<div class="report-item"><span>${i(l)}</span><span class="meta">${m} elements</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Unused tokens (${s.length})</p>
    <div class="report-list">
      ${s.map(l=>`<div class="report-item"><span>${i(l)}</span><span class="meta">0</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Raw color violations (${d.length})</p>
    <div class="report-list">
      ${d.map(l=>`
            <div class="report-item severity-warn">
              <span><code>${i(l.selector)}</code></span>
              <span class="meta">${i(l.property)}: ${i(l.value)}</span>
              <span></span>
            </div>
          `).join("")}
    </div>
  `}function Z(){if(!t.contrast){r.contrastSummary.textContent="",r.contrastOutput.innerHTML='<p class="empty-state">Run an audit to surface APCA issues.</p>';return}if(r.contrastSummary.textContent=`${t.contrast.sampled} sampled \xB7 ${t.contrast.findings.length} potential failures`,!t.contrast.findings.length){r.contrastOutput.innerHTML='<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';return}r.contrastOutput.innerHTML=`
    <div class="report-list">
      ${t.contrast.findings.map(e=>`
            <div class="report-item severity-${e.severity}">
              <span>
                <code>${i(e.selector)}</code>
                <div class="meta">${i(e.context||"\u2014")}</div>
              </span>
              <span class="meta">fg ${i(e.foregroundToken??e.foreground)} \xB7 bg ${i(e.backgroundToken??e.background)}</span>
              <span class="meta">${e.contrastLc.toFixed(1)} Lc</span>
            </div>
          `).join("")}
    </div>
  `}function ge(){if(!t.snapshot){r.overrideToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=$();r.overrideToken.innerHTML=e.map(n=>`<option value="${n.id}">${i(n.label)} (${n.id})</option>`).join(""),t.overrideTokenId&&(r.overrideToken.value=t.overrideTokenId)}function D(){if(!t.snapshot||!t.overrideTokenId)return;let e=w(t.overrideTokenId);if(!e)return;let n=b();if(n==="alt"){let o=t.snapshot.resolved.alt.colors[t.overrideTokenId];if(o){t.overrideColor={l:o.l,c:o.c,h:o.h,alpha:o.alpha};return}}t.overrideColor={...n==="dark"?e.dark:e.light}}function A(){if(!t.snapshot){r.overrideSliders.innerHTML='<p class="empty-state">Connect to the engine to use overrides.</p>';return}let e=t.overrideColor,n=f(e),o=[{key:"l",label:"L",min:0,max:1,step:.001},{key:"c",label:"C",min:0,max:.4,step:.001},{key:"h",label:"H",min:0,max:360,step:.1}];r.overrideSliders.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${i(n)}"></span>
      <div>
        <strong>${i(t.overrideTokenId||"Choose a token")}</strong>
        <code>${i(I(e))}</code>
      </div>
    </div>
    <div class="editor-block">
      ${o.map(a=>`
            <div class="slider-row">
              <span>${a.label}</span>
              <input type="range" min="${a.min}" max="${a.max}" step="${a.step}" value="${e[a.key]}" data-override-channel="${a.key}" />
              <span class="readout">${e[a.key].toFixed(a.key==="h"?2:3)}</span>
            </div>
          `).join("")}
    </div>
  `,r.overrideSliders.querySelectorAll("[data-override-channel]").forEach(a=>{a.addEventListener("input",()=>{let s=a.dataset.overrideChannel;s&&(t.overrideColor={...t.overrideColor,[s]:Number(a.value)},A(),t.overrideTokenId&&u({kind:"override-token",tokenId:t.overrideTokenId,css:f(t.overrideColor)}))})})}function i(e){return e.replace(/[&<>"']/g,n=>{switch(n){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}(async()=>(await re(),c.start(),u({kind:"ping"}),L()))();})();
