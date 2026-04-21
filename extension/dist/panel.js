"use strict";(()=>{var M=class{constructor(t){this.options=t}options;source=null;retryTimer=null;retryDelay=1e3;stopped=!1;start(){this.stopped=!1,this.connect()}stop(){this.stopped=!0,this.retryTimer&&(clearTimeout(this.retryTimer),this.retryTimer=null),this.source&&(this.source.close(),this.source=null)}async fetchSnapshot(){let t=await fetch(`${this.options.getBaseUrl()}/api/bridge/snapshot`,{method:"GET",cache:"no-store"});if(!t.ok)throw new Error(`Snapshot request failed with status ${t.status}`);return await t.json()}async pushOverride(t,o,r,a={}){let l=await fetch(`${this.options.getBaseUrl()}/api/bridge/token`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tokenId:t,mode:o,color:r,persist:a.persist??!1,configPath:a.configPath})});if(!l.ok)throw new Error(`Override failed with status ${l.status}`)}async applyDraft(t,o={}){let r=await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o.configPath,commands:t})});if(!r.ok)throw new Error(`Draft update failed with status ${r.status}`)}async commitDraft(t={}){let o=await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:t.configPath})});if(!o.ok)throw new Error(`Commit failed with status ${o.status}`)}async discardDraft(t={}){let o=await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:t.configPath})});if(!o.ok)throw new Error(`Discard failed with status ${o.status}`)}connect(){if(this.stopped)return;this.options.onStatus("connecting");let t=`${this.options.getBaseUrl()}/api/bridge/events`;try{this.source=new EventSource(t)}catch(o){this.options.onStatus("error",o instanceof Error?o.message:"Unable to connect"),this.scheduleReconnect();return}this.source.addEventListener("hello",o=>{this.retryDelay=1e3,this.options.onStatus("connected"),this.handleSnapshotEvent(o)}),this.source.addEventListener("snapshot",o=>{this.handleSnapshotEvent(o)}),this.source.addEventListener("ping",()=>{}),this.source.onerror=()=>{this.options.onStatus("error","Stream disconnected"),this.source?.close(),this.source=null,this.scheduleReconnect()}}handleSnapshotEvent(t){try{let o=JSON.parse(t.data);o.snapshot&&this.options.onSnapshot(o.snapshot)}catch{}}scheduleReconnect(){this.stopped||(this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=setTimeout(()=>{this.retryDelay=Math.min(this.retryDelay*2,15e3),this.connect()},this.retryDelay))}};var K="http://localhost:5173",$={bridgeUrl:"semanticColors.bridgeUrl",lastSnapshot:"semanticColors.lastSnapshot"};function D(e){let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4}function A(e){let t=e<=.0031308?e*12.92:1.055*Math.pow(e,.4166666666666667)-.055;return Math.max(0,Math.min(255,Math.round(t*255)))}function Me(e,t,o){let r=e+.3963377774*t+.2158037573*o,a=e-.1055613458*t-.0638541728*o,l=e-.0894841775*t-1.291485548*o,i=r**3,d=a**3,p=l**3;return[4.0767416621*i-3.3077115913*d+.2309699292*p,-1.2684380046*i+2.6097574011*d-.3413193965*p,-.0041960863*i-.7034186147*d+1.707614701*p]}function $e(e,t,o){let r=Math.cbrt(.4122214708*e+.5363325363*t+.0514459929*o),a=Math.cbrt(.2119034982*e+.6806995451*t+.1073969566*o),l=Math.cbrt(.0883024619*e+.2817188376*t+.6299787005*o);return[.2104542553*r+.793617785*a-.0040720468*l,1.9779984951*r-2.428592205*a+.4505937099*l,.0259040371*r+.7827717662*a-.808675766*l]}function b(e){let t=e.h*Math.PI/180,o=e.c*Math.cos(t),r=e.c*Math.sin(t),[a,l,i]=Me(e.l,o,r);return{r:A(a),g:A(l),b:A(i),alpha:e.alpha??1}}function L(e,t,o,r=1){let[a,l,i]=$e(D(e),D(t),D(o)),d=Math.sqrt(l*l+i*i),p=Math.atan2(i,l)*180/Math.PI;return p<0&&(p+=360),{l:a,c:d,h:p,alpha:r}}function Q(e){let t=e%360;return t<0?t+360:t}function Le(e){return`#${[e.r,e.g,e.b].map(t=>Math.max(0,Math.min(255,Math.round(t))).toString(16).padStart(2,"0")).join("").toUpperCase()}`}function Z(e){let{r:t,g:o,b:r}=b(e);return Le({r:t,g:o,b:r})}function R(e){return`${e.r}, ${e.g}, ${e.b}`}function O(e){let t=e.r/255,o=e.g/255,r=e.b/255,a=Math.max(t,o,r),l=Math.min(t,o,r),i=a-l,d=0;return i!==0&&(a===t?d=(o-r)/i%6:a===o?d=(r-t)/i+2:d=(t-o)/i+4,d*=60,d<0&&(d+=360)),{h:d,s:a===0?0:i/a*100,v:a*100}}function ee(e){let t=Math.max(0,Math.min(100,e.s))/100,o=Math.max(0,Math.min(100,e.v))/100,r=Q(e.h),a=o*t,l=a*(1-Math.abs(r/60%2-1)),i=o-a,d,p,u;return r<60?[d,p,u]=[a,l,0]:r<120?[d,p,u]=[l,a,0]:r<180?[d,p,u]=[0,a,l]:r<240?[d,p,u]=[0,l,a]:r<300?[d,p,u]=[l,0,a]:[d,p,u]=[a,0,l],{r:Math.round((d+i)*255),g:Math.round((p+i)*255),b:Math.round((u+i)*255)}}function te(e){let t=e.trim();if(!t)return null;let o=t.match(/^rgb\s*\((.*)\)$/i),a=(o?o[1]:t).split(/[\s,]+/).filter(Boolean);if(a.length!==3)return null;let l=a.map(i=>Number(i));return l.some(i=>!Number.isFinite(i))||l.some(i=>i<0||i>255)?null:{r:Math.round(l[0]),g:Math.round(l[1]),b:Math.round(l[2])}}function N(e){let t=e.trim(),o=t.startsWith("#")?t.slice(1):t,r=/^[0-9a-fA-F]{3}$/.test(o),a=/^[0-9a-fA-F]{6}$/.test(o);return!r&&!a?null:`#${(r?o.split("").map(i=>i+i).join(""):o).toUpperCase()}`}function ne(e){let t=N(e);if(!t)return null;let o=Number.parseInt(t.slice(1),16);return{r:o>>16&255,g:o>>8&255,b:o&255}}function j(e,t,o,r){let a=Math.max(e,1),l=Math.max(t,1),i=Math.max(0,Math.min(a,o)),p=Math.max(0,Math.min(l,r))/l,u=p<=.5;return{h:i/a*360,s:u?100:100-(p-.5)/.5*100,v:u?p/.5*100:100}}function U(e){let t=Q(e.h),o=Math.max(0,Math.min(100,e.s)),r=Math.max(0,Math.min(100,e.v));return{xPercent:`${t/360*100}%`,yPercent:r>=99.5?`${50+(100-o)/100*50}%`:`${r/100*50}%`}}function k(e){let{r:t,g:o,b:r,alpha:a}=b(e);return a<1?`rgba(${t}, ${o}, ${r}, ${a.toFixed(3)})`:`rgb(${t}, ${o}, ${r})`}function F(e){let t=(e.l*100).toFixed(2),o=e.c.toFixed(4),r=e.h.toFixed(2),a=e.alpha!==void 0&&e.alpha<1?` / ${e.alpha.toFixed(2)}`:"";return`oklch(${t}% ${o} ${r}${a})`}function oe(e,t,o){return{kind:"update-token-color",tokenId:e,mode:t,color:o}}function re(e,t){return{kind:"update-token-exception",tokenId:e,patch:t}}function ae(e){return{kind:"update-alt-settings",patch:e}}function _(e,t){return{kind:"add-alias",alias:{name:e,tokenId:t}}}function se(e,t){return{kind:"update-alias",index:e,patch:t}}function ie(e){return{kind:"remove-alias",index:e}}function le(){return{kind:"reset-manifest"}}function ce(e,t){return{kind:"apply-import-review",proposal:e,selection:t}}function de(e,t,o){return t||(o==="dark"||o==="alt"?o:(e.manifest.alt.source==="dark"&&o==="light","light"))}function pe(e,t,o){let r=e.validations[o]?.perToken[t];if(!r)return[];let a=[];return r.gamutAdjusted&&a.push("Adjusted to stay in display gamut."),a.push(...r.contrastIssues),a}function q(e){return e?.matches.find(t=>t.tokenId)?.tokenId??null}function ue(e){return`panel:${e}`}var ge=chrome.devtools.inspectedWindow.tabId,xe="linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",n={bridgeUrl:K,snapshot:null,coverage:null,contrast:null,highlightedToken:null,focusedTokenId:"",overrideTokenId:"",overrideColor:{l:.5,c:.1,h:240,alpha:1},overrideMode:"both",persistOverride:!1,activeMode:null,tokenFilter:"",hoverActive:!1,hoveredElement:null,selectedElement:null,pageInfo:{url:"",title:"",theme:null},importSourcePath:"",importProposal:null,importSelection:{},pickerDrag:null},s={status:document.getElementById("bridge-status"),bridgeInput:document.getElementById("bridge-url"),bridgeBtn:document.getElementById("bridge-connect"),modeSwitch:document.querySelector(".mode-switch"),draftStatus:document.getElementById("draft-status"),commitDraft:document.getElementById("commit-draft"),discardDraft:document.getElementById("discard-draft"),resetManifest:document.getElementById("reset-manifest"),tabs:document.querySelectorAll(".tabs button"),tabPanels:document.querySelectorAll("[data-tab-panel]"),hoverToggle:document.getElementById("hover-toggle"),clearSelection:document.getElementById("clear-selection"),pageInfo:document.getElementById("page-info"),selectionDetails:document.getElementById("selection-details"),hoverDetails:document.getElementById("hover-details"),editorToken:document.getElementById("editor-token"),tokenEditor:document.getElementById("token-editor"),tokenValidation:document.getElementById("token-validation"),modeEditor:document.getElementById("mode-editor"),aliasList:document.getElementById("alias-list"),addAlias:document.getElementById("add-alias"),addAliasCurrent:document.getElementById("add-alias-current"),importSourcePath:document.getElementById("import-source-path"),scanImport:document.getElementById("scan-import"),applyImportReview:document.getElementById("apply-import-review"),importStatus:document.getElementById("import-status"),importReview:document.getElementById("import-review"),tokenFilter:document.getElementById("token-filter"),tokenList:document.getElementById("token-list"),clearHighlight:document.getElementById("clear-highlight"),scanCoverage:document.getElementById("scan-coverage"),coverageSummary:document.getElementById("coverage-summary"),coverageOutput:document.getElementById("coverage-output"),scanContrast:document.getElementById("scan-contrast"),contrastSummary:document.getElementById("contrast-summary"),contrastOutput:document.getElementById("contrast-output"),overrideToken:document.getElementById("override-token"),overrideSliders:document.getElementById("override-sliders"),overrideMode:document.getElementById("override-mode"),overridePersist:document.getElementById("override-persist"),clearOverrides:document.getElementById("clear-overrides"),pushOverride:document.getElementById("push-override")},fe=chrome.runtime.connect({name:ue(ge)});function g(e){let t={source:"panel",tabId:ge,payload:e};fe.postMessage(t)}fe.onMessage.addListener(e=>{let t=e;t?.source==="content"&&Ce(t.payload)});function Ce(e){switch(e.kind){case"hello":case"page-info":n.pageInfo={url:e.url,title:e.title,theme:"theme"in e?e.theme:null},ke(),n.snapshot&&G();break;case"hover-element":n.hoveredElement=e.payload,T();break;case"selected-element":n.selectedElement=e.payload,n.focusedTokenId||(n.focusedTokenId=q(e.payload)??n.focusedTokenId),S();break;case"hover-cleared":n.hoveredElement=null,T();break;case"selection-cleared":n.selectedElement=null,T();break;case"coverage-report":n.coverage=e.report,Ee(),v();break;case"contrast-report":n.contrast=e.report,Te();break;case"error":console.warn("[semantic-colors] content error:",e.message);break}}var h=new M({getBaseUrl:()=>n.bridgeUrl,onStatus:m,onSnapshot:e=>{n.snapshot=e,n.focusedTokenId||(n.focusedTokenId=q(n.selectedElement)??Object.keys(e.manifest.tokens)[0]??""),S(),G()}});function m(e,t){s.status.className=`status status-${e}`,s.status.textContent=t?`${e} \xB7 ${t}`:e}async function Se(){try{let t=(await chrome.storage.local.get([$.bridgeUrl]))[$.bridgeUrl];typeof t=="string"&&t.trim()&&(n.bridgeUrl=t.trim())}catch{}s.bridgeInput.value=n.bridgeUrl}async function Ie(e){n.bridgeUrl=e;try{await chrome.storage.local.set({[$.bridgeUrl]:e})}catch{}}function Y(e){s.tabs.forEach(t=>{t.classList.toggle("is-active",t.dataset.tab===e)}),s.tabPanels.forEach(t=>{t.classList.toggle("is-active",t.dataset.tabPanel===e)})}s.tabs.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;t&&Y(t)})});s.modeSwitch.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{s.modeSwitch.querySelectorAll("button").forEach(o=>o.classList.toggle("is-active",o===e));let t=e.dataset.mode??"null";n.activeMode=t==="null"?null:t,g({kind:"set-theme",mode:n.activeMode}),n.overrideTokenId&&z(),S(),G()})});s.hoverToggle.addEventListener("change",()=>{n.hoverActive=s.hoverToggle.checked,g({kind:"hover-inspector",enabled:n.hoverActive})});s.clearSelection.addEventListener("click",()=>{n.selectedElement=null,g({kind:"clear-selection"}),T()});s.commitDraft.addEventListener("click",async()=>{if(n.snapshot)try{await h.commitDraft({configPath:n.snapshot.configPath})}catch(e){m("error",e instanceof Error?e.message:"commit failed")}});s.discardDraft.addEventListener("click",async()=>{if(n.snapshot)try{await h.discardDraft({configPath:n.snapshot.configPath})}catch(e){m("error",e instanceof Error?e.message:"discard failed")}});s.resetManifest.addEventListener("click",async()=>{if(n.snapshot)try{await h.applyDraft([le()],{configPath:n.snapshot.configPath})}catch(e){m("error",e instanceof Error?e.message:"reset failed")}});s.editorToken.addEventListener("change",()=>{n.focusedTokenId=s.editorToken.value,H(),v()});s.addAlias.addEventListener("click",async()=>{if(!n.snapshot)return;let e=n.focusedTokenId||Object.keys(n.snapshot.manifest.tokens)[0];if(e)try{await h.applyDraft([_("color-new-alias",e)],{configPath:n.snapshot.configPath}),Y("aliases")}catch(t){m("error",t instanceof Error?t.message:"alias add failed")}});s.addAliasCurrent.addEventListener("click",async()=>{if(!(!n.snapshot||!n.focusedTokenId))try{await h.applyDraft([_(`color-${n.focusedTokenId}`,n.focusedTokenId)],{configPath:n.snapshot.configPath})}catch(e){m("error",e instanceof Error?e.message:"alias add failed")}});s.importSourcePath.addEventListener("input",()=>{n.importSourcePath=s.importSourcePath.value});s.scanImport.addEventListener("click",async()=>{if(!(!n.snapshot||!n.importSourcePath.trim())){s.importStatus.textContent="Scanning CSS variables...";try{let e=await fetch(`${n.bridgeUrl}/api/project/import`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:n.snapshot.configPath,sourcePath:n.importSourcePath.trim()})});if(!e.ok)throw new Error(`Import scan failed with status ${e.status}`);n.importProposal=await e.json(),n.importSelection=Object.fromEntries(n.importProposal.candidates.map(t=>[t.sourceName,t.suggestedTokenId??""])),s.importStatus.textContent=`Loaded ${n.importProposal.candidates.length} candidates.`,W()}catch(e){s.importStatus.textContent=e instanceof Error?e.message:"Import scan failed."}}});s.applyImportReview.addEventListener("click",async()=>{if(!(!n.snapshot||!n.importProposal))try{await h.applyDraft([ce(n.importProposal,n.importSelection)],{configPath:n.snapshot.configPath}),n.importProposal=null,n.importSelection={},s.importStatus.textContent="Applied reviewed mappings into the draft manifest.",W()}catch(e){s.importStatus.textContent=e instanceof Error?e.message:"Import apply failed."}});s.tokenFilter.addEventListener("input",()=>{n.tokenFilter=s.tokenFilter.value.toLowerCase(),v()});s.clearHighlight.addEventListener("click",()=>{n.highlightedToken=null,g({kind:"highlight-token",tokenId:null}),v()});s.scanCoverage.addEventListener("click",()=>{n.snapshot&&(s.coverageSummary.textContent="Scanning...",g({kind:"scan-coverage",tokenColors:ve(),aliases:n.snapshot.manifest.aliases}))});s.scanContrast.addEventListener("click",()=>{n.snapshot&&(s.contrastSummary.textContent="Auditing...",g({kind:"scan-contrast",tokenColors:ve(),aliases:n.snapshot.manifest.aliases}))});s.overrideToken.addEventListener("change",()=>{n.overrideTokenId=s.overrideToken.value,z(),J()});s.overrideMode.addEventListener("change",()=>{n.overrideMode=s.overrideMode.value});s.overridePersist.addEventListener("change",()=>{n.persistOverride=s.overridePersist.checked});s.clearOverrides.addEventListener("click",()=>{g({kind:"clear-all-overrides"})});s.pushOverride.addEventListener("click",async()=>{if(n.overrideTokenId)try{await h.pushOverride(n.overrideTokenId,n.overrideMode,n.overrideColor,{persist:n.persistOverride,configPath:n.snapshot?.configPath})}catch(e){m("error",e instanceof Error?e.message:"push failed")}});s.bridgeBtn.addEventListener("click",async()=>{let e=s.bridgeInput.value.trim();e&&(await Ie(e),h.stop(),h.start())});function C(){return n.snapshot?de(n.snapshot,n.activeMode,n.pageInfo.theme):"light"}function ve(){if(!n.snapshot)return{};let e=n.snapshot.resolved[C()],t={};for(let[o,r]of Object.entries(e.colors))t[o]=r.css;return t}function G(){n.snapshot&&g({kind:"update-snapshot",snapshot:n.snapshot})}function S(){Pe(),ke(),T(),De(),H(),Ne(),W(),v(),Ee(),Te(),Ue(),!n.overrideTokenId&&n.snapshot&&(n.overrideTokenId=Object.keys(n.snapshot.manifest.tokens)[0]??"",z()),J()}function Pe(){if(!n.snapshot){s.draftStatus.textContent="Waiting for bridge snapshot...";return}let e=n.snapshot.draft.dirty?`Draft dirty \xB7 base v${n.snapshot.draft.baseVersion} \xB7 last edit ${n.snapshot.draft.lastEditor}`:`Draft clean \xB7 synced at v${n.snapshot.version}`;s.draftStatus.textContent=e}function ke(){s.pageInfo.textContent=n.pageInfo.url?`Inspecting: ${n.pageInfo.title||"(untitled)"} \u2014 ${n.pageInfo.url} \xB7 data-theme=${n.pageInfo.theme??"(none)"}`:"Waiting for inspected page to load..."}function y(e){return e?`<span class="swatch" style="background:${c(e)}"></span>`:""}function He(e){return`
    <div class="token-match-list">
      ${e.matches.map(t=>{let o=t.tokenId?c(t.tokenId):"No token match",r=t.aliases.length?` \xB7 ${c(t.aliases.join(", "))}`:"",a=t.tokenId?`<button type="button" data-focus-token="${c(t.tokenId)}">${o}</button>`:o;return`
            <div class="report-item">
              <span>
                <strong>${c(t.channel)}</strong>
                <div class="meta">${c(t.cssValue??"\u2014")}</div>
              </span>
              <span class="token-chip">${y(t.cssValue)} ${a}</span>
              <span class="meta">${r||"\u2014"}</span>
            </div>
          `}).join("")}
    </div>
  `}function we(e){e.querySelectorAll("[data-focus-token]").forEach(t=>{t.addEventListener("click",()=>{let o=t.dataset.focusToken;o&&je(o,!0,!0)})})}function me(e,t,o){if(!t){e.innerHTML=`<p class="empty-state">${c(o)}</p>`;return}let r=t.contrastLc===null?"\u2014":`${t.contrastLc.toFixed(1)} Lc`;e.innerHTML=`
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${c(t.selector)}</code></dd>
      <dt>Colors</dt><dd>${y(t.computedColor)} <code>${c(t.computedColor??"\u2014")}</code></dd>
      <dt>Background</dt><dd>${y(t.computedBackground)} <code>${c(t.computedBackground??"\u2014")}</code></dd>
      <dt>Border</dt><dd>${y(t.computedBorder)} <code>${c(t.computedBorder??"\u2014")}</code></dd>
      <dt>APCA</dt><dd>${r}</dd>
    </dl>
    <p class="report-subhead">Matched channels</p>
    ${He(t)}
  `,we(e)}function T(){me(s.selectionDetails,n.selectedElement,"Click a page element while inspect mode is enabled to lock its context."),me(s.hoverDetails,n.hoveredElement,"Move your mouse over the inspected page to preview live token info.")}function I(){return n.snapshot?Object.values(n.snapshot.manifest.tokens):[]}function P(e){return n.snapshot?.manifest.tokens[e]??null}function Be(e,t){return t==="dark"?e.dark:e.light}function he(e,t){let o=Z(t),r=b(t),a=O({r:r.r,g:r.g,b:r.b}),l=U(a);return`
    <div class="picker-shell">
      <div class="picker-stack">
        <div class="picker-input-row">
          <div class="picker-inputs">
            <input
              type="text"
              value="${c(o)}"
              class="picker-input"
              spellcheck="false"
              aria-label="${e} anchor hex color"
              data-picker-input="hex"
              data-picker-mode="${e}"
            />
            <input
              type="text"
              value="${c(R({r:r.r,g:r.g,b:r.b}))}"
              class="picker-input"
              spellcheck="false"
              aria-label="${e} anchor rgb color"
              data-picker-input="rgb"
              data-picker-mode="${e}"
            />
          </div>
          <div class="picker-swatch-preview" style="background-color:${c(o)}"></div>
        </div>
        <div
          class="picker-panel"
          style="background:${xe}"
          role="slider"
          tabindex="0"
          aria-label="${e} anchor hue and brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${Math.round(a.v)}"
          aria-valuetext="${c(`Hue: ${Math.round(a.h)}\xB0, Saturation: ${Math.round(a.s)}%, Value: ${Math.round(a.v)}%`)}"
          data-picker-plane="${e}"
        >
          <div
            class="picker-handle"
            style="left:${l.xPercent}; top:${l.yPercent};"
          ></div>
        </div>
      </div>
    </div>
  `}function De(){if(!n.snapshot){s.editorToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=I();s.editorToken.innerHTML=e.map(t=>`<option value="${t.id}">${c(t.label)} (${t.id})</option>`).join(""),n.focusedTokenId||(n.focusedTokenId=e[0]?.id??""),s.editorToken.value=n.focusedTokenId}function f(e,t,o,r,a,l){return`
    <div class="slider-row">
      <span>${t.toUpperCase()}</span>
      <input
        type="range"
        min="${r}"
        max="${a}"
        step="${l}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
      <input
        type="number"
        min="${r}"
        max="${a}"
        step="${l}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
    </div>
  `}async function Ae(e,t,o,r){let a=P(e);if(!a||!n.snapshot)return;let l={...t==="dark"?a.dark:a.light,[o]:r};await x(e,t,l)}async function x(e,t,o){n.snapshot&&await h.applyDraft([oe(e,t,o)],{configPath:n.snapshot.configPath})}async function ye(e,t,o,r,a){let l=ee({h:o,s:r,v:a});await x(e,t,L(l.r,l.g,l.b))}async function be(e,t,o,r,a){let l=j(o.width,o.height,r-o.left,a-o.top);await ye(e,t,l.h,l.s,l.v)}function E(e,t){e.classList.toggle("is-invalid",t)}function V(e){return e==="light"||e==="dark"?e:null}function Re(e){s.tokenEditor.querySelectorAll("[data-slider-prefix]").forEach(t=>{t.addEventListener("input",async()=>{let o=t.dataset.sliderPrefix,r=t.dataset.channel;if(!(!o||!r))try{await Ae(e,o,r,Number(t.value))}catch(a){m("error",a instanceof Error?a.message:"token update failed")}})}),s.tokenEditor.querySelectorAll("[data-picker-input]").forEach(t=>{t.addEventListener("input",()=>{E(t,!1)});let o=async()=>{let r=V(t.dataset.pickerMode);if(r)try{if(t.dataset.pickerInput==="hex"){let l=N(t.value),i=l?ne(l):null;if(!l||!i){E(t,!0);return}E(t,!1),t.value=l,await x(e,r,L(i.r,i.g,i.b));return}let a=te(t.value);if(!a){E(t,!0);return}E(t,!1),t.value=R(a),await x(e,r,L(a.r,a.g,a.b))}catch(a){m("error",a instanceof Error?a.message:"token update failed")}};t.addEventListener("blur",()=>{o()}),t.addEventListener("keydown",r=>{r.key==="Enter"&&(r.preventDefault(),o())})}),s.tokenEditor.querySelectorAll("[data-picker-plane]").forEach(t=>{t.addEventListener("pointerdown",o=>{let r=V(t.dataset.pickerPlane);!r||!(o.currentTarget instanceof HTMLDivElement)||(n.pickerDrag={tokenId:e,mode:r,rect:o.currentTarget.getBoundingClientRect()},be(e,r,n.pickerDrag.rect,o.clientX,o.clientY).catch(a=>{m("error",a instanceof Error?a.message:"token update failed")}))}),t.addEventListener("keydown",o=>{let r=V(t.dataset.pickerPlane);if(!r)return;let a=P(e);if(!a)return;let l=Be(a,r),i=b(l),d=O({r:i.r,g:i.g,b:i.b}),p=U(d),u=Number.parseFloat(p.xPercent),w=Number.parseFloat(p.yPercent);if(o.key==="ArrowLeft")u-=2;else if(o.key==="ArrowRight")u+=2;else if(o.key==="ArrowUp")w-=2;else if(o.key==="ArrowDown")w+=2;else return;o.preventDefault();let B=j(100,100,u,w);ye(e,r,B.h,B.s,B.v).catch(X=>{m("error",X instanceof Error?X.message:"token update failed")})})}),s.tokenEditor.querySelectorAll("[data-token-exception], [data-token-max-chroma]").forEach(t=>{let o=async()=>{try{let r=s.tokenEditor.querySelector("[data-token-exception]")?.value,a=s.tokenEditor.querySelector("[data-token-max-chroma]")?.value;await h.applyDraft([re(e,{altBehavior:r,maxChroma:a===""?null:Number(a)})],{configPath:n.snapshot?.configPath})}catch(r){m("error",r instanceof Error?r.message:"exception update failed")}};t.addEventListener("change",o),t.addEventListener("input",o)})}function Oe(){s.modeEditor.querySelectorAll("[data-alt-setting]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let o=e.dataset.altSetting;if(!o)return;let r;o==="source"?r={source:e.value}:o==="harmonyLock"?r={harmonyLock:e.checked}:o==="grayscalePreview"?r={grayscalePreview:e.checked}:r={delta:{[o]:Number(e.value)}};try{await h.applyDraft([ae(r)],{configPath:n.snapshot.configPath})}catch(a){m("error",a instanceof Error?a.message:"alt update failed")}};e.addEventListener("change",t),e.addEventListener("input",t)})}function H(){if(!n.snapshot||!n.focusedTokenId){s.tokenEditor.innerHTML='<p class="empty-state">Select a token to edit it.</p>',s.modeEditor.innerHTML='<p class="empty-state">Connect to the engine to edit theme state.</p>',s.tokenValidation.innerHTML='<p class="empty-state">No validation details yet.</p>';return}let e=P(n.focusedTokenId);if(!e){s.tokenEditor.innerHTML='<p class="empty-state">Selected token is unavailable.</p>';return}let t=C(),o=n.snapshot.resolved[t].colors[e.id],r=pe(n.snapshot,e.id,t);s.tokenEditor.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(k(o))}"></span>
      <div>
        <strong>${c(e.label)}</strong>
        <div class="meta">${c(e.description)}</div>
        <code>${c(F(o))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      <div class="anchor-editor-layout">
        ${he("light",e.light)}
        <div class="anchor-slider-stack">
          ${f("light","l",e.light.l,0,1,.005)}
          ${f("light","c",e.light.c,0,.37,.005)}
          ${f("light","h",e.light.h,0,360,1)}
        </div>
      </div>
    </div>
    <div class="editor-block">
      <h3>Dark anchor</h3>
      <div class="anchor-editor-layout">
        ${he("dark",e.dark)}
        <div class="anchor-slider-stack">
          ${f("dark","l",e.dark.l,0,1,.005)}
          ${f("dark","c",e.dark.c,0,.37,.005)}
          ${f("dark","h",e.dark.h,0,360,1)}
        </div>
      </div>
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
      <div class="meta">${e.altParent?`Alt derives from ${c(e.altParent)}.`:"No alt parent override."}</div>
    </div>
  `,s.modeEditor.innerHTML=`
    <div class="editor-block">
      <div class="field-grid">
        <label class="field-block">
          <span>Alt base</span>
          <select data-alt-setting="source">
            <option value="light" ${n.snapshot.manifest.alt.source==="light"?"selected":""}>Derive from Light</option>
            <option value="dark" ${n.snapshot.manifest.alt.source==="dark"?"selected":""}>Derive from Dark</option>
          </select>
        </label>
        <label class="field-block">
          <span>Lock harmony</span>
          <input type="checkbox" ${n.snapshot.manifest.alt.harmonyLock?"checked":""} data-alt-setting="harmonyLock" />
        </label>
      </div>
      <label class="switch">
        <input type="checkbox" ${n.snapshot.manifest.alt.grayscalePreview?"checked":""} data-alt-setting="grayscalePreview" />
        <span>Greyscale hierarchy overlay</span>
      </label>
    </div>
    <div class="editor-block">
      <h3>Alt deltas</h3>
      ${f("alt","h",n.snapshot.manifest.alt.delta.h,-180,180,1).replaceAll('data-slider-prefix="alt"','data-alt-setting="h"')}
      ${f("alt","c",n.snapshot.manifest.alt.delta.c,-.16,.16,.005).replaceAll('data-slider-prefix="alt"','data-alt-setting="c"')}
      ${f("alt","l",n.snapshot.manifest.alt.delta.l,-.2,.2,.01).replaceAll('data-slider-prefix="alt"','data-alt-setting="l"')}
    </div>
  `,s.tokenValidation.innerHTML=r.length?`<div class="report-list">${r.map(a=>`<div class="report-item severity-warn"><span>${c(a)}</span><span></span><span></span></div>`).join("")}</div>`:'<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>',Re(e.id),Oe()}function Ne(){if(!n.snapshot){s.aliasList.innerHTML='<p class="empty-state">Connect to the engine to edit aliases.</p>';return}if(n.snapshot.manifest.aliases.length===0){s.aliasList.innerHTML='<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';return}s.aliasList.innerHTML=`
    <div class="alias-list">
      ${n.snapshot.manifest.aliases.map((e,t)=>`
            <div class="alias-row">
              <input type="text" value="${c(e.name)}" data-alias-index="${t}" data-alias-field="name" />
              <select data-alias-index="${t}" data-alias-field="tokenId">
                ${I().map(o=>`
                      <option value="${o.id}" ${o.id===e.tokenId?"selected":""}>
                        ${c(o.label)}
                      </option>
                    `).join("")}
              </select>
              <button type="button" data-remove-alias="${t}" class="secondary">Remove</button>
            </div>
          `).join("")}
    </div>
  `,s.aliasList.querySelectorAll("[data-alias-index]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let o=Number(e.dataset.aliasIndex),r=e.dataset.aliasField==="name"?{name:e.value}:{tokenId:e.value};try{await h.applyDraft([se(o,r)],{configPath:n.snapshot.configPath})}catch(a){m("error",a instanceof Error?a.message:"alias update failed")}};e.addEventListener("input",t),e.addEventListener("change",t)}),s.aliasList.querySelectorAll("[data-remove-alias]").forEach(e=>{e.addEventListener("click",async()=>{if(!n.snapshot)return;let t=Number(e.dataset.removeAlias);try{await h.applyDraft([ie(t)],{configPath:n.snapshot.configPath})}catch(o){m("error",o instanceof Error?o.message:"alias remove failed")}})})}function W(){if(!n.importProposal){s.importReview.innerHTML='<p class="empty-state">Add a source CSS path, scan it, then review mappings before applying them to the draft.</p>';return}s.importReview.innerHTML=`
    <div class="import-list">
      ${n.importProposal.candidates.map(e=>`
            <div class="import-card">
              <div>
                <strong>--${c(e.sourceName)}</strong>
                <div class="meta">${c(e.rawValue)}</div>
                <div class="meta">${c(e.reason)}</div>
              </div>
              <select data-import-source="${c(e.sourceName)}">
                <option value="">Skip mapping</option>
                ${I().map(t=>`
                      <option value="${t.id}" ${n.importSelection[e.sourceName]===t.id?"selected":""}>
                        ${c(t.label)}
                      </option>
                    `).join("")}
              </select>
              <span class="token-chip">${y(e.light?k(e.light):null)} ${y(e.dark?k(e.dark):null)}</span>
            </div>
          `).join("")}
    </div>
  `,s.importReview.querySelectorAll("[data-import-source]").forEach(e=>{e.addEventListener("change",()=>{let t=e.dataset.importSource;t&&(n.importSelection[t]=e.value)})})}function je(e,t=!1,o=!1){n.focusedTokenId=e,o&&Y("authoring"),t&&(n.highlightedToken=e,g({kind:"reveal-token-usage",tokenId:e})),H(),v()}function v(){if(!n.snapshot){s.tokenList.innerHTML='<p class="empty-state">Connect to the engine to load tokens.</p>';return}let e=C(),t=n.snapshot.resolved[e],o=n.tokenFilter,r=[];for(let a of n.snapshot.tokenGroups){let l=(n.snapshot.tokensByGroup[a]??[]).filter(i=>i.includes(o));if(l.length){r.push(`<div class="token-group-heading">${c(a)}</div>`);for(let i of l){let d=n.snapshot.manifest.tokens[i];if(!d)continue;let p=n.coverage?.byToken[i],u=["token-row",n.highlightedToken===i?"is-highlighted":"",n.focusedTokenId===i?"is-focused":""].filter(Boolean).join(" ");r.push(`
        <button class="${u}" data-token-id="${i}" type="button">
          <span class="swatch" style="background:${c(t.colors[i]?.css??"")}"></span>
          <div>
            <div class="token-name">${c(d.label)}</div>
            <div class="token-value">${c(i)} \xB7 ${c(t.colors[i]?.css??"")}</div>
          </div>
          <span class="token-count">${p===void 0?"\xB7":`${p} used`}</span>
          <span aria-hidden="true">\u203A</span>
        </button>
      `)}}}s.tokenList.innerHTML=r.join(""),s.tokenList.querySelectorAll("[data-token-id]").forEach(a=>{a.addEventListener("click",()=>{let l=a.dataset.tokenId;if(!l)return;let i=n.highlightedToken===l?null:l;n.highlightedToken=i,n.focusedTokenId=l,g({kind:"highlight-token",tokenId:i}),v(),H()})})}function Ee(){let e=n.coverage;if(!e){s.coverageOutput.innerHTML='<p class="empty-state">Run a scan to see token usage.</p>',s.coverageSummary.textContent="";return}let t=Object.entries(e.byToken).filter(([,i])=>i>0).length,o=Object.keys(e.byToken).length,r=[...Object.entries(e.byToken)].filter(([,i])=>i>0).sort((i,d)=>d[1]-i[1]).slice(0,20),a=e.unusedTokens.slice(0,20),l=e.rawColorViolations.slice(0,20);s.coverageSummary.textContent=`${e.totalElements} elements \xB7 ${t}/${o} tokens used \xB7 ${e.rawColorViolations.length} raw colors`,s.coverageOutput.innerHTML=`
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${r.map(([i,d])=>`<div class="report-item"><span>${c(i)}</span><span class="meta">${d} elements</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Unused tokens (${a.length})</p>
    <div class="report-list">
      ${a.map(i=>`<div class="report-item"><span>${c(i)}</span><span class="meta">0</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Raw color violations (${l.length})</p>
    <div class="report-list">
      ${l.map(i=>`
            <div class="report-item severity-warn">
              <span><code>${c(i.selector)}</code></span>
              <span class="meta">${c(i.property)}: ${c(i.value)}</span>
              <span></span>
            </div>
          `).join("")}
    </div>
  `}function Te(){if(!n.contrast){s.contrastSummary.textContent="",s.contrastOutput.innerHTML='<p class="empty-state">Run an audit to surface APCA issues.</p>';return}if(s.contrastSummary.textContent=`${n.contrast.sampled} sampled \xB7 ${n.contrast.findings.length} potential failures`,!n.contrast.findings.length){s.contrastOutput.innerHTML='<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';return}s.contrastOutput.innerHTML=`
    <div class="report-list">
      ${n.contrast.findings.map(e=>`
            <div class="report-item severity-${e.severity}">
              <span>
                <code>${c(e.selector)}</code>
                <div class="meta">${c(e.context||"\u2014")}</div>
              </span>
              <span class="meta">fg ${c(e.foregroundToken??e.foreground)} \xB7 bg ${c(e.backgroundToken??e.background)}</span>
              <span class="meta">${e.contrastLc.toFixed(1)} Lc</span>
            </div>
          `).join("")}
    </div>
  `}function Ue(){if(!n.snapshot){s.overrideToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=I();s.overrideToken.innerHTML=e.map(t=>`<option value="${t.id}">${c(t.label)} (${t.id})</option>`).join(""),n.overrideTokenId&&(s.overrideToken.value=n.overrideTokenId)}function z(){if(!n.snapshot||!n.overrideTokenId)return;let e=P(n.overrideTokenId);if(!e)return;let t=C();if(t==="alt"){let o=n.snapshot.resolved.alt.colors[n.overrideTokenId];if(o){n.overrideColor={l:o.l,c:o.c,h:o.h,alpha:o.alpha};return}}n.overrideColor={...t==="dark"?e.dark:e.light}}function J(){if(!n.snapshot){s.overrideSliders.innerHTML='<p class="empty-state">Connect to the engine to use overrides.</p>';return}let e=n.overrideColor,t=k(e),o=[{key:"l",label:"L",min:0,max:1,step:.001},{key:"c",label:"C",min:0,max:.4,step:.001},{key:"h",label:"H",min:0,max:360,step:.1}];s.overrideSliders.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(t)}"></span>
      <div>
        <strong>${c(n.overrideTokenId||"Choose a token")}</strong>
        <code>${c(F(e))}</code>
      </div>
    </div>
    <div class="editor-block">
      ${o.map(r=>`
            <div class="slider-row">
              <span>${r.label}</span>
              <input type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${e[r.key]}" data-override-channel="${r.key}" />
              <span class="readout">${e[r.key].toFixed(r.key==="h"?2:3)}</span>
            </div>
          `).join("")}
    </div>
  `,s.overrideSliders.querySelectorAll("[data-override-channel]").forEach(r=>{r.addEventListener("input",()=>{let a=r.dataset.overrideChannel;a&&(n.overrideColor={...n.overrideColor,[a]:Number(r.value)},J(),n.overrideTokenId&&g({kind:"override-token",tokenId:n.overrideTokenId,css:k(n.overrideColor)}))})})}function c(e){return e.replace(/[&<>"']/g,t=>{switch(t){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}window.addEventListener("pointermove",e=>{n.pickerDrag&&be(n.pickerDrag.tokenId,n.pickerDrag.mode,n.pickerDrag.rect,e.clientX,e.clientY).catch(t=>{m("error",t instanceof Error?t.message:"token update failed")})});window.addEventListener("pointerup",()=>{n.pickerDrag=null});(async()=>(await Se(),h.start(),g({kind:"ping"}),S()))();})();
