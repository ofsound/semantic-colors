"use strict";(()=>{var $=class{constructor(t){this.options=t}options;source=null;retryTimer=null;retryDelay=1e3;stopped=!1;start(){this.stopped=!1,this.connect()}stop(){this.stopped=!0,this.retryTimer&&(clearTimeout(this.retryTimer),this.retryTimer=null),this.source&&(this.source.close(),this.source=null)}async fetchSnapshot(t=this.requireConfigPath()){let o=await fetch(this.snapshotUrl(t),{method:"GET",cache:"no-store"});if(!o.ok)throw new Error(`Snapshot request failed with status ${o.status}`);return await o.json()}async fetchBridgeConfig(t=this.requireConfigPath()){let o=await fetch(`${this.options.getBaseUrl()}/api/bridge/config?configPath=${encodeURIComponent(t)}`,{method:"GET",cache:"no-store"});if(!o.ok)throw new Error(`Bridge config request failed with status ${o.status}`);return await o.json()}async updateBridgeConfig(t,o={}){let r=o.configPath??this.requireConfigPath(),i=await fetch(`${this.options.getBaseUrl()}/api/bridge/config`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r,bridgeEnabled:t})});if(!i.ok)throw new Error(`Bridge config update failed with status ${i.status}`);return await i.json()}async pushOverride(t,o,r,i={}){let l=i.configPath??this.requireConfigPath(),s=await fetch(`${this.options.getBaseUrl()}/api/bridge/token`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tokenId:t,mode:o,color:r,persist:i.persist??!1,configPath:l})});if(!s.ok)throw new Error(`Override failed with status ${s.status}`)}async applyDraft(t,o={}){let r=o.configPath??this.requireConfigPath(),i=await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r,commands:t})});if(!i.ok)throw new Error(`Draft update failed with status ${i.status}`)}async commitDraft(t={}){let o=t.configPath??this.requireConfigPath(),r=await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o})});if(!r.ok)throw new Error(`Commit failed with status ${r.status}`)}async discardDraft(t={}){let o=t.configPath??this.requireConfigPath(),r=await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o})});if(!r.ok)throw new Error(`Discard failed with status ${r.status}`)}connect(){if(this.stopped)return;let t=this.options.getConfigPath().trim();if(!t){this.options.onStatus("idle","choose target config");return}this.options.onStatus("connecting");let o=this.eventsUrl(t);try{this.source=new EventSource(o)}catch(r){this.options.onStatus("error",r instanceof Error?r.message:"Unable to connect"),this.scheduleReconnect();return}this.source.addEventListener("hello",r=>{this.retryDelay=1e3,this.options.onStatus("connected"),this.handleSnapshotEvent(r)}),this.source.addEventListener("snapshot",r=>{this.handleSnapshotEvent(r)}),this.source.addEventListener("ping",()=>{}),this.source.onerror=()=>{this.options.onStatus("error","Stream disconnected"),this.source?.close(),this.source=null,this.scheduleReconnect()}}handleSnapshotEvent(t){try{let o=JSON.parse(t.data);o.snapshot&&this.options.onSnapshot(o.snapshot)}catch{}}scheduleReconnect(){this.stopped||(this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=setTimeout(()=>{this.retryDelay=Math.min(this.retryDelay*2,15e3),this.connect()},this.retryDelay))}requireConfigPath(){let t=this.options.getConfigPath().trim();if(!t)throw new Error("Choose a target project config first.");return t}snapshotUrl(t){return`${this.options.getBaseUrl()}/api/bridge/snapshot?configPath=${encodeURIComponent(t)}`}eventsUrl(t){return`${this.options.getBaseUrl()}/api/bridge/events?configPath=${encodeURIComponent(t)}`}};var Z="http://localhost:5173",f={bridgeUrl:"semanticColors.bridgeUrl",targetConfigPath:"semanticColors.targetConfigPath",recentTargetConfigPaths:"semanticColors.recentTargetConfigPaths"};function U(e){let t=e/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4}function N(e){let t=e<=.0031308?e*12.92:1.055*Math.pow(e,.4166666666666667)-.055;return Math.max(0,Math.min(255,Math.round(t*255)))}function xe(e,t,o){let r=e+.3963377774*t+.2158037573*o,i=e-.1055613458*t-.0638541728*o,l=e-.0894841775*t-1.291485548*o,s=r**3,d=i**3,u=l**3;return[4.0767416621*s-3.3077115913*d+.2309699292*u,-1.2684380046*s+2.6097574011*d-.3413193965*u,-.0041960863*s-.7034186147*d+1.707614701*u]}function we(e,t,o){let r=Math.cbrt(.4122214708*e+.5363325363*t+.0514459929*o),i=Math.cbrt(.2119034982*e+.6806995451*t+.1073969566*o),l=Math.cbrt(.0883024619*e+.2817188376*t+.6299787005*o);return[.2104542553*r+.793617785*i-.0040720468*l,1.9779984951*r-2.428592205*i+.4505937099*l,.0259040371*r+.7827717662*i-.808675766*l]}function C(e){let t=e.h*Math.PI/180,o=e.c*Math.cos(t),r=e.c*Math.sin(t),[i,l,s]=xe(e.l,o,r);return{r:N(i),g:N(l),b:N(s),alpha:e.alpha??1}}function ee(e,t,o,r=1){let[i,l,s]=we(U(e),U(t),U(o)),d=Math.sqrt(l*l+s*s),u=Math.atan2(s,l)*180/Math.PI;return u<0&&(u+=360),{l:i,c:d,h:u,alpha:r}}function te(e){let t=e%360;return t<0?t+360:t}function Be(e){return`#${[e.r,e.g,e.b].map(t=>Math.max(0,Math.min(255,Math.round(t))).toString(16).padStart(2,"0")).join("").toUpperCase()}`}function ne(e){let{r:t,g:o,b:r}=C(e);return Be({r:t,g:o,b:r})}function j(e){let t=e.r/255,o=e.g/255,r=e.b/255,i=Math.max(t,o,r),l=Math.min(t,o,r),s=i-l,d=0;return s!==0&&(i===t?d=(o-r)/s%6:i===o?d=(r-t)/s+2:d=(t-o)/s+4,d*=60,d<0&&(d+=360)),{h:d,s:i===0?0:s/i*100,v:i*100}}function oe(e){let t=Math.max(0,Math.min(100,e.s))/100,o=Math.max(0,Math.min(100,e.v))/100,r=te(e.h),i=o*t,l=i*(1-Math.abs(r/60%2-1)),s=o-i,d,u,g;return r<60?[d,u,g]=[i,l,0]:r<120?[d,u,g]=[l,i,0]:r<180?[d,u,g]=[0,i,l]:r<240?[d,u,g]=[0,l,i]:r<300?[d,u,g]=[l,0,i]:[d,u,g]=[i,0,l],{r:Math.round((d+s)*255),g:Math.round((u+s)*255),b:Math.round((g+s)*255)}}function F(e,t,o,r){let i=Math.max(e,1),l=Math.max(t,1),s=Math.max(0,Math.min(i,o)),u=Math.max(0,Math.min(l,r))/l,g=u<=.5;return{h:s/i*360,s:g?100:100-(u-.5)/.5*100,v:g?u/.5*100:100}}function _(e){let t=te(e.h),o=Math.max(0,Math.min(100,e.s)),r=Math.max(0,Math.min(100,e.v));return{xPercent:`${t/360*100}%`,yPercent:r>=99.5?`${50+(100-o)/100*50}%`:`${r/100*50}%`}}function b(e){let{r:t,g:o,b:r,alpha:i}=C(e);return i<1?`rgba(${t}, ${o}, ${r}, ${i.toFixed(3)})`:`rgb(${t}, ${o}, ${r})`}function q(e){let t=(e.l*100).toFixed(2),o=e.c.toFixed(4),r=e.h.toFixed(2),i=e.alpha!==void 0&&e.alpha<1?` / ${e.alpha.toFixed(2)}`:"";return`oklch(${t}% ${o} ${r}${i})`}function re(e,t,o){return{kind:"update-token-color",tokenId:e,mode:t,color:o}}function ae(e,t){return{kind:"update-token-exception",tokenId:e,patch:t}}function ie(e){return{kind:"update-alt-settings",patch:e}}function V(e,t){return{kind:"add-alias",alias:{name:e,tokenId:t}}}function se(e,t){return{kind:"update-alias",index:e,patch:t}}function le(e){return{kind:"remove-alias",index:e}}function ce(){return{kind:"reset-manifest"}}function de(e,t){return{kind:"apply-import-review",proposal:e,selection:t}}function ue(e,t,o){return t||(o==="dark"||o==="alt"?o:(e.manifest.alt.source==="dark"&&o==="light","light"))}function pe(e,t,o){let r=e.validations[o]?.perToken[t];if(!r)return[];let i=[];return r.gamutAdjusted&&i.push("Adjusted to stay in display gamut."),i.push(...r.contrastIssues),i}function G(e){let t=e?.semanticClassMatches?.[0]?.tokenId;return t||(e?.matches.find(o=>o.tokenId)?.tokenId??null)}function ge(e){return`panel:${e}`}var ve=chrome.devtools.inspectedWindow.tabId,He="linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",Oe={l:"Lightness",c:"Chroma",h:"Hue"},Ae=12e3,De=12e3,n={bridgeUrl:Z,targetConfigPath:"",recentTargetConfigPaths:[],snapshot:null,coverage:null,contrast:null,highlightedToken:null,focusedTokenId:"",overrideTokenId:"",overrideColor:{l:.5,c:.1,h:240,alpha:1},overrideMode:"both",persistOverride:!1,activeMode:null,tokenFilter:"",hoverActive:!1,hoveredElement:null,selectedElement:null,pageInfo:{url:"",title:"",theme:null},importSourcePath:"",importProposal:null,importSelection:{},bridgeOutputEnabled:null,bridgeOutputPending:!1,bridgeOutputStatus:"Load target config",coverageScanTimeout:null,contrastAuditTimeout:null,pickerDrag:null},a={status:document.getElementById("bridge-status"),bridgeInput:document.getElementById("bridge-url"),bridgeBtn:document.getElementById("bridge-connect"),targetConfigInput:document.getElementById("target-config-path"),targetConfigLoad:document.getElementById("target-config-load"),bridgeOutputEnabled:document.getElementById("bridge-output-enabled"),bridgeOutputStatus:document.getElementById("bridge-output-status"),targetConfigOptions:document.getElementById("recent-target-configs"),modeSwitch:document.querySelector(".mode-switch"),draftStatus:document.getElementById("draft-status"),commitDraft:document.getElementById("commit-draft"),discardDraft:document.getElementById("discard-draft"),resetManifest:document.getElementById("reset-manifest"),tabs:document.querySelectorAll(".tabs button"),tabPanels:document.querySelectorAll("[data-tab-panel]"),hoverToggle:document.getElementById("hover-toggle"),clearSelection:document.getElementById("clear-selection"),pageInfo:document.getElementById("page-info"),selectionDetails:document.getElementById("selection-details"),hoverDetails:document.getElementById("hover-details"),editorToken:document.getElementById("editor-token"),tokenEditor:document.getElementById("token-editor"),tokenValidation:document.getElementById("token-validation"),modeEditor:document.getElementById("mode-editor"),aliasList:document.getElementById("alias-list"),addAlias:document.getElementById("add-alias"),addAliasCurrent:document.getElementById("add-alias-current"),importSourcePath:document.getElementById("import-source-path"),scanImport:document.getElementById("scan-import"),applyImportReview:document.getElementById("apply-import-review"),importStatus:document.getElementById("import-status"),importReview:document.getElementById("import-review"),tokenFilter:document.getElementById("token-filter"),tokenList:document.getElementById("token-list"),clearHighlight:document.getElementById("clear-highlight"),scanCoverage:document.getElementById("scan-coverage"),coverageSummary:document.getElementById("coverage-summary"),coverageOutput:document.getElementById("coverage-output"),scanContrast:document.getElementById("scan-contrast"),contrastSummary:document.getElementById("contrast-summary"),contrastOutput:document.getElementById("contrast-output"),overrideToken:document.getElementById("override-token"),overrideSliders:document.getElementById("override-sliders"),overrideMode:document.getElementById("override-mode"),overridePersist:document.getElementById("override-persist"),clearOverrides:document.getElementById("clear-overrides"),pushOverride:document.getElementById("push-override")},y=null;function Re(e){let t=e;t?.source==="content"&&be(t.payload)}function Ue(){let e;try{e=chrome.runtime.connect({name:ge(ve)})}catch(t){return console.warn("[semantic-colors] panel port connect failed:",t),null}try{e.onMessage.addListener(Re),e.onDisconnect.addListener(()=>{y===e&&(y=null)})}catch(t){console.warn("[semantic-colors] panel port listener bind failed:",t);try{e.disconnect()}catch{}return null}return y=e,e}function Ne(){return y??Ue()}function ke(e,t=!0){let o=Ne();if(!o)return!1;try{return o.postMessage(e),!0}catch(r){return console.warn("[semantic-colors] panel port send failed:",r),t?(y===o&&(y=null),ke(e,!1)):!1}}function m(e){ke({source:"panel",tabId:ve,payload:e})||be({kind:"error",message:"Extension relay disconnected. Retry the scan."})}function L(){n.coverageScanTimeout!==null&&(window.clearTimeout(n.coverageScanTimeout),n.coverageScanTimeout=null)}function I(){n.contrastAuditTimeout!==null&&(window.clearTimeout(n.contrastAuditTimeout),n.contrastAuditTimeout=null)}function be(e){switch(e.kind){case"hello":case"page-info":n.pageInfo={url:e.url,title:e.title,theme:"theme"in e?e.theme:null},Pe(),n.snapshot&&J();break;case"hover-element":n.hoveredElement=e.payload,P();break;case"selected-element":{n.selectedElement=e.payload;let t=e.payload.semanticClassMatches[0]?.tokenId??null;t&&(n.focusedTokenId=t,w("authoring")),n.focusedTokenId||(n.focusedTokenId=G(e.payload)??n.focusedTokenId),M();break}case"hover-cleared":n.hoveredElement=null,P();break;case"selection-cleared":n.selectedElement=null,P();break;case"coverage-report":L(),n.coverage=e.report,Le(),k();break;case"contrast-report":I(),n.contrast=e.report,Ie();break;case"error":console.warn("[semantic-colors] content error:",e.message),a.coverageSummary.textContent==="Scanning..."&&(L(),a.coverageSummary.textContent=`Scan failed: ${e.message}`),a.contrastSummary.textContent==="Auditing..."&&(I(),a.contrastSummary.textContent=`Audit failed: ${e.message}`);break}}var p=new $({getBaseUrl:()=>n.bridgeUrl,getConfigPath:()=>n.targetConfigPath,onStatus:h,onSnapshot:e=>{n.snapshot=e,e.configPath!==n.targetConfigPath&&x(e.configPath).then(()=>{S()}),n.focusedTokenId||(n.focusedTokenId=G(n.selectedElement)??Object.keys(e.manifest.tokens)[0]??""),M(),J()}});function h(e,t){a.status.className=`status status-${e}`,a.status.textContent=t?`${e} \xB7 ${t}`:e}function ye(){return n.snapshot?.configPath??n.targetConfigPath.trim()}function Y(e){return n.targetConfigPath?n.bridgeOutputPending?"Updating...":e?e.bridgeEnabled?"Enabled: save/commit writes CSS":"Disabled: save/commit skips CSS":n.bridgeOutputEnabled===!0?"Enabled: save/commit writes CSS":n.bridgeOutputEnabled===!1?"Disabled: save/commit skips CSS":n.bridgeOutputStatus:"Load target config"}function E(){let e=n.targetConfigPath.length>0;a.bridgeOutputEnabled.disabled=!e||n.bridgeOutputPending,a.bridgeOutputEnabled.indeterminate=e&&n.bridgeOutputEnabled===null,a.bridgeOutputEnabled.checked=n.bridgeOutputEnabled??!1,a.bridgeOutputStatus.textContent=Y()}function W(e){L(),I(),n.snapshot=null,n.coverage=null,n.contrast=null,n.highlightedToken=null,n.focusedTokenId="",n.overrideTokenId="",n.importProposal=null,n.importSelection={},n.targetConfigPath||(n.bridgeOutputEnabled=null,n.bridgeOutputStatus="Load target config"),m({kind:"clear-snapshot"}),e&&h("idle",e),M()}function Ee(){a.targetConfigOptions.innerHTML=n.recentTargetConfigPaths.map(e=>`<option value="${c(e)}"></option>`).join("")}async function x(e){let t=e.trim();n.targetConfigPath=t,a.targetConfigInput.value=t,t&&(n.recentTargetConfigPaths=[t,...n.recentTargetConfigPaths.filter(o=>o!==t)].slice(0,8)),Ee();try{await chrome.storage.local.set({[f.targetConfigPath]:t,[f.recentTargetConfigPaths]:n.recentTargetConfigPaths})}catch{}}async function je(){try{let e=await chrome.storage.local.get([f.bridgeUrl,f.targetConfigPath,f.recentTargetConfigPaths]),t=e[f.bridgeUrl];typeof t=="string"&&t.trim()&&(n.bridgeUrl=t.trim());let o=e[f.targetConfigPath];typeof o=="string"&&(n.targetConfigPath=o.trim());let r=e[f.recentTargetConfigPaths];Array.isArray(r)&&(n.recentTargetConfigPaths=r.filter(i=>typeof i=="string"&&i.trim().length>0))}catch{}a.bridgeInput.value=n.bridgeUrl,a.targetConfigInput.value=n.targetConfigPath,Ee()}async function S(){let e=n.targetConfigPath.trim();if(!e){n.bridgeOutputEnabled=null,n.bridgeOutputPending=!1,n.bridgeOutputStatus="Load target config",E();return}n.bridgeOutputPending=!0,n.bridgeOutputStatus="Loading config...",E();try{let t=await p.fetchBridgeConfig(e);t.configPath!==n.targetConfigPath&&await x(t.configPath),n.bridgeOutputEnabled=t.bridgeEnabled,n.bridgeOutputStatus=Y(t)}catch(t){n.bridgeOutputEnabled=null,n.bridgeOutputStatus=t instanceof Error?t.message:"Failed to load bridge config"}finally{n.bridgeOutputPending=!1,E()}}async function Fe(e){let t=ye();if(!t)return;let o=n.bridgeOutputEnabled,r=n.bridgeOutputStatus;n.bridgeOutputPending=!0,n.bridgeOutputEnabled=e,n.bridgeOutputStatus="Saving config...",E();try{let i=await p.updateBridgeConfig(e,{configPath:t});i.configPath!==n.targetConfigPath&&await x(i.configPath),n.bridgeOutputEnabled=i.bridgeEnabled,n.bridgeOutputStatus=Y(i)}catch(i){n.bridgeOutputEnabled=o,n.bridgeOutputStatus=i instanceof Error?i.message:r||"Failed to update config"}finally{n.bridgeOutputPending=!1,E()}}async function _e(e){n.bridgeUrl=e;try{await chrome.storage.local.set({[f.bridgeUrl]:e})}catch{}}async function Te(e){if(p.stop(),await x(e),W(n.targetConfigPath?"loading target config":"choose target config"),!n.targetConfigPath){await S();return}await S(),p.start()}function w(e){a.tabs.forEach(t=>{t.classList.toggle("is-active",t.dataset.tab===e)}),a.tabPanels.forEach(t=>{t.classList.toggle("is-active",t.dataset.tabPanel===e)})}a.tabs.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;t&&w(t)})});a.modeSwitch.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{a.modeSwitch.querySelectorAll("button").forEach(o=>o.classList.toggle("is-active",o===e));let t=e.dataset.mode??"null";n.activeMode=t==="null"?null:t,m({kind:"set-theme",mode:n.activeMode}),n.overrideTokenId&&X(),M(),J()})});a.hoverToggle.addEventListener("change",()=>{n.hoverActive=a.hoverToggle.checked,m({kind:"hover-inspector",enabled:n.hoverActive})});a.clearSelection.addEventListener("click",()=>{n.selectedElement=null,m({kind:"clear-selection"}),P()});a.targetConfigLoad.addEventListener("click",async()=>{await Te(a.targetConfigInput.value)});a.targetConfigInput.addEventListener("keydown",e=>{e.key==="Enter"&&(e.preventDefault(),Te(a.targetConfigInput.value))});a.bridgeOutputEnabled.addEventListener("change",()=>{Fe(a.bridgeOutputEnabled.checked)});a.commitDraft.addEventListener("click",async()=>{if(n.snapshot)try{await p.commitDraft({configPath:n.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"commit failed")}});a.discardDraft.addEventListener("click",async()=>{if(n.snapshot)try{await p.discardDraft({configPath:n.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"discard failed")}});a.resetManifest.addEventListener("click",async()=>{if(n.snapshot)try{await p.applyDraft([ce()],{configPath:n.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"reset failed")}});a.editorToken.addEventListener("change",()=>{n.focusedTokenId=a.editorToken.value,A(),k()});a.addAlias.addEventListener("click",async()=>{if(!n.snapshot)return;let e=n.focusedTokenId||Object.keys(n.snapshot.manifest.tokens)[0];if(e)try{await p.applyDraft([V("color-new-alias",e)],{configPath:n.snapshot.configPath}),w("aliases")}catch(t){h("error",t instanceof Error?t.message:"alias add failed")}});a.addAliasCurrent.addEventListener("click",async()=>{if(!(!n.snapshot||!n.focusedTokenId))try{await p.applyDraft([V(`color-${n.focusedTokenId}`,n.focusedTokenId)],{configPath:n.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"alias add failed")}});a.importSourcePath.addEventListener("input",()=>{n.importSourcePath=a.importSourcePath.value});a.scanImport.addEventListener("click",async()=>{if(!(!n.snapshot||!n.importSourcePath.trim())){a.importStatus.textContent="Scanning CSS variables...";try{let e=await fetch(`${n.bridgeUrl}/api/project/import`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:n.snapshot.configPath,sourcePath:n.importSourcePath.trim()})});if(!e.ok)throw new Error(`Import scan failed with status ${e.status}`);n.importProposal=await e.json(),n.importSelection=Object.fromEntries(n.importProposal.candidates.map(t=>[t.sourceName,t.suggestedTokenId??""])),a.importStatus.textContent=`Loaded ${n.importProposal.candidates.length} candidates.`,z()}catch(e){a.importStatus.textContent=e instanceof Error?e.message:"Import scan failed."}}});a.applyImportReview.addEventListener("click",async()=>{if(!(!n.snapshot||!n.importProposal))try{await p.applyDraft([de(n.importProposal,n.importSelection)],{configPath:n.snapshot.configPath}),n.importProposal=null,n.importSelection={},a.importStatus.textContent="Applied reviewed mappings into the draft manifest.",z()}catch(e){a.importStatus.textContent=e instanceof Error?e.message:"Import apply failed."}});a.tokenFilter.addEventListener("input",()=>{n.tokenFilter=a.tokenFilter.value.toLowerCase(),k()});a.clearHighlight.addEventListener("click",()=>{n.highlightedToken=null,m({kind:"highlight-token",tokenId:null}),k()});a.scanCoverage.addEventListener("click",()=>{n.snapshot&&(L(),a.coverageSummary.textContent="Scanning...",n.coverageScanTimeout=window.setTimeout(()=>{a.coverageSummary.textContent==="Scanning..."&&(a.coverageSummary.textContent="Scan timed out while waiting for the inspected page response.")},Ae),m({kind:"scan-coverage",tokenColors:Ce(),aliases:n.snapshot.manifest.aliases}))});a.scanContrast.addEventListener("click",()=>{n.snapshot&&(I(),a.contrastSummary.textContent="Auditing...",n.contrastAuditTimeout=window.setTimeout(()=>{a.contrastSummary.textContent==="Auditing..."&&(a.contrastSummary.textContent="Audit timed out while waiting for the inspected page response.")},De),m({kind:"scan-contrast",tokenColors:Ce(),aliases:n.snapshot.manifest.aliases}))});a.overrideToken.addEventListener("change",()=>{n.overrideTokenId=a.overrideToken.value,X(),K()});a.overrideMode.addEventListener("change",()=>{n.overrideMode=a.overrideMode.value});a.overridePersist.addEventListener("change",()=>{n.persistOverride=a.overridePersist.checked});a.clearOverrides.addEventListener("click",()=>{m({kind:"clear-all-overrides"})});a.pushOverride.addEventListener("click",async()=>{if(n.overrideTokenId)try{await p.pushOverride(n.overrideTokenId,n.overrideMode,n.overrideColor,{persist:n.persistOverride,configPath:ye()})}catch(e){h("error",e instanceof Error?e.message:"push failed")}});a.bridgeBtn.addEventListener("click",async()=>{let e=a.bridgeInput.value.trim();e&&(await _e(e),p.stop(),W(n.targetConfigPath?"reconnecting to target config":"choose target config"),n.targetConfigPath&&(S(),p.start()))});function B(){return n.snapshot?ue(n.snapshot,n.activeMode,n.pageInfo.theme):"light"}function Ce(){if(!n.snapshot)return{};let e=n.snapshot.resolved[B()],t={};for(let[o,r]of Object.entries(e.colors))t[o]=r.css;return t}function J(){n.snapshot&&m({kind:"update-snapshot",snapshot:n.snapshot})}function M(){E(),qe(),Pe(),P(),We(),A(),Ke(),z(),k(),Le(),Ie(),Ze(),!n.overrideTokenId&&n.snapshot&&(n.overrideTokenId=Object.keys(n.snapshot.manifest.tokens)[0]??"",X()),K()}function qe(){if(!n.snapshot){a.draftStatus.textContent=n.targetConfigPath?`Waiting for bridge snapshot for ${n.targetConfigPath}...`:"Choose a target project config to start authoring.";return}let e=n.snapshot.draft.dirty?`Target ${n.snapshot.configPath} \xB7 Draft dirty \xB7 base v${n.snapshot.draft.baseVersion} \xB7 last edit ${n.snapshot.draft.lastEditor}`:`Target ${n.snapshot.configPath} \xB7 Draft clean \xB7 synced at v${n.snapshot.version}`;a.draftStatus.textContent=e}function Pe(){a.pageInfo.textContent=n.pageInfo.url?`Inspecting: ${n.pageInfo.title||"(untitled)"} \u2014 ${n.pageInfo.url} \xB7 data-theme=${n.pageInfo.theme??"(none)"}`:"Waiting for inspected page to load..."}function T(e){return e?`<span class="swatch" style="background:${c(e)}"></span>`:""}function Ve(e){return`
    <div class="token-match-list">
      ${e.matches.map(t=>{let o=t.tokenId?c(t.tokenId):"No token match",r=t.aliases.length?` \xB7 ${c(t.aliases.join(", "))}`:"",i=t.tokenId?`<button type="button" data-focus-token="${c(t.tokenId)}">${o}</button>`:o;return`
            <div class="report-item">
              <span>
                <strong>${c(t.channel)}</strong>
                <div class="meta">${c(t.cssValue??"\u2014")}</div>
              </span>
              <span class="token-chip">${T(t.cssValue)} ${i}</span>
              <span class="meta">${r||"\u2014"}</span>
            </div>
          `}).join("")}
    </div>
  `}function Ge(e){e.querySelectorAll("[data-focus-token]").forEach(t=>{t.addEventListener("click",()=>{let o=t.dataset.focusToken;o&&Qe(o,!0,!0)})})}function he(e,t,o){if(!t){e.innerHTML=`<p class="empty-state">${c(o)}</p>`;return}let r=t.contrastLc===null?"\u2014":`${t.contrastLc.toFixed(1)} Lc`;e.innerHTML=`
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${c(t.selector)}</code></dd>
      <dt>Colors</dt><dd>${T(t.computedColor)} <code>${c(t.computedColor??"\u2014")}</code></dd>
      <dt>Background</dt><dd>${T(t.computedBackground)} <code>${c(t.computedBackground??"\u2014")}</code></dd>
      <dt>Border</dt><dd>${T(t.computedBorder)} <code>${c(t.computedBorder??"\u2014")}</code></dd>
      <dt>APCA</dt><dd>${r}</dd>
    </dl>
    <p class="report-subhead">Matched channels</p>
    ${Ve(t)}
  `,Ge(e)}function P(){he(a.selectionDetails,n.selectedElement,"Click a page element while inspect mode is enabled to lock its context."),he(a.hoverDetails,n.hoveredElement,"Move your mouse over the inspected page to preview live token info.")}function H(){return n.snapshot?Object.values(n.snapshot.manifest.tokens):[]}function O(e){return n.snapshot?.manifest.tokens[e]??null}function Ye(e,t){return t==="dark"?e.dark:e.light}function me(e,t){let o=ne(t),r=C(t),i=j({r:r.r,g:r.g,b:r.b}),l=_(i);return`
    <div class="picker-shell">
      <div class="picker-stack">
        <div class="picker-swatch-row">
          <div
            class="picker-swatch"
            style="background-color:${c(o)}"
            aria-label="${e} anchor selected color preview"
          ></div>
        </div>
        <div
          class="picker-panel"
          style="background:${He}"
          role="slider"
          tabindex="0"
          aria-label="${e} anchor hue and brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${Math.round(i.v)}"
          aria-valuetext="${c(`Hue: ${Math.round(i.h)}\xB0, Saturation: ${Math.round(i.s)}%, Value: ${Math.round(i.v)}%`)}"
          data-picker-plane="${e}"
        >
          <div
            class="picker-handle"
            style="left:${l.xPercent}; top:${l.yPercent};"
          ></div>
        </div>
      </div>
    </div>
  `}function We(){if(!n.snapshot){a.editorToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=H();a.editorToken.innerHTML=e.map(t=>`<option value="${t.id}">${c(t.label)} (${t.id})</option>`).join(""),n.focusedTokenId||(n.focusedTokenId=e[0]?.id??""),a.editorToken.value=n.focusedTokenId}function v(e,t,o,r,i,l){return`
    <div class="slider-row">
      <span>${c(Oe[t])}</span>
      <input
        type="range"
        min="${r}"
        max="${i}"
        step="${l}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
      <input
        type="number"
        min="${r}"
        max="${i}"
        step="${l}"
        value="${o}"
        data-slider-prefix="${e}"
        data-channel="${t}"
      />
    </div>
  `}async function Je(e,t,o,r){let i=O(e);if(!i||!n.snapshot)return;let l={...t==="dark"?i.dark:i.light,[o]:r};await Se(e,t,l)}async function Se(e,t,o){n.snapshot&&await p.applyDraft([re(e,t,o)],{configPath:n.snapshot.configPath})}async function Me(e,t,o,r,i){let l=oe({h:o,s:r,v:i});await Se(e,t,ee(l.r,l.g,l.b))}async function $e(e,t,o,r,i){let l=F(o.width,o.height,r-o.left,i-o.top);await Me(e,t,l.h,l.s,l.v)}function fe(e){return e==="light"||e==="dark"?e:null}function ze(e){a.tokenEditor.querySelectorAll("[data-slider-prefix]").forEach(t=>{t.addEventListener("input",async()=>{let o=t.dataset.sliderPrefix,r=t.dataset.channel;if(!(!o||!r))try{await Je(e,o,r,Number(t.value))}catch(i){h("error",i instanceof Error?i.message:"token update failed")}})}),a.tokenEditor.querySelectorAll("[data-picker-plane]").forEach(t=>{t.addEventListener("pointerdown",o=>{let r=fe(t.dataset.pickerPlane);!r||!(o.currentTarget instanceof HTMLDivElement)||(n.pickerDrag={tokenId:e,mode:r,rect:o.currentTarget.getBoundingClientRect()},$e(e,r,n.pickerDrag.rect,o.clientX,o.clientY).catch(i=>{h("error",i instanceof Error?i.message:"token update failed")}))}),t.addEventListener("keydown",o=>{let r=fe(t.dataset.pickerPlane);if(!r)return;let i=O(e);if(!i)return;let l=Ye(i,r),s=C(l),d=j({r:s.r,g:s.g,b:s.b}),u=_(d),g=Number.parseFloat(u.xPercent),D=Number.parseFloat(u.yPercent);if(o.key==="ArrowLeft")g-=2;else if(o.key==="ArrowRight")g+=2;else if(o.key==="ArrowUp")D-=2;else if(o.key==="ArrowDown")D+=2;else return;o.preventDefault();let R=F(100,100,g,D);Me(e,r,R.h,R.s,R.v).catch(Q=>{h("error",Q instanceof Error?Q.message:"token update failed")})})}),a.tokenEditor.querySelectorAll("[data-token-exception], [data-token-max-chroma]").forEach(t=>{let o=async()=>{try{let r=a.tokenEditor.querySelector("[data-token-exception]")?.value,i=a.tokenEditor.querySelector("[data-token-max-chroma]")?.value;await p.applyDraft([ae(e,{altBehavior:r,maxChroma:i===""?null:Number(i)})],{configPath:n.snapshot?.configPath})}catch(r){h("error",r instanceof Error?r.message:"exception update failed")}};t.addEventListener("change",o),t.addEventListener("input",o)})}function Xe(){a.modeEditor.querySelectorAll("[data-alt-setting]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let o=e.dataset.altSetting;if(!o)return;let r;o==="source"?r={source:e.value}:o==="harmonyLock"?r={harmonyLock:e.checked}:o==="grayscalePreview"?r={grayscalePreview:e.checked}:r={delta:{[o]:Number(e.value)}};try{await p.applyDraft([ie(r)],{configPath:n.snapshot.configPath})}catch(i){h("error",i instanceof Error?i.message:"alt update failed")}};e.addEventListener("change",t),e.addEventListener("input",t)})}function A(){if(!n.snapshot||!n.focusedTokenId){a.tokenEditor.innerHTML='<p class="empty-state">Select a token to edit it.</p>',a.modeEditor.innerHTML='<p class="empty-state">Connect to the engine to edit theme state.</p>',a.tokenValidation.innerHTML='<p class="empty-state">No validation details yet.</p>';return}let e=O(n.focusedTokenId);if(!e){a.tokenEditor.innerHTML='<p class="empty-state">Selected token is unavailable.</p>';return}let t=B(),o=n.snapshot.resolved[t].colors[e.id],r=pe(n.snapshot,e.id,t);a.tokenEditor.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(b(o))}"></span>
      <div>
        <strong>${c(e.label)}</strong>
        <div class="meta">${c(e.description)}</div>
        <code>${c(q(o))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      <div class="anchor-editor-layout">
        ${me("light",e.light)}
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
        ${me("dark",e.dark)}
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
      <div class="meta">${e.altParent?`Alt derives from ${c(e.altParent)}.`:"No alt parent override."}</div>
    </div>
  `,a.modeEditor.innerHTML=`
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
  `,a.tokenValidation.innerHTML=r.length?`<div class="report-list">${r.map(i=>`<div class="report-item severity-warn"><span>${c(i)}</span><span></span><span></span></div>`).join("")}</div>`:'<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>',ze(e.id),Xe()}function Ke(){if(!n.snapshot){a.aliasList.innerHTML='<p class="empty-state">Connect to the engine to edit aliases.</p>';return}if(n.snapshot.manifest.aliases.length===0){a.aliasList.innerHTML='<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';return}a.aliasList.innerHTML=`
    <div class="alias-list">
      ${n.snapshot.manifest.aliases.map((e,t)=>`
            <div class="alias-row">
              <input type="text" value="${c(e.name)}" data-alias-index="${t}" data-alias-field="name" />
              <select data-alias-index="${t}" data-alias-field="tokenId">
                ${H().map(o=>`
                      <option value="${o.id}" ${o.id===e.tokenId?"selected":""}>
                        ${c(o.label)}
                      </option>
                    `).join("")}
              </select>
              <button type="button" data-remove-alias="${t}" class="secondary">Remove</button>
            </div>
          `).join("")}
    </div>
  `,a.aliasList.querySelectorAll("[data-alias-index]").forEach(e=>{let t=async()=>{if(!n.snapshot)return;let o=Number(e.dataset.aliasIndex),r=e.dataset.aliasField==="name"?{name:e.value}:{tokenId:e.value};try{await p.applyDraft([se(o,r)],{configPath:n.snapshot.configPath})}catch(i){h("error",i instanceof Error?i.message:"alias update failed")}};e.addEventListener("input",t),e.addEventListener("change",t)}),a.aliasList.querySelectorAll("[data-remove-alias]").forEach(e=>{e.addEventListener("click",async()=>{if(!n.snapshot)return;let t=Number(e.dataset.removeAlias);try{await p.applyDraft([le(t)],{configPath:n.snapshot.configPath})}catch(o){h("error",o instanceof Error?o.message:"alias remove failed")}})})}function z(){if(!n.importProposal){a.importReview.innerHTML='<p class="empty-state">Add a source CSS path, scan it, then review mappings before applying them to the draft.</p>';return}a.importReview.innerHTML=`
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
                ${H().map(t=>`
                      <option value="${t.id}" ${n.importSelection[e.sourceName]===t.id?"selected":""}>
                        ${c(t.label)}
                      </option>
                    `).join("")}
              </select>
              <span class="token-chip">${T(e.light?b(e.light):null)} ${T(e.dark?b(e.dark):null)}</span>
            </div>
          `).join("")}
    </div>
  `,a.importReview.querySelectorAll("[data-import-source]").forEach(e=>{e.addEventListener("change",()=>{let t=e.dataset.importSource;t&&(n.importSelection[t]=e.value)})})}function Qe(e,t=!1,o=!1){n.focusedTokenId=e,o&&w("authoring"),t&&(n.highlightedToken=e,m({kind:"reveal-token-usage",tokenId:e})),A(),k()}function k(){if(!n.snapshot){a.tokenList.innerHTML='<p class="empty-state">Connect to the engine to load tokens.</p>';return}let e=B(),t=n.snapshot.resolved[e],o=n.tokenFilter,r=[];for(let i of n.snapshot.tokenGroups){let l=(n.snapshot.tokensByGroup[i]??[]).filter(s=>s.includes(o));if(l.length){r.push(`<div class="token-group-heading">${c(i)}</div>`);for(let s of l){let d=n.snapshot.manifest.tokens[s];if(!d)continue;let u=n.coverage?.byToken[s],g=["token-row",n.highlightedToken===s?"is-highlighted":"",n.focusedTokenId===s?"is-focused":""].filter(Boolean).join(" ");r.push(`
        <button class="${g}" data-token-id="${s}" type="button">
          <span class="swatch" style="background:${c(t.colors[s]?.css??"")}"></span>
          <div>
            <div class="token-name">${c(d.label)}</div>
            <div class="token-value">${c(s)} \xB7 ${c(t.colors[s]?.css??"")}</div>
          </div>
          <span class="token-count">${u===void 0?"\xB7":`${u} used`}</span>
          <span aria-hidden="true">\u203A</span>
        </button>
      `)}}}a.tokenList.innerHTML=r.join(""),a.tokenList.querySelectorAll("[data-token-id]").forEach(i=>{i.addEventListener("click",()=>{let l=i.dataset.tokenId;if(!l)return;let s=n.highlightedToken===l?null:l;n.highlightedToken=s,n.focusedTokenId=l,m({kind:"highlight-token",tokenId:s}),k(),A()})})}function Le(){let e=n.coverage;if(!e){a.coverageOutput.innerHTML='<p class="empty-state">Run a scan to see token usage.</p>',a.coverageSummary.textContent="";return}let t=Object.entries(e.byToken).filter(([,s])=>s>0).length,o=Object.keys(e.byToken).length,r=[...Object.entries(e.byToken)].filter(([,s])=>s>0).sort((s,d)=>d[1]-s[1]).slice(0,20),i=e.unusedTokens.slice(0,20),l=e.rawColorViolations.slice(0,20);a.coverageSummary.textContent=`${e.totalElements} elements \xB7 ${t}/${o} tokens used \xB7 ${e.rawColorViolations.length} raw colors`,a.coverageOutput.innerHTML=`
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${r.map(([s,d])=>`<div class="report-item"><span>${c(s)}</span><span class="meta">${d} elements</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Unused tokens (${i.length})</p>
    <div class="report-list">
      ${i.map(s=>`<div class="report-item"><span>${c(s)}</span><span class="meta">0</span><span></span></div>`).join("")}
    </div>
    <p class="report-subhead">Raw color violations (${l.length})</p>
    <div class="report-list">
      ${l.map(s=>`
            <div class="report-item severity-warn">
              <span><code>${c(s.selector)}</code></span>
              <span class="meta">${c(s.property)}: ${c(s.value)}</span>
              <span></span>
            </div>
          `).join("")}
    </div>
  `}function Ie(){if(!n.contrast){a.contrastSummary.textContent="",a.contrastOutput.innerHTML='<p class="empty-state">Run an audit to surface APCA issues.</p>';return}if(a.contrastSummary.textContent=`${n.contrast.sampled} sampled \xB7 ${n.contrast.findings.length} potential failures`,!n.contrast.findings.length){a.contrastOutput.innerHTML='<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';return}a.contrastOutput.innerHTML=`
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
  `}function Ze(){if(!n.snapshot){a.overrideToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=H();a.overrideToken.innerHTML=e.map(t=>`<option value="${t.id}">${c(t.label)} (${t.id})</option>`).join(""),n.overrideTokenId&&(a.overrideToken.value=n.overrideTokenId)}function X(){if(!n.snapshot||!n.overrideTokenId)return;let e=O(n.overrideTokenId);if(!e)return;let t=B();if(t==="alt"){let o=n.snapshot.resolved.alt.colors[n.overrideTokenId];if(o){n.overrideColor={l:o.l,c:o.c,h:o.h,alpha:o.alpha};return}}n.overrideColor={...t==="dark"?e.dark:e.light}}function K(){if(!n.snapshot){a.overrideSliders.innerHTML='<p class="empty-state">Connect to the engine to use overrides.</p>';return}let e=n.overrideColor,t=b(e),o=[{key:"l",label:"Lightness",min:0,max:1,step:.001},{key:"c",label:"Chroma",min:0,max:.4,step:.001},{key:"h",label:"Hue",min:0,max:360,step:.1}];a.overrideSliders.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(t)}"></span>
      <div>
        <strong>${c(n.overrideTokenId||"Choose a token")}</strong>
        <code>${c(q(e))}</code>
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
  `,a.overrideSliders.querySelectorAll("[data-override-channel]").forEach(r=>{r.addEventListener("input",()=>{let i=r.dataset.overrideChannel;i&&(n.overrideColor={...n.overrideColor,[i]:Number(r.value)},K(),n.overrideTokenId&&m({kind:"override-token",tokenId:n.overrideTokenId,css:b(n.overrideColor)}))})})}function c(e){return e.replace(/[&<>"']/g,t=>{switch(t){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}window.addEventListener("pointermove",e=>{n.pickerDrag&&$e(n.pickerDrag.tokenId,n.pickerDrag.mode,n.pickerDrag.rect,e.clientX,e.clientY).catch(t=>{h("error",t instanceof Error?t.message:"token update failed")})});window.addEventListener("pointerup",()=>{n.pickerDrag=null});(async()=>(await je(),n.targetConfigPath?(S(),p.start()):W("choose target config"),m({kind:"ping"}),M()))();})();
