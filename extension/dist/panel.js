"use strict";(()=>{var C=class{constructor(t){this.options=t}options;source=null;retryTimer=null;retryDelay=1e3;stopped=!1;start(){this.stopped=!1,this.connect()}stop(){this.stopped=!0,this.retryTimer&&(clearTimeout(this.retryTimer),this.retryTimer=null),this.source&&(this.source.close(),this.source=null)}async fetchSnapshot(t=this.requireConfigPath()){let r=await fetch(this.snapshotUrl(t),{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Snapshot request failed with status ${r.status}`);return await r.json()}async fetchBridgeConfig(t=this.requireConfigPath()){let r=await fetch(`${this.options.getBaseUrl()}/api/bridge/config?configPath=${encodeURIComponent(t)}`,{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Bridge config request failed with status ${r.status}`);return await r.json()}async updateBridgeConfig(t,r={}){let a=r.configPath??this.requireConfigPath(),o=await fetch(`${this.options.getBaseUrl()}/api/bridge/config`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:a,bridgeEnabled:t})});if(!o.ok)throw new Error(`Bridge config update failed with status ${o.status}`);return await o.json()}async pushOverride(t,r,a,o={}){let s=o.configPath??this.requireConfigPath(),l=await fetch(`${this.options.getBaseUrl()}/api/bridge/token`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tokenId:t,mode:r,color:a,persist:o.persist??!1,configPath:s})});if(!l.ok)throw new Error(`Override failed with status ${l.status}`)}async applyDraft(t,r={}){let a=r.configPath??this.requireConfigPath(),o=await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:a,commands:t})});if(!o.ok)throw new Error(`Draft update failed with status ${o.status}`)}async commitDraft(t={}){let r=t.configPath??this.requireConfigPath(),a=await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r})});if(!a.ok)throw new Error(`Commit failed with status ${a.status}`)}async discardDraft(t={}){let r=t.configPath??this.requireConfigPath(),a=await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r})});if(!a.ok)throw new Error(`Discard failed with status ${a.status}`)}connect(){if(this.stopped)return;let t=this.options.getConfigPath().trim();if(!t){this.options.onStatus("idle","choose target config");return}this.options.onStatus("connecting");let r=this.eventsUrl(t);try{this.source=new EventSource(r)}catch(a){this.options.onStatus("error",a instanceof Error?a.message:"Unable to connect"),this.scheduleReconnect();return}this.source.addEventListener("hello",a=>{this.retryDelay=1e3,this.options.onStatus("connected"),this.handleSnapshotEvent(a)}),this.source.addEventListener("snapshot",a=>{this.handleSnapshotEvent(a)}),this.source.addEventListener("ping",()=>{}),this.source.onerror=()=>{this.options.onStatus("error","Stream disconnected"),this.source?.close(),this.source=null,this.scheduleReconnect()}}handleSnapshotEvent(t){try{let r=JSON.parse(t.data);r.snapshot&&this.options.onSnapshot(r.snapshot)}catch{}}scheduleReconnect(){this.stopped||(this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=setTimeout(()=>{this.retryDelay=Math.min(this.retryDelay*2,15e3),this.connect()},this.retryDelay))}requireConfigPath(){let t=this.options.getConfigPath().trim();if(!t)throw new Error("Choose a target project config first.");return t}snapshotUrl(t){return`${this.options.getBaseUrl()}/api/bridge/snapshot?configPath=${encodeURIComponent(t)}`}eventsUrl(t){return`${this.options.getBaseUrl()}/api/bridge/events?configPath=${encodeURIComponent(t)}`}};var X="http://localhost:5173",f={bridgeUrl:"semanticColors.bridgeUrl",targetConfigPath:"semanticColors.targetConfigPath",recentTargetConfigPaths:"semanticColors.recentTargetConfigPaths"};function O(e){let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4}function H(e){let t=e<=.0031308?e*12.92:1.055*Math.pow(e,.4166666666666667)-.055;return Math.max(0,Math.min(255,Math.round(t*255)))}function Pe(e,t,r){let a=e+.3963377774*t+.2158037573*r,o=e-.1055613458*t-.0638541728*r,s=e-.0894841775*t-1.291485548*r,l=a**3,c=o**3,u=s**3;return[4.0767416621*l-3.3077115913*c+.2309699292*u,-1.2684380046*l+2.6097574011*c-.3413193965*u,-.0041960863*l-.7034186147*c+1.707614701*u]}function Me(e,t,r){let a=Math.cbrt(.4122214708*e+.5363325363*t+.0514459929*r),o=Math.cbrt(.2119034982*e+.6806995451*t+.1073969566*r),s=Math.cbrt(.0883024619*e+.2817188376*t+.6299787005*r);return[.2104542553*a+.793617785*o-.0040720468*s,1.9779984951*a-2.428592205*o+.4505937099*s,.0259040371*a+.7827717662*o-.808675766*s]}function y(e){let t=e.h*Math.PI/180,r=e.c*Math.cos(t),a=e.c*Math.sin(t),[o,s,l]=Pe(e.l,r,a);return{r:H(o),g:H(s),b:H(l),alpha:e.alpha??1}}function K(e,t,r,a=1){let[o,s,l]=Me(O(e),O(t),O(r)),c=Math.sqrt(s*s+l*l),u=Math.atan2(l,s)*180/Math.PI;return u<0&&(u+=360),{l:o,c,h:u,alpha:a}}function Q(e){let t=e%360;return t<0?t+360:t}function Se(e){return`#${[e.r,e.g,e.b].map(t=>Math.max(0,Math.min(255,Math.round(t))).toString(16).padStart(2,"0")).join("").toUpperCase()}`}function Z(e){let{r:t,g:r,b:a}=y(e);return Se({r:t,g:r,b:a})}function D(e){let t=e.r/255,r=e.g/255,a=e.b/255,o=Math.max(t,r,a),s=Math.min(t,r,a),l=o-s,c=0;return l!==0&&(o===t?c=(r-a)/l%6:o===r?c=(a-t)/l+2:c=(t-r)/l+4,c*=60,c<0&&(c+=360)),{h:c,s:o===0?0:l/o*100,v:o*100}}function ee(e){let t=Math.max(0,Math.min(100,e.s))/100,r=Math.max(0,Math.min(100,e.v))/100,a=Q(e.h),o=r*t,s=o*(1-Math.abs(a/60%2-1)),l=r-o,c,u,h;return a<60?[c,u,h]=[o,s,0]:a<120?[c,u,h]=[s,o,0]:a<180?[c,u,h]=[0,o,s]:a<240?[c,u,h]=[0,s,o]:a<300?[c,u,h]=[s,0,o]:[c,u,h]=[o,0,s],{r:Math.round((c+l)*255),g:Math.round((u+l)*255),b:Math.round((h+l)*255)}}function A(e,t,r,a){let o=Math.max(e,1),s=Math.max(t,1),l=Math.max(0,Math.min(o,r)),u=Math.max(0,Math.min(s,a))/s,h=u<=.5;return{h:l/o*360,s:h?100:100-(u-.5)/.5*100,v:h?u/.5*100:100}}function R(e){let t=Q(e.h),r=Math.max(0,Math.min(100,e.s)),a=Math.max(0,Math.min(100,e.v));return{xPercent:`${t/360*100}%`,yPercent:a>=99.5?`${50+(100-r)/100*50}%`:`${a/100*50}%`}}function P(e){let{r:t,g:r,b:a,alpha:o}=y(e);return o<1?`rgba(${t}, ${r}, ${a}, ${o.toFixed(3)})`:`rgb(${t}, ${r}, ${a})`}function U(e){let t=(e.l*100).toFixed(2),r=e.c.toFixed(4),a=e.h.toFixed(2),o=e.alpha!==void 0&&e.alpha<1?` / ${e.alpha.toFixed(2)}`:"";return`oklch(${t}% ${r} ${a}${o})`}function te(e,t,r){return{kind:"update-token-color",tokenId:e,mode:t,color:r}}function ne(e,t){return{kind:"update-token-exception",tokenId:e,patch:t}}function re(e){return{kind:"update-alt-settings",patch:e}}function N(e,t){return{kind:"add-alias",alias:{name:e,tokenId:t}}}function ae(e,t){return{kind:"update-alias",index:e,patch:t}}function oe(e){return{kind:"remove-alias",index:e}}function ie(){return{kind:"reset-manifest"}}function se(e,t,r){return t||(r==="dark"||r==="alt"?r:(e.manifest.alt.source==="dark"&&r==="light","light"))}function le(e,t,r){let a=e.validations[r]?.perToken[t];if(!a)return[];let o=[];return a.gamutAdjusted&&o.push("Adjusted to stay in display gamut."),o.push(...a.contrastIssues),o}function _(e){let t=e?.semanticClassMatches?.[0]?.tokenId;return t||(e?.matches.find(r=>r.tokenId)?.tokenId??null)}function ce(e){return`panel:${e}`}var ge=chrome.devtools.inspectedWindow.tabId,xe="linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",we={l:"Lightness",c:"Chroma",h:"Hue"},Le=12e3,$e=12e3,n={bridgeUrl:X,targetConfigPath:"",recentTargetConfigPaths:[],snapshot:null,coverage:null,contrast:null,highlightedToken:null,focusedTokenId:"",overrideTokenId:"",overrideColor:{l:.5,c:.1,h:240,alpha:1},overrideMode:"both",persistOverride:!1,activeMode:null,hoverActive:!1,selectedElement:null,pageInfo:{url:"",title:"",theme:null},bridgeOutputEnabled:null,bridgeOutputPending:!1,bridgeOutputStatus:"Load target config",inPageDrawerVisible:!1,coverageScanTimeout:null,contrastAuditTimeout:null,pickerDrag:null},i={status:document.getElementById("bridge-status"),bridgeInput:document.getElementById("bridge-url"),bridgeBtn:document.getElementById("bridge-connect"),targetConfigInput:document.getElementById("target-config-path"),targetConfigLoad:document.getElementById("target-config-load"),bridgeOutputEnabled:document.getElementById("bridge-output-enabled"),bridgeOutputStatus:document.getElementById("bridge-output-status"),toggleInPageDrawer:document.getElementById("toggle-inpage-drawer"),inPageDrawerStatus:document.getElementById("inpage-drawer-status"),targetConfigOptions:document.getElementById("recent-target-configs"),modeSwitch:document.querySelector(".mode-switch"),draftStatus:document.getElementById("draft-status"),commitDraft:document.getElementById("commit-draft"),discardDraft:document.getElementById("discard-draft"),resetManifest:document.getElementById("reset-manifest"),tabs:document.querySelectorAll(".tabs button"),tabPanels:document.querySelectorAll("[data-tab-panel]"),hoverToggle:document.getElementById("hover-toggle"),clearSelection:document.getElementById("clear-selection"),editorToken:document.getElementById("editor-token"),tokenEditor:document.getElementById("token-editor"),tokenValidation:document.getElementById("token-validation"),modeEditor:document.getElementById("mode-editor"),aliasList:document.getElementById("alias-list"),addAlias:document.getElementById("add-alias"),addAliasCurrent:document.getElementById("add-alias-current"),scanCoverage:document.getElementById("scan-coverage"),coverageSummary:document.getElementById("coverage-summary"),coverageOutput:document.getElementById("coverage-output"),scanContrast:document.getElementById("scan-contrast"),contrastSummary:document.getElementById("contrast-summary"),contrastOutput:document.getElementById("contrast-output"),overrideToken:document.getElementById("override-token"),overrideSliders:document.getElementById("override-sliders"),overrideMode:document.getElementById("override-mode"),overridePersist:document.getElementById("override-persist"),clearOverrides:document.getElementById("clear-overrides"),pushOverride:document.getElementById("push-override")},b=null;function Ie(e){let t=e;t?.source==="content"&&he(t.payload)}function Be(){let e;try{e=chrome.runtime.connect({name:ce(ge)})}catch(t){return console.warn("[semantic-colors] panel port connect failed:",t),null}try{e.onMessage.addListener(Ie),e.onDisconnect.addListener(()=>{b===e&&(b=null)})}catch(t){console.warn("[semantic-colors] panel port listener bind failed:",t);try{e.disconnect()}catch{}return null}return b=e,e}function Oe(){return b??Be()}function pe(e,t=!0){let r=Oe();if(!r)return!1;try{return r.postMessage(e),!0}catch(a){return console.warn("[semantic-colors] panel port send failed:",a),t?(b===r&&(b=null),pe(e,!1)):!1}}function m(e){pe({source:"panel",tabId:ge,payload:e})||he({kind:"error",message:"Extension relay disconnected. Retry the scan."})}function M(){n.coverageScanTimeout!==null&&(window.clearTimeout(n.coverageScanTimeout),n.coverageScanTimeout=null)}function S(){n.contrastAuditTimeout!==null&&(window.clearTimeout(n.contrastAuditTimeout),n.contrastAuditTimeout=null)}function he(e){switch(e.kind){case"hello":case"page-info":n.pageInfo={url:e.url,title:e.title,theme:"theme"in e?e.theme:null},n.snapshot&&L(),n.inPageDrawerVisible&&m({kind:"set-inpage-drawer",visible:!0});break;case"hover-element":break;case"selected-element":{n.selectedElement=e.payload;let t=e.payload.semanticClassMatches[0]?.tokenId??null,r=_(e.payload);t?n.focusedTokenId=t:r&&(n.focusedTokenId=r),w("authoring"),E();break}case"hover-cleared":break;case"selection-cleared":n.selectedElement=null;break;case"inpage-drawer-state":n.inPageDrawerVisible=e.visible,F();break;case"inpage-token-focus":He(e.tokenId,e.source);break;case"coverage-report":M(),n.coverage=e.report,Ee();break;case"contrast-report":S(),n.contrast=e.report,Ce();break;case"error":console.warn("[semantic-colors] content error:",e.message),i.coverageSummary.textContent==="Scanning..."&&(M(),i.coverageSummary.textContent=`Scan failed: ${e.message}`),i.contrastSummary.textContent==="Auditing..."&&(S(),i.contrastSummary.textContent=`Audit failed: ${e.message}`);break}}function He(e,t){Ge(e,!0,!0),t==="preview"&&m({kind:"focus-token",tokenId:e})}var g=new C({getBaseUrl:()=>n.bridgeUrl,getConfigPath:()=>n.targetConfigPath,onStatus:p,onSnapshot:e=>{n.snapshot=e,e.configPath!==n.targetConfigPath&&x(e.configPath).then(()=>{T()}),n.focusedTokenId||(n.focusedTokenId=_(n.selectedElement)??Object.keys(e.manifest.tokens)[0]??""),E(),L()}});function p(e,t){i.status.className=`status status-${e}`,i.status.textContent=t?`${e} \xB7 ${t}`:e}function me(){return n.snapshot?.configPath??n.targetConfigPath.trim()}function j(e){return n.targetConfigPath?n.bridgeOutputPending?"Updating...":e?e.bridgeEnabled?"Enabled: save/commit writes CSS":"Disabled: save/commit skips CSS":n.bridgeOutputEnabled===!0?"Enabled: save/commit writes CSS":n.bridgeOutputEnabled===!1?"Disabled: save/commit skips CSS":n.bridgeOutputStatus:"Load target config"}function k(){let e=n.targetConfigPath.length>0;i.bridgeOutputEnabled.disabled=!e||n.bridgeOutputPending,i.bridgeOutputEnabled.indeterminate=e&&n.bridgeOutputEnabled===null,i.bridgeOutputEnabled.checked=n.bridgeOutputEnabled??!1,i.bridgeOutputStatus.textContent=j()}function F(){i.toggleInPageDrawer.textContent=n.inPageDrawerVisible?"Hide in-page preview":"Show in-page preview",i.inPageDrawerStatus.textContent=n.inPageDrawerVisible?"Visible":"Hidden"}function q(e){M(),S(),n.snapshot=null,n.coverage=null,n.contrast=null,n.highlightedToken=null,n.focusedTokenId="",n.overrideTokenId="",n.targetConfigPath||(n.bridgeOutputEnabled=null,n.bridgeOutputStatus="Load target config"),m({kind:"clear-snapshot"}),e&&p("idle",e),E()}function fe(){i.targetConfigOptions.innerHTML=n.recentTargetConfigPaths.map(e=>`<option value="${d(e)}"></option>`).join("")}async function x(e){let t=e.trim();n.targetConfigPath=t,i.targetConfigInput.value=t,t&&(n.recentTargetConfigPaths=[t,...n.recentTargetConfigPaths.filter(r=>r!==t)].slice(0,8)),fe();try{await chrome.storage.local.set({[f.targetConfigPath]:t,[f.recentTargetConfigPaths]:n.recentTargetConfigPaths})}catch{}}async function De(){try{let e=await chrome.storage.local.get([f.bridgeUrl,f.targetConfigPath,f.recentTargetConfigPaths]),t=e[f.bridgeUrl];typeof t=="string"&&t.trim()&&(n.bridgeUrl=t.trim());let r=e[f.targetConfigPath];typeof r=="string"&&(n.targetConfigPath=r.trim());let a=e[f.recentTargetConfigPaths];Array.isArray(a)&&(n.recentTargetConfigPaths=a.filter(o=>typeof o=="string"&&o.trim().length>0))}catch{}i.bridgeInput.value=n.bridgeUrl,i.targetConfigInput.value=n.targetConfigPath,fe()}async function T(){let e=n.targetConfigPath.trim();if(!e){n.bridgeOutputEnabled=null,n.bridgeOutputPending=!1,n.bridgeOutputStatus="Load target config",k();return}n.bridgeOutputPending=!0,n.bridgeOutputStatus="Loading config...",k();try{let t=await g.fetchBridgeConfig(e);t.configPath!==n.targetConfigPath&&await x(t.configPath),n.bridgeOutputEnabled=t.bridgeEnabled,n.bridgeOutputStatus=j(t)}catch(t){n.bridgeOutputEnabled=null,n.bridgeOutputStatus=t instanceof Error?t.message:"Failed to load bridge config"}finally{n.bridgeOutputPending=!1,k()}}async function Ae(e){let t=me();if(!t)return;let r=n.bridgeOutputEnabled,a=n.bridgeOutputStatus;n.bridgeOutputPending=!0,n.bridgeOutputEnabled=e,n.bridgeOutputStatus="Saving config...",k();try{let o=await g.updateBridgeConfig(e,{configPath:t});o.configPath!==n.targetConfigPath&&await x(o.configPath),n.bridgeOutputEnabled=o.bridgeEnabled,n.bridgeOutputStatus=j(o)}catch(o){n.bridgeOutputEnabled=r,n.bridgeOutputStatus=o instanceof Error?o.message:a||"Failed to update config"}finally{n.bridgeOutputPending=!1,k()}}async function Re(e){n.bridgeUrl=e;try{await chrome.storage.local.set({[f.bridgeUrl]:e})}catch{}}async function ve(e){if(g.stop(),await x(e),q(n.targetConfigPath?"loading target config":"choose target config"),!n.targetConfigPath){await T();return}await T(),g.start()}function w(e){i.tabs.forEach(t=>{t.classList.toggle("is-active",t.dataset.tab===e)}),i.tabPanels.forEach(t=>{t.classList.toggle("is-active",t.dataset.tabPanel===e)})}i.tabs.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;t&&w(t)})});i.modeSwitch.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{i.modeSwitch.querySelectorAll("button").forEach(r=>r.classList.toggle("is-active",r===e));let t=e.dataset.mode??"null";n.activeMode=t==="null"?null:t,m({kind:"set-theme",mode:n.activeMode}),n.overrideTokenId&&W(),E(),L()})});i.hoverToggle.addEventListener("change",()=>{n.hoverActive=i.hoverToggle.checked,m({kind:"hover-inspector",enabled:n.hoverActive})});i.clearSelection.addEventListener("click",()=>{n.selectedElement=null,m({kind:"clear-selection"})});i.toggleInPageDrawer.addEventListener("click",()=>{n.inPageDrawerVisible=!n.inPageDrawerVisible,F(),m({kind:"set-inpage-drawer",visible:n.inPageDrawerVisible}),n.inPageDrawerVisible&&n.snapshot&&L()});i.targetConfigLoad.addEventListener("click",async()=>{await ve(i.targetConfigInput.value)});i.targetConfigInput.addEventListener("keydown",e=>{e.key==="Enter"&&(e.preventDefault(),ve(i.targetConfigInput.value))});i.bridgeOutputEnabled.addEventListener("change",()=>{Ae(i.bridgeOutputEnabled.checked)});i.commitDraft.addEventListener("click",async()=>{if(n.snapshot)try{await g.commitDraft({configPath:n.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"commit failed")}});i.discardDraft.addEventListener("click",async()=>{if(n.snapshot)try{await g.discardDraft({configPath:n.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"discard failed")}});i.resetManifest.addEventListener("click",async()=>{if(n.snapshot)try{await g.applyDraft([ie()],{configPath:n.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"reset failed")}});i.editorToken.addEventListener("change",()=>{n.focusedTokenId=i.editorToken.value,Y()});i.addAlias.addEventListener("click",async()=>{if(!n.snapshot)return;let e=n.focusedTokenId||Object.keys(n.snapshot.manifest.tokens)[0];if(e)try{await g.applyDraft([N("color-new-alias",e)],{configPath:n.snapshot.configPath}),w("aliases")}catch(t){p("error",t instanceof Error?t.message:"alias add failed")}});i.addAliasCurrent.addEventListener("click",async()=>{if(!(!n.snapshot||!n.focusedTokenId))try{await g.applyDraft([N(`color-${n.focusedTokenId}`,n.focusedTokenId)],{configPath:n.snapshot.configPath})}catch(e){p("error",e instanceof Error?e.message:"alias add failed")}});i.scanCoverage.addEventListener("click",()=>{n.snapshot&&(M(),i.coverageSummary.textContent="Scanning...",n.coverageScanTimeout=window.setTimeout(()=>{i.coverageSummary.textContent==="Scanning..."&&(i.coverageSummary.textContent="Scan timed out while waiting for the inspected page response.")},Le),m({kind:"scan-coverage",tokenColors:be(),aliases:n.snapshot.manifest.aliases}))});i.scanContrast.addEventListener("click",()=>{n.snapshot&&(S(),i.contrastSummary.textContent="Auditing...",n.contrastAuditTimeout=window.setTimeout(()=>{i.contrastSummary.textContent==="Auditing..."&&(i.contrastSummary.textContent="Audit timed out while waiting for the inspected page response.")},$e),m({kind:"scan-contrast",tokenColors:be(),aliases:n.snapshot.manifest.aliases}))});i.overrideToken.addEventListener("change",()=>{n.overrideTokenId=i.overrideToken.value,W(),z()});i.overrideMode.addEventListener("change",()=>{n.overrideMode=i.overrideMode.value});i.overridePersist.addEventListener("change",()=>{n.persistOverride=i.overridePersist.checked});i.clearOverrides.addEventListener("click",()=>{m({kind:"clear-all-overrides"})});i.pushOverride.addEventListener("click",async()=>{if(n.overrideTokenId)try{await g.pushOverride(n.overrideTokenId,n.overrideMode,n.overrideColor,{persist:n.persistOverride,configPath:me()})}catch(e){p("error",e instanceof Error?e.message:"push failed")}});i.bridgeBtn.addEventListener("click",async()=>{let e=i.bridgeInput.value.trim();e&&(await Re(e),g.stop(),q(n.targetConfigPath?"reconnecting to target config":"choose target config"),n.targetConfigPath&&(T(),g.start()))});function V(){return n.snapshot?se(n.snapshot,n.activeMode,n.pageInfo.theme):"light"}function be(){if(!n.snapshot)return{};let e=n.snapshot.resolved[V()],t={};for(let[r,a]of Object.entries(e.colors))t[r]=a.css;return t}function L(){n.snapshot&&m({kind:"update-snapshot",snapshot:n.snapshot})}function E(){k(),F(),Ue(),_e(),Y(),Ve(),Ee(),Ce(),Ye(),!n.overrideTokenId&&n.snapshot&&(n.overrideTokenId=Object.keys(n.snapshot.manifest.tokens)[0]??"",W()),z()}function Ue(){if(!n.snapshot){i.draftStatus.textContent=n.targetConfigPath?`Waiting for bridge snapshot for ${n.targetConfigPath}...`:"Choose a target project config to start authoring.";return}let e=n.snapshot.draft.dirty?`Target ${n.snapshot.configPath} \xB7 Draft dirty \xB7 base v${n.snapshot.draft.baseVersion} \xB7 last edit ${n.snapshot.draft.lastEditor}`:`Target ${n.snapshot.configPath} \xB7 Draft clean \xB7 synced at v${n.snapshot.version}`;i.draftStatus.textContent=e}function G(){return n.snapshot?Object.values(n.snapshot.manifest.tokens):[]}function $(e){return n.snapshot?.manifest.tokens[e]??null}function Ne(e,t){return t==="dark"?e.dark:e.light}function de(e,t){let r=Z(t),a=y(t),o=D({r:a.r,g:a.g,b:a.b}),s=R(o);return`
    <div class="picker-shell">
      <div class="picker-stack">
        <div class="picker-swatch-row">
          <div
            class="picker-swatch"
            style="background-color:${d(r)}"
            aria-label="${e} anchor selected color preview"
          ></div>
        </div>
        <div
          class="picker-panel"
          style="background:${xe}"
          role="slider"
          tabindex="0"
          aria-label="${e} anchor hue and brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${Math.round(o.v)}"
          aria-valuetext="${d(`Hue: ${Math.round(o.h)}\xB0, Saturation: ${Math.round(o.s)}%, Value: ${Math.round(o.v)}%`)}"
          data-picker-plane="${e}"
        >
          <div
            class="picker-handle"
            style="left:${s.xPercent}; top:${s.yPercent};"
          ></div>
        </div>
      </div>
    </div>
  `}function _e(){if(!n.snapshot){i.editorToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=G();i.editorToken.innerHTML=e.map(t=>`<option value="${t.id}">${d(t.label)} (${t.id})</option>`).join(""),n.focusedTokenId||(n.focusedTokenId=e[0]?.id??""),i.editorToken.value=n.focusedTokenId}function v(e,t,r,a,o,s){return`
    <div class="slider-row">
      <span>${d(we[t])}</span>
      <input
        type="range"
        min="${a}"
        max="${o}"
        step="${s}"
        value="${r}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
      <input
        type="number"
        min="${a}"
        max="${o}"
        step="${s}"
        value="${r}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
    </div>
  `}async function je(e,t,r,a){let o=$(e);if(!o||!n.snapshot)return;let s={...t==="dark"?o.dark:o.light,[r]:a};await ke(e,t,s)}async function ke(e,t,r){n.snapshot&&await g.applyDraft([te(e,t,r)],{configPath:n.snapshot.configPath})}async function ye(e,t,r,a,o){let s=ee({h:r,s:a,v:o});await ke(e,t,K(s.r,s.g,s.b))}async function Te(e,t,r,a,o){let s=A(r.width,r.height,a-r.left,o-r.top);await ye(e,t,s.h,s.s,s.v)}function ue(e){return e==="light"||e==="dark"?e:null}function Fe(e){i.tokenEditor.querySelectorAll("[data-slider-prefix]").forEach(t=>{t.addEventListener("input",async()=>{let r=t.dataset.sliderPrefix,a=t.dataset.channel;if(!(!r||!a))try{await je(e,r,a,Number(t.value))}catch(o){p("error",o instanceof Error?o.message:"token update failed")}})}),i.tokenEditor.querySelectorAll("[data-picker-plane]").forEach(t=>{t.addEventListener("pointerdown",r=>{let a=ue(t.dataset.pickerPlane);!a||!(r.currentTarget instanceof HTMLDivElement)||(n.pickerDrag={tokenId:e,mode:a,rect:r.currentTarget.getBoundingClientRect()},Te(e,a,n.pickerDrag.rect,r.clientX,r.clientY).catch(o=>{p("error",o instanceof Error?o.message:"token update failed")}))}),t.addEventListener("keydown",r=>{let a=ue(t.dataset.pickerPlane);if(!a)return;let o=$(e);if(!o)return;let s=Ne(o,a),l=y(s),c=D({r:l.r,g:l.g,b:l.b}),u=R(c),h=Number.parseFloat(u.xPercent),I=Number.parseFloat(u.yPercent);if(r.key==="ArrowLeft")h-=2;else if(r.key==="ArrowRight")h+=2;else if(r.key==="ArrowUp")I-=2;else if(r.key==="ArrowDown")I+=2;else return;r.preventDefault();let B=A(100,100,h,I);ye(e,a,B.h,B.s,B.v).catch(J=>{p("error",J instanceof Error?J.message:"token update failed")})})}),i.tokenEditor.querySelectorAll("[data-token-exception], [data-token-max-chroma]").forEach(t=>{let r=async()=>{try{let a=i.tokenEditor.querySelector("[data-token-exception]")?.value,o=i.tokenEditor.querySelector("[data-token-max-chroma]")?.value;await g.applyDraft([ne(e,{altBehavior:a,maxChroma:o===""?null:Number(o)})],{configPath:n.snapshot?.configPath})}catch(a){p("error",a instanceof Error?a.message:"exception update failed")}};t.addEventListener("change",r),t.addEventListener("input",r)})}function qe(){i.modeEditor.querySelectorAll("[data-alt-setting]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let r=e.dataset.altSetting;if(!r)return;let a;r==="source"?a={source:e.value}:r==="harmonyLock"?a={harmonyLock:e.checked}:r==="grayscalePreview"?a={grayscalePreview:e.checked}:a={delta:{[r]:Number(e.value)}};try{await g.applyDraft([re(a)],{configPath:n.snapshot.configPath})}catch(o){p("error",o instanceof Error?o.message:"alt update failed")}};e.addEventListener("change",t),e.addEventListener("input",t)})}function Y(){if(!n.snapshot||!n.focusedTokenId){i.tokenEditor.innerHTML='<p class="empty-state">Select a token to edit it.</p>',i.modeEditor.innerHTML='<p class="empty-state">Connect to the engine to edit theme state.</p>',i.tokenValidation.innerHTML='<p class="empty-state">No validation details yet.</p>';return}let e=$(n.focusedTokenId);if(!e){i.tokenEditor.innerHTML='<p class="empty-state">Selected token is unavailable.</p>';return}let t=V(),r=n.snapshot.resolved[t].colors[e.id],a=le(n.snapshot,e.id,t);i.tokenEditor.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${d(P(r))}"></span>
      <div>
        <strong>${d(e.label)}</strong>
        <div class="meta">${d(e.description)}</div>
        <code>${d(U(r))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      <div class="anchor-editor-layout">
        ${de("light",e.light)}
        <div class="anchor-slider-stack">
          ${v("light","l",e.light.l,0,1,.005)}
          ${v("light","c",e.light.c,0,.37,.005)}
          ${v("light","h",e.light.h,0,360,1)}
        </div>
      </div>
    </div>
    <div class="editor-block">
      <h3>Dark anchor</h3>
      <div class="anchor-editor-layout">
        ${de("dark",e.dark)}
        <div class="anchor-slider-stack">
          ${v("dark","l",e.dark.l,0,1,.005)}
          ${v("dark","c",e.dark.c,0,.37,.005)}
          ${v("dark","h",e.dark.h,0,360,1)}
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
      <div class="meta">${e.altParent?`Alt derives from ${d(e.altParent)}.`:"No alt parent override."}</div>
    </div>
  `,i.modeEditor.innerHTML=`
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
      ${v("alt","h",n.snapshot.manifest.alt.delta.h,-180,180,1).replaceAll('data-slider-prefix="alt"','data-alt-setting="h"')}
      ${v("alt","c",n.snapshot.manifest.alt.delta.c,-.16,.16,.005).replaceAll('data-slider-prefix="alt"','data-alt-setting="c"')}
      ${v("alt","l",n.snapshot.manifest.alt.delta.l,-.2,.2,.01).replaceAll('data-slider-prefix="alt"','data-alt-setting="l"')}
    </div>
  `,i.tokenValidation.innerHTML=a.length?`<div class="report-list">${a.map(o=>`<div class="report-item severity-warn"><span>${d(o)}</span><span></span><span></span></div>`).join("")}</div>`:'<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>',Fe(e.id),qe()}function Ve(){if(!n.snapshot){i.aliasList.innerHTML='<p class="empty-state">Connect to the engine to edit aliases.</p>';return}if(n.snapshot.manifest.aliases.length===0){i.aliasList.innerHTML='<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';return}i.aliasList.innerHTML=`
    <div class="alias-list">
      ${n.snapshot.manifest.aliases.map((e,t)=>`
            <div class="alias-row">
              <input type="text" value="${d(e.name)}" data-alias-index="${t}" data-alias-field="name" />
              <select data-alias-index="${t}" data-alias-field="tokenId">
                ${G().map(r=>`
                      <option value="${r.id}" ${r.id===e.tokenId?"selected":""}>
                        ${d(r.label)}
                      </option>
                    `).join("")}
              </select>
              <button type="button" data-remove-alias="${t}" class="secondary">Remove</button>
            </div>
          `).join("")}
    </div>
  `,i.aliasList.querySelectorAll("[data-alias-index]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let r=Number(e.dataset.aliasIndex),a=e.dataset.aliasField==="name"?{name:e.value}:{tokenId:e.value};try{await g.applyDraft([ae(r,a)],{configPath:n.snapshot.configPath})}catch(o){p("error",o instanceof Error?o.message:"alias update failed")}};e.addEventListener("input",t),e.addEventListener("change",t)}),i.aliasList.querySelectorAll("[data-remove-alias]").forEach(e=>{e.addEventListener("click",async()=>{if(!n.snapshot)return;let t=Number(e.dataset.removeAlias);try{await g.applyDraft([oe(t)],{configPath:n.snapshot.configPath})}catch(r){p("error",r instanceof Error?r.message:"alias remove failed")}})})}function Ge(e,t=!1,r=!1){n.focusedTokenId=e,r&&w("authoring"),t&&(n.highlightedToken=e,m({kind:"reveal-token-usage",tokenId:e})),Y()}function Ee(){let e=n.coverage;if(!e){i.coverageOutput.innerHTML='<p class="empty-state">Run a scan to see token usage.</p>',i.coverageSummary.textContent="";return}let t=Object.entries(e.byToken).filter(([,l])=>l>0).length,r=Object.keys(e.byToken).length,a=[...Object.entries(e.byToken)].filter(([,l])=>l>0).sort((l,c)=>c[1]-l[1]).slice(0,20),o=e.unusedTokens.slice(0,20),s=e.rawColorViolations.slice(0,20);i.coverageSummary.textContent=`${e.totalElements} elements \xB7 ${t}/${r} tokens used \xB7 ${e.rawColorViolations.length} raw colors`,i.coverageOutput.innerHTML=`
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${a.map(([l,c])=>`<div class="report-item"><span>${d(l)}</span><span class="meta">${c} elements</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Unused tokens (${o.length})</p>
    <div class="report-list">
      ${o.map(l=>`<div class="report-item"><span>${d(l)}</span><span class="meta">0</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Raw color violations (${s.length})</p>
    <div class="report-list">
      ${s.map(l=>`
            <div class="report-item severity-warn">
              <span><code>${d(l.selector)}</code></span>
              <span class="meta">${d(l.property)}: ${d(l.value)}</span>
              <span></span>
            </div>
          `).join("")}
    </div>
  `}function Ce(){if(!n.contrast){i.contrastSummary.textContent="",i.contrastOutput.innerHTML='<p class="empty-state">Run an audit to surface APCA issues.</p>';return}if(i.contrastSummary.textContent=`${n.contrast.sampled} sampled \xB7 ${n.contrast.findings.length} potential failures`,!n.contrast.findings.length){i.contrastOutput.innerHTML='<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';return}i.contrastOutput.innerHTML=`
    <div class="report-list">
      ${n.contrast.findings.map(e=>`
            <div class="report-item severity-${e.severity}">
              <span>
                <code>${d(e.selector)}</code>
                <div class="meta">${d(e.context||"\u2014")}</div>
              </span>
              <span class="meta">fg ${d(e.foregroundToken??e.foreground)} \xB7 bg ${d(e.backgroundToken??e.background)}</span>
              <span class="meta">${e.contrastLc.toFixed(1)} Lc</span>
            </div>
          `).join("")}
    </div>
  `}function Ye(){if(!n.snapshot){i.overrideToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=G();i.overrideToken.innerHTML=e.map(t=>`<option value="${t.id}">${d(t.label)} (${t.id})</option>`).join(""),n.overrideTokenId&&(i.overrideToken.value=n.overrideTokenId)}function W(){if(!n.snapshot||!n.overrideTokenId)return;let e=$(n.overrideTokenId);if(!e)return;let t=V();if(t==="alt"){let r=n.snapshot.resolved.alt.colors[n.overrideTokenId];if(r){n.overrideColor={l:r.l,c:r.c,h:r.h,alpha:r.alpha};return}}n.overrideColor={...t==="dark"?e.dark:e.light}}function z(){if(!n.snapshot){i.overrideSliders.innerHTML='<p class="empty-state">Connect to the engine to use overrides.</p>';return}let e=n.overrideColor,t=P(e),r=[{key:"l",label:"Lightness",min:0,max:1,step:.001},{key:"c",label:"Chroma",min:0,max:.4,step:.001},{key:"h",label:"Hue",min:0,max:360,step:.1}];i.overrideSliders.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${d(t)}"></span>
      <div>
        <strong>${d(n.overrideTokenId||"Choose a token")}</strong>
        <code>${d(U(e))}</code>
      </div>
    </div>
    <div class="editor-block">
      ${r.map(a=>`
            <div class="slider-row">
              <span>${a.label}</span>
              <input type="range" min="${a.min}" max="${a.max}" step="${a.step}" value="${e[a.key]}" data-override-channel="${a.key}" />
              <span class="readout">${e[a.key].toFixed(a.key==="h"?2:3)}</span>
            </div>
          `).join("")}
    </div>
  `,i.overrideSliders.querySelectorAll("[data-override-channel]").forEach(a=>{a.addEventListener("input",()=>{let o=a.dataset.overrideChannel;o&&(n.overrideColor={...n.overrideColor,[o]:Number(a.value)},z(),n.overrideTokenId&&m({kind:"override-token",tokenId:n.overrideTokenId,css:P(n.overrideColor)}))})})}function d(e){return e.replace(/[&<>"']/g,t=>{switch(t){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}window.addEventListener("pointermove",e=>{n.pickerDrag&&Te(n.pickerDrag.tokenId,n.pickerDrag.mode,n.pickerDrag.rect,e.clientX,e.clientY).catch(t=>{p("error",t instanceof Error?t.message:"token update failed")})});window.addEventListener("pointerup",()=>{n.pickerDrag=null});(async()=>(await De(),n.targetConfigPath?(T(),g.start()):q("choose target config"),m({kind:"ping"}),E()))();})();
