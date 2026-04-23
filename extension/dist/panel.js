"use strict";(()=>{var L=class{constructor(n){this.options=n}options;source=null;retryTimer=null;retryDelay=1e3;stopped=!1;start(){this.stopped=!1,this.connect()}stop(){this.stopped=!0,this.retryTimer&&(clearTimeout(this.retryTimer),this.retryTimer=null),this.source&&(this.source.close(),this.source=null)}async fetchSnapshot(n=this.requireConfigPath()){let r=await fetch(this.snapshotUrl(n),{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Snapshot request failed with status ${r.status}`);return await r.json()}async fetchBridgeConfig(n=this.requireConfigPath()){let r=await fetch(`${this.options.getBaseUrl()}/api/bridge/config?configPath=${encodeURIComponent(n)}`,{method:"GET",cache:"no-store"});if(!r.ok)throw new Error(`Bridge config request failed with status ${r.status}`);return await r.json()}async updateBridgeConfig(n,r={}){let o=r.configPath??this.requireConfigPath(),i=await fetch(`${this.options.getBaseUrl()}/api/bridge/config`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o,bridgeEnabled:n})});if(!i.ok)throw new Error(`Bridge config update failed with status ${i.status}`);return await i.json()}async pushOverride(n,r,o,i={}){let l=i.configPath??this.requireConfigPath(),s=await fetch(`${this.options.getBaseUrl()}/api/bridge/token`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tokenId:n,mode:r,color:o,persist:i.persist??!1,configPath:l})});if(!s.ok)throw new Error(`Override failed with status ${s.status}`)}async applyDraft(n,r={}){let o=r.configPath??this.requireConfigPath(),i=await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:o,commands:n})});if(!i.ok)throw new Error(`Draft update failed with status ${i.status}`)}async commitDraft(n={}){let r=n.configPath??this.requireConfigPath(),o=await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r})});if(!o.ok)throw new Error(`Commit failed with status ${o.status}`)}async discardDraft(n={}){let r=n.configPath??this.requireConfigPath(),o=await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:r})});if(!o.ok)throw new Error(`Discard failed with status ${o.status}`)}connect(){if(this.stopped)return;let n=this.options.getConfigPath().trim();if(!n){this.options.onStatus("idle","choose target config");return}this.options.onStatus("connecting");let r=this.eventsUrl(n);try{this.source=new EventSource(r)}catch(o){this.options.onStatus("error",o instanceof Error?o.message:"Unable to connect"),this.scheduleReconnect();return}this.source.addEventListener("hello",o=>{this.retryDelay=1e3,this.options.onStatus("connected"),this.handleSnapshotEvent(o)}),this.source.addEventListener("snapshot",o=>{this.handleSnapshotEvent(o)}),this.source.addEventListener("ping",()=>{}),this.source.onerror=()=>{this.options.onStatus("error","Stream disconnected"),this.source?.close(),this.source=null,this.scheduleReconnect()}}handleSnapshotEvent(n){try{let r=JSON.parse(n.data);r.snapshot&&this.options.onSnapshot(r.snapshot)}catch{}}scheduleReconnect(){this.stopped||(this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=setTimeout(()=>{this.retryDelay=Math.min(this.retryDelay*2,15e3),this.connect()},this.retryDelay))}requireConfigPath(){let n=this.options.getConfigPath().trim();if(!n)throw new Error("Choose a target project config first.");return n}snapshotUrl(n){return`${this.options.getBaseUrl()}/api/bridge/snapshot?configPath=${encodeURIComponent(n)}`}eventsUrl(n){return`${this.options.getBaseUrl()}/api/bridge/events?configPath=${encodeURIComponent(n)}`}};var ee="http://localhost:5173",f={bridgeUrl:"semanticColors.bridgeUrl",targetConfigPath:"semanticColors.targetConfigPath",recentTargetConfigPaths:"semanticColors.recentTargetConfigPaths"};function N(e){let n=e/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}function j(e){let n=e<=.0031308?e*12.92:1.055*Math.pow(e,.4166666666666667)-.055;return Math.max(0,Math.min(255,Math.round(n*255)))}function Be(e,n,r){let o=e+.3963377774*n+.2158037573*r,i=e-.1055613458*n-.0638541728*r,l=e-.0894841775*n-1.291485548*r,s=o**3,d=i**3,u=l**3;return[4.0767416621*s-3.3077115913*d+.2309699292*u,-1.2684380046*s+2.6097574011*d-.3413193965*u,-.0041960863*s-.7034186147*d+1.707614701*u]}function He(e,n,r){let o=Math.cbrt(.4122214708*e+.5363325363*n+.0514459929*r),i=Math.cbrt(.2119034982*e+.6806995451*n+.1073969566*r),l=Math.cbrt(.0883024619*e+.2817188376*n+.6299787005*r);return[.2104542553*o+.793617785*i-.0040720468*l,1.9779984951*o-2.428592205*i+.4505937099*l,.0259040371*o+.7827717662*i-.808675766*l]}function P(e){let n=e.h*Math.PI/180,r=e.c*Math.cos(n),o=e.c*Math.sin(n),[i,l,s]=Be(e.l,r,o);return{r:j(i),g:j(l),b:j(s),alpha:e.alpha??1}}function te(e,n,r,o=1){let[i,l,s]=He(N(e),N(n),N(r)),d=Math.sqrt(l*l+s*s),u=Math.atan2(s,l)*180/Math.PI;return u<0&&(u+=360),{l:i,c:d,h:u,alpha:o}}function ne(e){let n=e%360;return n<0?n+360:n}function Oe(e){return`#${[e.r,e.g,e.b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("").toUpperCase()}`}function re(e){let{r:n,g:r,b:o}=P(e);return Oe({r:n,g:r,b:o})}function _(e){let n=e.r/255,r=e.g/255,o=e.b/255,i=Math.max(n,r,o),l=Math.min(n,r,o),s=i-l,d=0;return s!==0&&(i===n?d=(r-o)/s%6:i===r?d=(o-n)/s+2:d=(n-r)/s+4,d*=60,d<0&&(d+=360)),{h:d,s:i===0?0:s/i*100,v:i*100}}function oe(e){let n=Math.max(0,Math.min(100,e.s))/100,r=Math.max(0,Math.min(100,e.v))/100,o=ne(e.h),i=r*n,l=i*(1-Math.abs(o/60%2-1)),s=r-i,d,u,g;return o<60?[d,u,g]=[i,l,0]:o<120?[d,u,g]=[l,i,0]:o<180?[d,u,g]=[0,i,l]:o<240?[d,u,g]=[0,l,i]:o<300?[d,u,g]=[l,0,i]:[d,u,g]=[i,0,l],{r:Math.round((d+s)*255),g:Math.round((u+s)*255),b:Math.round((g+s)*255)}}function F(e,n,r,o){let i=Math.max(e,1),l=Math.max(n,1),s=Math.max(0,Math.min(i,r)),u=Math.max(0,Math.min(l,o))/l,g=u<=.5;return{h:s/i*360,s:g?100:100-(u-.5)/.5*100,v:g?u/.5*100:100}}function q(e){let n=ne(e.h),r=Math.max(0,Math.min(100,e.s)),o=Math.max(0,Math.min(100,e.v));return{xPercent:`${n/360*100}%`,yPercent:o>=99.5?`${50+(100-r)/100*50}%`:`${o/100*50}%`}}function b(e){let{r:n,g:r,b:o,alpha:i}=P(e);return i<1?`rgba(${n}, ${r}, ${o}, ${i.toFixed(3)})`:`rgb(${n}, ${r}, ${o})`}function V(e){let n=(e.l*100).toFixed(2),r=e.c.toFixed(4),o=e.h.toFixed(2),i=e.alpha!==void 0&&e.alpha<1?` / ${e.alpha.toFixed(2)}`:"";return`oklch(${n}% ${r} ${o}${i})`}function ae(e,n,r){return{kind:"update-token-color",tokenId:e,mode:n,color:r}}function ie(e,n){return{kind:"update-token-exception",tokenId:e,patch:n}}function se(e){return{kind:"update-alt-settings",patch:e}}function G(e,n){return{kind:"add-alias",alias:{name:e,tokenId:n}}}function le(e,n){return{kind:"update-alias",index:e,patch:n}}function ce(e){return{kind:"remove-alias",index:e}}function de(){return{kind:"reset-manifest"}}function ue(e,n){return{kind:"apply-import-review",proposal:e,selection:n}}function pe(e,n,r){return n||(r==="dark"||r==="alt"?r:(e.manifest.alt.source==="dark"&&r==="light","light"))}function ge(e,n,r){let o=e.validations[r]?.perToken[n];if(!o)return[];let i=[];return o.gamutAdjusted&&i.push("Adjusted to stay in display gamut."),i.push(...o.contrastIssues),i}function Y(e){let n=e?.semanticClassMatches?.[0]?.tokenId;return n||(e?.matches.find(r=>r.tokenId)?.tokenId??null)}function he(e){return`panel:${e}`}var ke=chrome.devtools.inspectedWindow.tabId,De="linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",Ae={l:"Lightness",c:"Chroma",h:"Hue"},Re=12e3,Ue=12e3,t={bridgeUrl:ee,targetConfigPath:"",recentTargetConfigPaths:[],snapshot:null,coverage:null,contrast:null,highlightedToken:null,focusedTokenId:"",overrideTokenId:"",overrideColor:{l:.5,c:.1,h:240,alpha:1},overrideMode:"both",persistOverride:!1,activeMode:null,tokenFilter:"",hoverActive:!1,hoveredElement:null,selectedElement:null,pageInfo:{url:"",title:"",theme:null},importSourcePath:"",importProposal:null,importSelection:{},bridgeOutputEnabled:null,bridgeOutputPending:!1,bridgeOutputStatus:"Load target config",inPageDrawerVisible:!1,coverageScanTimeout:null,contrastAuditTimeout:null,pickerDrag:null},a={status:document.getElementById("bridge-status"),bridgeInput:document.getElementById("bridge-url"),bridgeBtn:document.getElementById("bridge-connect"),targetConfigInput:document.getElementById("target-config-path"),targetConfigLoad:document.getElementById("target-config-load"),bridgeOutputEnabled:document.getElementById("bridge-output-enabled"),bridgeOutputStatus:document.getElementById("bridge-output-status"),toggleInPageDrawer:document.getElementById("toggle-inpage-drawer"),inPageDrawerStatus:document.getElementById("inpage-drawer-status"),targetConfigOptions:document.getElementById("recent-target-configs"),modeSwitch:document.querySelector(".mode-switch"),draftStatus:document.getElementById("draft-status"),commitDraft:document.getElementById("commit-draft"),discardDraft:document.getElementById("discard-draft"),resetManifest:document.getElementById("reset-manifest"),tabs:document.querySelectorAll(".tabs button"),tabPanels:document.querySelectorAll("[data-tab-panel]"),hoverToggle:document.getElementById("hover-toggle"),clearSelection:document.getElementById("clear-selection"),pageInfo:document.getElementById("page-info"),selectionDetails:document.getElementById("selection-details"),hoverDetails:document.getElementById("hover-details"),editorToken:document.getElementById("editor-token"),tokenEditor:document.getElementById("token-editor"),tokenValidation:document.getElementById("token-validation"),modeEditor:document.getElementById("mode-editor"),aliasList:document.getElementById("alias-list"),addAlias:document.getElementById("add-alias"),addAliasCurrent:document.getElementById("add-alias-current"),importSourcePath:document.getElementById("import-source-path"),scanImport:document.getElementById("scan-import"),applyImportReview:document.getElementById("apply-import-review"),importStatus:document.getElementById("import-status"),importReview:document.getElementById("import-review"),tokenFilter:document.getElementById("token-filter"),tokenList:document.getElementById("token-list"),clearHighlight:document.getElementById("clear-highlight"),scanCoverage:document.getElementById("scan-coverage"),coverageSummary:document.getElementById("coverage-summary"),coverageOutput:document.getElementById("coverage-output"),scanContrast:document.getElementById("scan-contrast"),contrastSummary:document.getElementById("contrast-summary"),contrastOutput:document.getElementById("contrast-output"),overrideToken:document.getElementById("override-token"),overrideSliders:document.getElementById("override-sliders"),overrideMode:document.getElementById("override-mode"),overridePersist:document.getElementById("override-persist"),clearOverrides:document.getElementById("clear-overrides"),pushOverride:document.getElementById("push-override")},y=null;function Ne(e){let n=e;n?.source==="content"&&ye(n.payload)}function je(){let e;try{e=chrome.runtime.connect({name:he(ke)})}catch(n){return console.warn("[semantic-colors] panel port connect failed:",n),null}try{e.onMessage.addListener(Ne),e.onDisconnect.addListener(()=>{y===e&&(y=null)})}catch(n){console.warn("[semantic-colors] panel port listener bind failed:",n);try{e.disconnect()}catch{}return null}return y=e,e}function _e(){return y??je()}function be(e,n=!0){let r=_e();if(!r)return!1;try{return r.postMessage(e),!0}catch(o){return console.warn("[semantic-colors] panel port send failed:",o),n?(y===r&&(y=null),be(e,!1)):!1}}function m(e){be({source:"panel",tabId:ke,payload:e})||ye({kind:"error",message:"Extension relay disconnected. Retry the scan."})}function $(){t.coverageScanTimeout!==null&&(window.clearTimeout(t.coverageScanTimeout),t.coverageScanTimeout=null)}function w(){t.contrastAuditTimeout!==null&&(window.clearTimeout(t.contrastAuditTimeout),t.contrastAuditTimeout=null)}function ye(e){switch(e.kind){case"hello":case"page-info":t.pageInfo={url:e.url,title:e.title,theme:"theme"in e?e.theme:null},Se(),t.snapshot&&H(),t.inPageDrawerVisible&&m({kind:"set-inpage-drawer",visible:!0});break;case"hover-element":t.hoveredElement=e.payload,C();break;case"selected-element":{t.selectedElement=e.payload;let n=e.payload.semanticClassMatches[0]?.tokenId??null;n&&(t.focusedTokenId=n,x("authoring")),t.focusedTokenId||(t.focusedTokenId=Y(e.payload)??t.focusedTokenId),M();break}case"hover-cleared":t.hoveredElement=null,C();break;case"selection-cleared":t.selectedElement=null,C();break;case"inpage-drawer-state":t.inPageDrawerVisible=e.visible,J();break;case"inpage-token-focus":Fe(e.tokenId,e.source);break;case"coverage-report":$(),t.coverage=e.report,Ie(),k();break;case"contrast-report":w(),t.contrast=e.report,xe();break;case"error":console.warn("[semantic-colors] content error:",e.message),a.coverageSummary.textContent==="Scanning..."&&($(),a.coverageSummary.textContent=`Scan failed: ${e.message}`),a.contrastSummary.textContent==="Auditing..."&&(w(),a.contrastSummary.textContent=`Audit failed: ${e.message}`);break}}function Fe(e,n){we(e,!0,!0),n==="preview"&&m({kind:"focus-token",tokenId:e})}var p=new L({getBaseUrl:()=>t.bridgeUrl,getConfigPath:()=>t.targetConfigPath,onStatus:h,onSnapshot:e=>{t.snapshot=e,e.configPath!==t.targetConfigPath&&I(e.configPath).then(()=>{S()}),t.focusedTokenId||(t.focusedTokenId=Y(t.selectedElement)??Object.keys(e.manifest.tokens)[0]??""),M(),H()}});function h(e,n){a.status.className=`status status-${e}`,a.status.textContent=n?`${e} \xB7 ${n}`:e}function Ee(){return t.snapshot?.configPath??t.targetConfigPath.trim()}function W(e){return t.targetConfigPath?t.bridgeOutputPending?"Updating...":e?e.bridgeEnabled?"Enabled: save/commit writes CSS":"Disabled: save/commit skips CSS":t.bridgeOutputEnabled===!0?"Enabled: save/commit writes CSS":t.bridgeOutputEnabled===!1?"Disabled: save/commit skips CSS":t.bridgeOutputStatus:"Load target config"}function E(){let e=t.targetConfigPath.length>0;a.bridgeOutputEnabled.disabled=!e||t.bridgeOutputPending,a.bridgeOutputEnabled.indeterminate=e&&t.bridgeOutputEnabled===null,a.bridgeOutputEnabled.checked=t.bridgeOutputEnabled??!1,a.bridgeOutputStatus.textContent=W()}function J(){a.toggleInPageDrawer.textContent=t.inPageDrawerVisible?"Hide in-page preview":"Show in-page preview",a.inPageDrawerStatus.textContent=t.inPageDrawerVisible?"Visible":"Hidden"}function z(e){$(),w(),t.snapshot=null,t.coverage=null,t.contrast=null,t.highlightedToken=null,t.focusedTokenId="",t.overrideTokenId="",t.importProposal=null,t.importSelection={},t.targetConfigPath||(t.bridgeOutputEnabled=null,t.bridgeOutputStatus="Load target config"),m({kind:"clear-snapshot"}),e&&h("idle",e),M()}function Te(){a.targetConfigOptions.innerHTML=t.recentTargetConfigPaths.map(e=>`<option value="${c(e)}"></option>`).join("")}async function I(e){let n=e.trim();t.targetConfigPath=n,a.targetConfigInput.value=n,n&&(t.recentTargetConfigPaths=[n,...t.recentTargetConfigPaths.filter(r=>r!==n)].slice(0,8)),Te();try{await chrome.storage.local.set({[f.targetConfigPath]:n,[f.recentTargetConfigPaths]:t.recentTargetConfigPaths})}catch{}}async function qe(){try{let e=await chrome.storage.local.get([f.bridgeUrl,f.targetConfigPath,f.recentTargetConfigPaths]),n=e[f.bridgeUrl];typeof n=="string"&&n.trim()&&(t.bridgeUrl=n.trim());let r=e[f.targetConfigPath];typeof r=="string"&&(t.targetConfigPath=r.trim());let o=e[f.recentTargetConfigPaths];Array.isArray(o)&&(t.recentTargetConfigPaths=o.filter(i=>typeof i=="string"&&i.trim().length>0))}catch{}a.bridgeInput.value=t.bridgeUrl,a.targetConfigInput.value=t.targetConfigPath,Te()}async function S(){let e=t.targetConfigPath.trim();if(!e){t.bridgeOutputEnabled=null,t.bridgeOutputPending=!1,t.bridgeOutputStatus="Load target config",E();return}t.bridgeOutputPending=!0,t.bridgeOutputStatus="Loading config...",E();try{let n=await p.fetchBridgeConfig(e);n.configPath!==t.targetConfigPath&&await I(n.configPath),t.bridgeOutputEnabled=n.bridgeEnabled,t.bridgeOutputStatus=W(n)}catch(n){t.bridgeOutputEnabled=null,t.bridgeOutputStatus=n instanceof Error?n.message:"Failed to load bridge config"}finally{t.bridgeOutputPending=!1,E()}}async function Ve(e){let n=Ee();if(!n)return;let r=t.bridgeOutputEnabled,o=t.bridgeOutputStatus;t.bridgeOutputPending=!0,t.bridgeOutputEnabled=e,t.bridgeOutputStatus="Saving config...",E();try{let i=await p.updateBridgeConfig(e,{configPath:n});i.configPath!==t.targetConfigPath&&await I(i.configPath),t.bridgeOutputEnabled=i.bridgeEnabled,t.bridgeOutputStatus=W(i)}catch(i){t.bridgeOutputEnabled=r,t.bridgeOutputStatus=i instanceof Error?i.message:o||"Failed to update config"}finally{t.bridgeOutputPending=!1,E()}}async function Ge(e){t.bridgeUrl=e;try{await chrome.storage.local.set({[f.bridgeUrl]:e})}catch{}}async function Pe(e){if(p.stop(),await I(e),z(t.targetConfigPath?"loading target config":"choose target config"),!t.targetConfigPath){await S();return}await S(),p.start()}function x(e){a.tabs.forEach(n=>{n.classList.toggle("is-active",n.dataset.tab===e)}),a.tabPanels.forEach(n=>{n.classList.toggle("is-active",n.dataset.tabPanel===e)})}a.tabs.forEach(e=>{e.addEventListener("click",()=>{let n=e.dataset.tab;n&&x(n)})});a.modeSwitch.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{a.modeSwitch.querySelectorAll("button").forEach(r=>r.classList.toggle("is-active",r===e));let n=e.dataset.mode??"null";t.activeMode=n==="null"?null:n,m({kind:"set-theme",mode:t.activeMode}),t.overrideTokenId&&K(),M(),H()})});a.hoverToggle.addEventListener("change",()=>{t.hoverActive=a.hoverToggle.checked,m({kind:"hover-inspector",enabled:t.hoverActive})});a.clearSelection.addEventListener("click",()=>{t.selectedElement=null,m({kind:"clear-selection"}),C()});a.toggleInPageDrawer.addEventListener("click",()=>{t.inPageDrawerVisible=!t.inPageDrawerVisible,J(),m({kind:"set-inpage-drawer",visible:t.inPageDrawerVisible}),t.inPageDrawerVisible&&t.snapshot&&H()});a.targetConfigLoad.addEventListener("click",async()=>{await Pe(a.targetConfigInput.value)});a.targetConfigInput.addEventListener("keydown",e=>{e.key==="Enter"&&(e.preventDefault(),Pe(a.targetConfigInput.value))});a.bridgeOutputEnabled.addEventListener("change",()=>{Ve(a.bridgeOutputEnabled.checked)});a.commitDraft.addEventListener("click",async()=>{if(t.snapshot)try{await p.commitDraft({configPath:t.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"commit failed")}});a.discardDraft.addEventListener("click",async()=>{if(t.snapshot)try{await p.discardDraft({configPath:t.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"discard failed")}});a.resetManifest.addEventListener("click",async()=>{if(t.snapshot)try{await p.applyDraft([de()],{configPath:t.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"reset failed")}});a.editorToken.addEventListener("change",()=>{t.focusedTokenId=a.editorToken.value,A(),k()});a.addAlias.addEventListener("click",async()=>{if(!t.snapshot)return;let e=t.focusedTokenId||Object.keys(t.snapshot.manifest.tokens)[0];if(e)try{await p.applyDraft([G("color-new-alias",e)],{configPath:t.snapshot.configPath}),x("aliases")}catch(n){h("error",n instanceof Error?n.message:"alias add failed")}});a.addAliasCurrent.addEventListener("click",async()=>{if(!(!t.snapshot||!t.focusedTokenId))try{await p.applyDraft([G(`color-${t.focusedTokenId}`,t.focusedTokenId)],{configPath:t.snapshot.configPath})}catch(e){h("error",e instanceof Error?e.message:"alias add failed")}});a.importSourcePath.addEventListener("input",()=>{t.importSourcePath=a.importSourcePath.value});a.scanImport.addEventListener("click",async()=>{if(!(!t.snapshot||!t.importSourcePath.trim())){a.importStatus.textContent="Scanning CSS variables...";try{let e=await fetch(`${t.bridgeUrl}/api/project/import`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({configPath:t.snapshot.configPath,sourcePath:t.importSourcePath.trim()})});if(!e.ok)throw new Error(`Import scan failed with status ${e.status}`);t.importProposal=await e.json(),t.importSelection=Object.fromEntries(t.importProposal.candidates.map(n=>[n.sourceName,n.suggestedTokenId??""])),a.importStatus.textContent=`Loaded ${t.importProposal.candidates.length} candidates.`,X()}catch(e){a.importStatus.textContent=e instanceof Error?e.message:"Import scan failed."}}});a.applyImportReview.addEventListener("click",async()=>{if(!(!t.snapshot||!t.importProposal))try{await p.applyDraft([ue(t.importProposal,t.importSelection)],{configPath:t.snapshot.configPath}),t.importProposal=null,t.importSelection={},a.importStatus.textContent="Applied reviewed mappings into the draft manifest.",X()}catch(e){a.importStatus.textContent=e instanceof Error?e.message:"Import apply failed."}});a.tokenFilter.addEventListener("input",()=>{t.tokenFilter=a.tokenFilter.value.toLowerCase(),k()});a.clearHighlight.addEventListener("click",()=>{t.highlightedToken=null,m({kind:"highlight-token",tokenId:null}),k()});a.scanCoverage.addEventListener("click",()=>{t.snapshot&&($(),a.coverageSummary.textContent="Scanning...",t.coverageScanTimeout=window.setTimeout(()=>{a.coverageSummary.textContent==="Scanning..."&&(a.coverageSummary.textContent="Scan timed out while waiting for the inspected page response.")},Re),m({kind:"scan-coverage",tokenColors:Ce(),aliases:t.snapshot.manifest.aliases}))});a.scanContrast.addEventListener("click",()=>{t.snapshot&&(w(),a.contrastSummary.textContent="Auditing...",t.contrastAuditTimeout=window.setTimeout(()=>{a.contrastSummary.textContent==="Auditing..."&&(a.contrastSummary.textContent="Audit timed out while waiting for the inspected page response.")},Ue),m({kind:"scan-contrast",tokenColors:Ce(),aliases:t.snapshot.manifest.aliases}))});a.overrideToken.addEventListener("change",()=>{t.overrideTokenId=a.overrideToken.value,K(),Q()});a.overrideMode.addEventListener("change",()=>{t.overrideMode=a.overrideMode.value});a.overridePersist.addEventListener("change",()=>{t.persistOverride=a.overridePersist.checked});a.clearOverrides.addEventListener("click",()=>{m({kind:"clear-all-overrides"})});a.pushOverride.addEventListener("click",async()=>{if(t.overrideTokenId)try{await p.pushOverride(t.overrideTokenId,t.overrideMode,t.overrideColor,{persist:t.persistOverride,configPath:Ee()})}catch(e){h("error",e instanceof Error?e.message:"push failed")}});a.bridgeBtn.addEventListener("click",async()=>{let e=a.bridgeInput.value.trim();e&&(await Ge(e),p.stop(),z(t.targetConfigPath?"reconnecting to target config":"choose target config"),t.targetConfigPath&&(S(),p.start()))});function B(){return t.snapshot?pe(t.snapshot,t.activeMode,t.pageInfo.theme):"light"}function Ce(){if(!t.snapshot)return{};let e=t.snapshot.resolved[B()],n={};for(let[r,o]of Object.entries(e.colors))n[r]=o.css;return n}function H(){t.snapshot&&m({kind:"update-snapshot",snapshot:t.snapshot})}function M(){E(),J(),Ye(),Se(),C(),Xe(),A(),et(),X(),k(),Ie(),xe(),tt(),!t.overrideTokenId&&t.snapshot&&(t.overrideTokenId=Object.keys(t.snapshot.manifest.tokens)[0]??"",K()),Q()}function Ye(){if(!t.snapshot){a.draftStatus.textContent=t.targetConfigPath?`Waiting for bridge snapshot for ${t.targetConfigPath}...`:"Choose a target project config to start authoring.";return}let e=t.snapshot.draft.dirty?`Target ${t.snapshot.configPath} \xB7 Draft dirty \xB7 base v${t.snapshot.draft.baseVersion} \xB7 last edit ${t.snapshot.draft.lastEditor}`:`Target ${t.snapshot.configPath} \xB7 Draft clean \xB7 synced at v${t.snapshot.version}`;a.draftStatus.textContent=e}function Se(){a.pageInfo.textContent=t.pageInfo.url?`Inspecting: ${t.pageInfo.title||"(untitled)"} \u2014 ${t.pageInfo.url} \xB7 data-theme=${t.pageInfo.theme??"(none)"}`:"Waiting for inspected page to load..."}function T(e){return e?`<span class="swatch" style="background:${c(e)}"></span>`:""}function We(e){return`
    <div class="token-match-list">
      ${e.matches.map(n=>{let r=n.tokenId?c(n.tokenId):"No token match",o=n.aliases.length?` \xB7 ${c(n.aliases.join(", "))}`:"",i=n.tokenId?`<button type="button" data-focus-token="${c(n.tokenId)}">${r}</button>`:r;return`
            <div class="report-item">
              <span>
                <strong>${c(n.channel)}</strong>
                <div class="meta">${c(n.cssValue??"\u2014")}</div>
              </span>
              <span class="token-chip">${T(n.cssValue)} ${i}</span>
              <span class="meta">${o||"\u2014"}</span>
            </div>
          `}).join("")}
    </div>
  `}function Je(e){e.querySelectorAll("[data-focus-token]").forEach(n=>{n.addEventListener("click",()=>{let r=n.dataset.focusToken;r&&we(r,!0,!0)})})}function me(e,n,r){if(!n){e.innerHTML=`<p class="empty-state">${c(r)}</p>`;return}let o=n.contrastLc===null?"\u2014":`${n.contrastLc.toFixed(1)} Lc`;e.innerHTML=`
    <dl class="hover-grid">
      <dt>Element</dt><dd><code>${c(n.selector)}</code></dd>
      <dt>Colors</dt><dd>${T(n.computedColor)} <code>${c(n.computedColor??"\u2014")}</code></dd>
      <dt>Background</dt><dd>${T(n.computedBackground)} <code>${c(n.computedBackground??"\u2014")}</code></dd>
      <dt>Border</dt><dd>${T(n.computedBorder)} <code>${c(n.computedBorder??"\u2014")}</code></dd>
      <dt>APCA</dt><dd>${o}</dd>
    </dl>
    <p class="report-subhead">Matched channels</p>
    ${We(n)}
  `,Je(e)}function C(){me(a.selectionDetails,t.selectedElement,"Click a page element while inspect mode is enabled to lock its context."),me(a.hoverDetails,t.hoveredElement,"Move your mouse over the inspected page to preview live token info.")}function O(){return t.snapshot?Object.values(t.snapshot.manifest.tokens):[]}function D(e){return t.snapshot?.manifest.tokens[e]??null}function ze(e,n){return n==="dark"?e.dark:e.light}function fe(e,n){let r=re(n),o=P(n),i=_({r:o.r,g:o.g,b:o.b}),l=q(i);return`
    <div class="picker-shell">
      <div class="picker-stack">
        <div class="picker-swatch-row">
          <div
            class="picker-swatch"
            style="background-color:${c(r)}"
            aria-label="${e} anchor selected color preview"
          ></div>
        </div>
        <div
          class="picker-panel"
          style="background:${De}"
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
  `}function Xe(){if(!t.snapshot){a.editorToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=O();a.editorToken.innerHTML=e.map(n=>`<option value="${n.id}">${c(n.label)} (${n.id})</option>`).join(""),t.focusedTokenId||(t.focusedTokenId=e[0]?.id??""),a.editorToken.value=t.focusedTokenId}function v(e,n,r,o,i,l){return`
    <div class="slider-row">
      <span>${c(Ae[n])}</span>
      <input
        type="range"
        min="${o}"
        max="${i}"
        step="${l}"
        value="${r}"
        data-slider-prefix="${e}"
        data-channel="${n}"
      />
      <input
        type="number"
        min="${o}"
        max="${i}"
        step="${l}"
        value="${r}"
        data-slider-prefix="${e}"
        data-channel="${n}"
      />
    </div>
  `}async function Ke(e,n,r,o){let i=D(e);if(!i||!t.snapshot)return;let l={...n==="dark"?i.dark:i.light,[r]:o};await Me(e,n,l)}async function Me(e,n,r){t.snapshot&&await p.applyDraft([ae(e,n,r)],{configPath:t.snapshot.configPath})}async function Le(e,n,r,o,i){let l=oe({h:r,s:o,v:i});await Me(e,n,te(l.r,l.g,l.b))}async function $e(e,n,r,o,i){let l=F(r.width,r.height,o-r.left,i-r.top);await Le(e,n,l.h,l.s,l.v)}function ve(e){return e==="light"||e==="dark"?e:null}function Qe(e){a.tokenEditor.querySelectorAll("[data-slider-prefix]").forEach(n=>{n.addEventListener("input",async()=>{let r=n.dataset.sliderPrefix,o=n.dataset.channel;if(!(!r||!o))try{await Ke(e,r,o,Number(n.value))}catch(i){h("error",i instanceof Error?i.message:"token update failed")}})}),a.tokenEditor.querySelectorAll("[data-picker-plane]").forEach(n=>{n.addEventListener("pointerdown",r=>{let o=ve(n.dataset.pickerPlane);!o||!(r.currentTarget instanceof HTMLDivElement)||(t.pickerDrag={tokenId:e,mode:o,rect:r.currentTarget.getBoundingClientRect()},$e(e,o,t.pickerDrag.rect,r.clientX,r.clientY).catch(i=>{h("error",i instanceof Error?i.message:"token update failed")}))}),n.addEventListener("keydown",r=>{let o=ve(n.dataset.pickerPlane);if(!o)return;let i=D(e);if(!i)return;let l=ze(i,o),s=P(l),d=_({r:s.r,g:s.g,b:s.b}),u=q(d),g=Number.parseFloat(u.xPercent),R=Number.parseFloat(u.yPercent);if(r.key==="ArrowLeft")g-=2;else if(r.key==="ArrowRight")g+=2;else if(r.key==="ArrowUp")R-=2;else if(r.key==="ArrowDown")R+=2;else return;r.preventDefault();let U=F(100,100,g,R);Le(e,o,U.h,U.s,U.v).catch(Z=>{h("error",Z instanceof Error?Z.message:"token update failed")})})}),a.tokenEditor.querySelectorAll("[data-token-exception], [data-token-max-chroma]").forEach(n=>{let r=async()=>{try{let o=a.tokenEditor.querySelector("[data-token-exception]")?.value,i=a.tokenEditor.querySelector("[data-token-max-chroma]")?.value;await p.applyDraft([ie(e,{altBehavior:o,maxChroma:i===""?null:Number(i)})],{configPath:t.snapshot?.configPath})}catch(o){h("error",o instanceof Error?o.message:"exception update failed")}};n.addEventListener("change",r),n.addEventListener("input",r)})}function Ze(){a.modeEditor.querySelectorAll("[data-alt-setting]").forEach(e=>{let n=async()=>{if(!t.snapshot)return;let r=e.dataset.altSetting;if(!r)return;let o;r==="source"?o={source:e.value}:r==="harmonyLock"?o={harmonyLock:e.checked}:r==="grayscalePreview"?o={grayscalePreview:e.checked}:o={delta:{[r]:Number(e.value)}};try{await p.applyDraft([se(o)],{configPath:t.snapshot.configPath})}catch(i){h("error",i instanceof Error?i.message:"alt update failed")}};e.addEventListener("change",n),e.addEventListener("input",n)})}function A(){if(!t.snapshot||!t.focusedTokenId){a.tokenEditor.innerHTML='<p class="empty-state">Select a token to edit it.</p>',a.modeEditor.innerHTML='<p class="empty-state">Connect to the engine to edit theme state.</p>',a.tokenValidation.innerHTML='<p class="empty-state">No validation details yet.</p>';return}let e=D(t.focusedTokenId);if(!e){a.tokenEditor.innerHTML='<p class="empty-state">Selected token is unavailable.</p>';return}let n=B(),r=t.snapshot.resolved[n].colors[e.id],o=ge(t.snapshot,e.id,n);a.tokenEditor.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(b(r))}"></span>
      <div>
        <strong>${c(e.label)}</strong>
        <div class="meta">${c(e.description)}</div>
        <code>${c(V(r))}</code>
      </div>
    </div>
    <div class="editor-block">
      <h3>Light anchor</h3>
      <div class="anchor-editor-layout">
        ${fe("light",e.light)}
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
        ${fe("dark",e.dark)}
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
      ${v("alt","h",t.snapshot.manifest.alt.delta.h,-180,180,1).replaceAll('data-slider-prefix="alt"','data-alt-setting="h"')}
      ${v("alt","c",t.snapshot.manifest.alt.delta.c,-.16,.16,.005).replaceAll('data-slider-prefix="alt"','data-alt-setting="c"')}
      ${v("alt","l",t.snapshot.manifest.alt.delta.l,-.2,.2,.01).replaceAll('data-slider-prefix="alt"','data-alt-setting="l"')}
    </div>
  `,a.tokenValidation.innerHTML=o.length?`<div class="report-list">${o.map(i=>`<div class="report-item severity-warn"><span>${c(i)}</span><span></span><span></span></div>`).join("")}</div>`:'<p class="empty-state">No validation warnings for the focused token in the active preview mode.</p>',Qe(e.id),Ze()}function et(){if(!t.snapshot){a.aliasList.innerHTML='<p class="empty-state">Connect to the engine to edit aliases.</p>';return}if(t.snapshot.manifest.aliases.length===0){a.aliasList.innerHTML='<p class="empty-state">No aliases yet. Add aliases for project-specific variable names.</p>';return}a.aliasList.innerHTML=`
    <div class="alias-list">
      ${t.snapshot.manifest.aliases.map((e,n)=>`
            <div class="alias-row">
              <input type="text" value="${c(e.name)}" data-alias-index="${n}" data-alias-field="name" />
              <select data-alias-index="${n}" data-alias-field="tokenId">
                ${O().map(r=>`
                      <option value="${r.id}" ${r.id===e.tokenId?"selected":""}>
                        ${c(r.label)}
                      </option>
                    `).join("")}
              </select>
              <button type="button" data-remove-alias="${n}" class="secondary">Remove</button>
            </div>
          `).join("")}
    </div>
  `,a.aliasList.querySelectorAll("[data-alias-index]").forEach(e=>{let n=async()=>{if(!t.snapshot)return;let r=Number(e.dataset.aliasIndex),o=e.dataset.aliasField==="name"?{name:e.value}:{tokenId:e.value};try{await p.applyDraft([le(r,o)],{configPath:t.snapshot.configPath})}catch(i){h("error",i instanceof Error?i.message:"alias update failed")}};e.addEventListener("input",n),e.addEventListener("change",n)}),a.aliasList.querySelectorAll("[data-remove-alias]").forEach(e=>{e.addEventListener("click",async()=>{if(!t.snapshot)return;let n=Number(e.dataset.removeAlias);try{await p.applyDraft([ce(n)],{configPath:t.snapshot.configPath})}catch(r){h("error",r instanceof Error?r.message:"alias remove failed")}})})}function X(){if(!t.importProposal){a.importReview.innerHTML='<p class="empty-state">Add a source CSS path, scan it, then review mappings before applying them to the draft.</p>';return}a.importReview.innerHTML=`
    <div class="import-list">
      ${t.importProposal.candidates.map(e=>`
            <div class="import-card">
              <div>
                <strong>--${c(e.sourceName)}</strong>
                <div class="meta">${c(e.rawValue)}</div>
                <div class="meta">${c(e.reason)}</div>
              </div>
              <select data-import-source="${c(e.sourceName)}">
                <option value="">Skip mapping</option>
                ${O().map(n=>`
                      <option value="${n.id}" ${t.importSelection[e.sourceName]===n.id?"selected":""}>
                        ${c(n.label)}
                      </option>
                    `).join("")}
              </select>
              <span class="token-chip">${T(e.light?b(e.light):null)} ${T(e.dark?b(e.dark):null)}</span>
            </div>
          `).join("")}
    </div>
  `,a.importReview.querySelectorAll("[data-import-source]").forEach(e=>{e.addEventListener("change",()=>{let n=e.dataset.importSource;n&&(t.importSelection[n]=e.value)})})}function we(e,n=!1,r=!1){t.focusedTokenId=e,r&&x("authoring"),n&&(t.highlightedToken=e,m({kind:"reveal-token-usage",tokenId:e})),A(),k()}function k(){if(!t.snapshot){a.tokenList.innerHTML='<p class="empty-state">Connect to the engine to load tokens.</p>';return}let e=B(),n=t.snapshot.resolved[e],r=t.tokenFilter,o=[];for(let i of t.snapshot.tokenGroups){let l=(t.snapshot.tokensByGroup[i]??[]).filter(s=>s.includes(r));if(l.length){o.push(`<div class="token-group-heading">${c(i)}</div>`);for(let s of l){let d=t.snapshot.manifest.tokens[s];if(!d)continue;let u=t.coverage?.byToken[s],g=["token-row",t.highlightedToken===s?"is-highlighted":"",t.focusedTokenId===s?"is-focused":""].filter(Boolean).join(" ");o.push(`
        <button class="${g}" data-token-id="${s}" type="button">
          <span class="swatch" style="background:${c(n.colors[s]?.css??"")}"></span>
          <div>
            <div class="token-name">${c(d.label)}</div>
            <div class="token-value">${c(s)} \xB7 ${c(n.colors[s]?.css??"")}</div>
          </div>
          <span class="token-count">${u===void 0?"\xB7":`${u} used`}</span>
          <span aria-hidden="true">\u203A</span>
        </button>
      `)}}}a.tokenList.innerHTML=o.join(""),a.tokenList.querySelectorAll("[data-token-id]").forEach(i=>{i.addEventListener("click",()=>{let l=i.dataset.tokenId;if(!l)return;let s=t.highlightedToken===l?null:l;t.highlightedToken=s,t.focusedTokenId=l,m({kind:"highlight-token",tokenId:s}),k(),A()})})}function Ie(){let e=t.coverage;if(!e){a.coverageOutput.innerHTML='<p class="empty-state">Run a scan to see token usage.</p>',a.coverageSummary.textContent="";return}let n=Object.entries(e.byToken).filter(([,s])=>s>0).length,r=Object.keys(e.byToken).length,o=[...Object.entries(e.byToken)].filter(([,s])=>s>0).sort((s,d)=>d[1]-s[1]).slice(0,20),i=e.unusedTokens.slice(0,20),l=e.rawColorViolations.slice(0,20);a.coverageSummary.textContent=`${e.totalElements} elements \xB7 ${n}/${r} tokens used \xB7 ${e.rawColorViolations.length} raw colors`,a.coverageOutput.innerHTML=`
    <p class="report-subhead">Most used tokens</p>
    <div class="report-list">
      ${o.map(([s,d])=>`<div class="report-item"><span>${c(s)}</span><span class="meta">${d} elements</span><span></span></div>`).join("")}
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
  `}function xe(){if(!t.contrast){a.contrastSummary.textContent="",a.contrastOutput.innerHTML='<p class="empty-state">Run an audit to surface APCA issues.</p>';return}if(a.contrastSummary.textContent=`${t.contrast.sampled} sampled \xB7 ${t.contrast.findings.length} potential failures`,!t.contrast.findings.length){a.contrastOutput.innerHTML='<p class="empty-state">No APCA failures detected in the sampled text elements.</p>';return}a.contrastOutput.innerHTML=`
    <div class="report-list">
      ${t.contrast.findings.map(e=>`
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
  `}function tt(){if(!t.snapshot){a.overrideToken.innerHTML='<option value="">Connect to the engine first</option>';return}let e=O();a.overrideToken.innerHTML=e.map(n=>`<option value="${n.id}">${c(n.label)} (${n.id})</option>`).join(""),t.overrideTokenId&&(a.overrideToken.value=t.overrideTokenId)}function K(){if(!t.snapshot||!t.overrideTokenId)return;let e=D(t.overrideTokenId);if(!e)return;let n=B();if(n==="alt"){let r=t.snapshot.resolved.alt.colors[t.overrideTokenId];if(r){t.overrideColor={l:r.l,c:r.c,h:r.h,alpha:r.alpha};return}}t.overrideColor={...n==="dark"?e.dark:e.light}}function Q(){if(!t.snapshot){a.overrideSliders.innerHTML='<p class="empty-state">Connect to the engine to use overrides.</p>';return}let e=t.overrideColor,n=b(e),r=[{key:"l",label:"Lightness",min:0,max:1,step:.001},{key:"c",label:"Chroma",min:0,max:.4,step:.001},{key:"h",label:"Hue",min:0,max:360,step:.1}];a.overrideSliders.innerHTML=`
    <div class="preview-row">
      <span class="swatch" style="background:${c(n)}"></span>
      <div>
        <strong>${c(t.overrideTokenId||"Choose a token")}</strong>
        <code>${c(V(e))}</code>
      </div>
    </div>
    <div class="editor-block">
      ${r.map(o=>`
            <div class="slider-row">
              <span>${o.label}</span>
              <input type="range" min="${o.min}" max="${o.max}" step="${o.step}" value="${e[o.key]}" data-override-channel="${o.key}" />
              <span class="readout">${e[o.key].toFixed(o.key==="h"?2:3)}</span>
            </div>
          `).join("")}
    </div>
  `,a.overrideSliders.querySelectorAll("[data-override-channel]").forEach(o=>{o.addEventListener("input",()=>{let i=o.dataset.overrideChannel;i&&(t.overrideColor={...t.overrideColor,[i]:Number(o.value)},Q(),t.overrideTokenId&&m({kind:"override-token",tokenId:t.overrideTokenId,css:b(t.overrideColor)}))})})}function c(e){return e.replace(/[&<>"']/g,n=>{switch(n){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";default:return"&#39;"}})}window.addEventListener("pointermove",e=>{t.pickerDrag&&$e(t.pickerDrag.tokenId,t.pickerDrag.mode,t.pickerDrag.rect,e.clientX,e.clientY).catch(n=>{h("error",n instanceof Error?n.message:"token update failed")})});window.addEventListener("pointerup",()=>{t.pickerDrag=null});(async()=>(await qe(),t.targetConfigPath?(S(),p.start()):z("choose target config"),m({kind:"ping"}),M()))();})();
