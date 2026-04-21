import { a1 as head, a2 as attr, a3 as attr_class, e as escape_html, a4 as attr_style, a5 as ensure_array_like, a0 as derived } from "../../chunks/renderer.js";
import { e as ensureManifest, c as createDefaultManifest, t as toCssColor, s as summarizeTokenValidation, T as TOKENS_BY_GROUP, D as DEFAULT_PROJECT_CONFIG, A as ALL_TOKEN_IDS, a as TOKEN_GROUP_ORDER, v as validateManifest, b as themeCssVariables, r as resolveTheme } from "../../chunks/engine.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let manifest = ensureManifest(createDefaultManifest());
    let config = { ...DEFAULT_PROJECT_CONFIG };
    let configPath = "";
    let selectedTokenId = "surface";
    let activeMode = "light";
    let saveState = "idle";
    let saveMessage = "Ready";
    function applyPageData(value) {
      manifest = ensureManifest(value.manifest);
      config = {
        ...DEFAULT_PROJECT_CONFIG,
        ...value.config,
        projectRoot: value.config.projectRoot || ""
      };
      configPath = value.configPath;
    }
    const loadInitialData = () => data;
    applyPageData(loadInitialData());
    const lightTheme = derived(() => resolveTheme(manifest, "light"));
    const altTheme = derived(() => resolveTheme(manifest, "alt"));
    const currentTheme = derived(
      () => lightTheme()
    );
    const validations = derived(() => validateManifest(manifest));
    const selectedToken = derived(() => manifest.tokens[selectedTokenId]);
    const selectedTokenValidation = derived(() => validations()[activeMode].perToken[selectedTokenId]);
    const stageStyle = derived(() => `${themeCssVariables(currentTheme())}
`);
    const currentTokenAlt = derived(() => altTheme().colors[selectedTokenId]);
    function isSelectedUsage(tokenIds) {
      return tokenIds.includes(selectedTokenId);
    }
    function hasWarnings(tokenIds) {
      return tokenIds.some((tokenId) => summarizeTokenValidation(validations()[activeMode].perToken[tokenId]).length > 0);
    }
    function updateAlias(index, patch) {
      manifest.aliases[index] = { ...manifest.aliases[index], ...patch };
    }
    function tokenLabel(tokenId) {
      return manifest.tokens[tokenId].label;
    }
    const textInventory = TOKENS_BY_GROUP.text;
    const borderInventory = TOKENS_BY_GROUP.borders;
    const accentInventory = TOKENS_BY_GROUP.accent;
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Semantic Colors</title>`);
      });
    });
    $$renderer2.push(`<div class="workspace svelte-1uha8ag"><aside class="sidebar svelte-1uha8ag"><section class="panel svelte-1uha8ag"><div class="panel-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Project bridge</p> <h1 class="svelte-1uha8ag">Trimodal Semantic Engine</h1></div> <button class="ghost-button svelte-1uha8ag">Reload</button></div> <label class="field-block svelte-1uha8ag"><span>Project config path</span> <input${attr("value", configPath)} class="svelte-1uha8ag"/></label> <label class="field-block svelte-1uha8ag"><span>Project root</span> <input${attr("value", config.projectRoot)} placeholder="/absolute/path/to/project" class="svelte-1uha8ag"/></label> <div class="field-grid svelte-1uha8ag"><label class="field-block svelte-1uha8ag"><span>Manifest path</span> <input${attr("value", config.manifestPath)} class="svelte-1uha8ag"/></label> <label class="field-block svelte-1uha8ag"><span>CSS output path</span> <input${attr("value", config.cssOutputPath)} class="svelte-1uha8ag"/></label></div> <label class="checkbox-row svelte-1uha8ag"><input${attr("checked", config.bridgeEnabled, true)} type="checkbox" class="svelte-1uha8ag"/> <span>Write generated CSS into the target project</span></label> <div${attr_class(`save-state save-state-${saveState}`, "svelte-1uha8ag")}><strong>${escape_html("State")}</strong> <span>${escape_html(saveMessage)}</span></div></section> <section class="panel svelte-1uha8ag"><div class="panel-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Theme state</p> <h2 class="svelte-1uha8ag">Mode controls</h2></div></div> <div class="mode-row svelte-1uha8ag"><button${attr_class("svelte-1uha8ag", void 0, { "active": activeMode === "light" })}>1 Light</button> <button${attr_class("svelte-1uha8ag", void 0, { "active": activeMode === "dark" })}>2 Dark</button> <button${attr_class("svelte-1uha8ag", void 0, { "active": activeMode === "alt" })}>3 Alt</button></div> <label class="checkbox-row svelte-1uha8ag"><input${attr("checked", manifest.alt.grayscalePreview, true)} type="checkbox" class="svelte-1uha8ag"/> <span>Greyscale hierarchy overlay (\`L\`)</span></label> <div class="field-grid alt-grid svelte-1uha8ag"><label class="field-block svelte-1uha8ag"><span>Alt base</span> `);
    $$renderer2.select(
      { value: manifest.alt.source, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "light" }, ($$renderer4) => {
          $$renderer4.push(`Derive from Light`);
        });
        $$renderer3.option({ value: "dark" }, ($$renderer4) => {
          $$renderer4.push(`Derive from Dark`);
        });
      },
      "svelte-1uha8ag"
    );
    $$renderer2.push(`</label> <label class="checkbox-row compact svelte-1uha8ag"><input${attr("checked", manifest.alt.harmonyLock, true)} type="checkbox" class="svelte-1uha8ag"/> <span>Lock harmony</span></label></div> <div${attr_class(`mode-block ${""}`, "svelte-1uha8ag")}><div class="slider-row svelte-1uha8ag"><span>Hue shift</span> <input max="180" min="-180" step="1" type="range"${attr("value", manifest.alt.delta.h)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="180" min="-180" step="1" type="number"${attr("value", manifest.alt.delta.h)}/></div> <div class="slider-row svelte-1uha8ag"><span>Chroma shift</span> <input max="0.16" min="-0.16" step="0.005" type="range"${attr("value", manifest.alt.delta.c)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="0.16" min="-0.16" step="0.005" type="number"${attr("value", manifest.alt.delta.c)}/></div> <div class="slider-row svelte-1uha8ag"><span>Lightness shift</span> <input max="0.2" min="-0.2" step="0.01" type="range"${attr("value", manifest.alt.delta.l)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="0.2" min="-0.2" step="0.01" type="number"${attr("value", manifest.alt.delta.l)}/></div></div></section> <section class="panel svelte-1uha8ag"><div class="panel-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Token editor</p> <h2 class="svelte-1uha8ag">${escape_html(selectedToken().label)}</h2></div> <span class="token-group svelte-1uha8ag">${escape_html(selectedToken().group)}</span></div> <p class="description svelte-1uha8ag">${escape_html(selectedToken().description)}</p> <div class="swatch-row svelte-1uha8ag"><button class="swatch-card svelte-1uha8ag"><span>Light</span> <span class="swatch svelte-1uha8ag"${attr_style(`background:${toCssColor(selectedToken().light)}`)}></span> <code class="svelte-1uha8ag">${escape_html(toCssColor(selectedToken().light))}</code></button> <button class="swatch-card svelte-1uha8ag"><span>Dark</span> <span class="swatch svelte-1uha8ag"${attr_style(`background:${toCssColor(selectedToken().dark)}`)}></span> <code class="svelte-1uha8ag">${escape_html(toCssColor(selectedToken().dark))}</code></button> <button class="swatch-card svelte-1uha8ag"><span>Alt</span> <span class="swatch svelte-1uha8ag"${attr_style(`background:${toCssColor(currentTokenAlt())}`)}></span> <code class="svelte-1uha8ag">${escape_html(toCssColor(currentTokenAlt()))}</code></button></div> <div${attr_class(`anchor-editor ${"anchor-editor-active"}`, "svelte-1uha8ag")}><div class="anchor-header svelte-1uha8ag"><strong>Light anchor</strong> <span>${escape_html("Editing focus")}</span></div> <div class="channel-grid svelte-1uha8ag"><label class="channel svelte-1uha8ag"><span>L</span> <input max="1" min="0" step="0.005" type="range"${attr("value", selectedToken().light.l)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="1" min="0" step="0.005" type="number"${attr("value", selectedToken().light.l)}/></label> <label class="channel svelte-1uha8ag"><span>C</span> <input max="0.37" min="0" step="0.005" type="range"${attr("value", selectedToken().light.c)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="0.37" min="0" step="0.005" type="number"${attr("value", selectedToken().light.c)}/></label> <label class="channel svelte-1uha8ag"><span>H</span> <input max="360" min="0" step="1" type="range"${attr("value", selectedToken().light.h)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="360" min="0" step="1" type="number"${attr("value", selectedToken().light.h)}/></label></div></div> <div${attr_class(`anchor-editor ${""}`, "svelte-1uha8ag")}><div class="anchor-header svelte-1uha8ag"><strong>Dark anchor</strong> <span>${escape_html("Anchor remains inspectable")}</span></div> <div class="channel-grid svelte-1uha8ag"><label class="channel svelte-1uha8ag"><span>L</span> <input max="1" min="0" step="0.005" type="range"${attr("value", selectedToken().dark.l)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="1" min="0" step="0.005" type="number"${attr("value", selectedToken().dark.l)}/></label> <label class="channel svelte-1uha8ag"><span>C</span> <input max="0.37" min="0" step="0.005" type="range"${attr("value", selectedToken().dark.c)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="0.37" min="0" step="0.005" type="number"${attr("value", selectedToken().dark.c)}/></label> <label class="channel svelte-1uha8ag"><span>H</span> <input max="360" min="0" step="1" type="range"${attr("value", selectedToken().dark.h)} class="svelte-1uha8ag"/> <input class="number-field svelte-1uha8ag" max="360" min="0" step="1" type="number"${attr("value", selectedToken().dark.h)}/></label></div></div> <div${attr_class(`mode-block ${""}`, "svelte-1uha8ag")}><div class="field-grid svelte-1uha8ag"><label class="field-block svelte-1uha8ag"><span>Alt behavior</span> `);
    $$renderer2.select(
      { value: selectedToken().exception.altBehavior, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "derive" }, ($$renderer4) => {
          $$renderer4.push(`Derive`);
        });
        $$renderer3.option({ value: "pin" }, ($$renderer4) => {
          $$renderer4.push(`Pin to source anchor`);
        });
        $$renderer3.option({ value: "exclude" }, ($$renderer4) => {
          $$renderer4.push(`Exclude from Alt`);
        });
      },
      "svelte-1uha8ag"
    );
    $$renderer2.push(`</label> <label class="field-block svelte-1uha8ag"><span>Max chroma</span> <input${attr("value", selectedToken().exception.maxChroma)} max="0.37" min="0" step="0.005" type="number" class="svelte-1uha8ag"/></label></div> `);
    if (selectedToken().altParent) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="microcopy svelte-1uha8ag">Alt derives from parent token: <strong>${escape_html(tokenLabel(selectedToken().altParent))}</strong></p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="validation-list svelte-1uha8ag"><p class="eyebrow svelte-1uha8ag">Validation</p> `);
    if (summarizeTokenValidation(selectedTokenValidation()).length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="validation-ok svelte-1uha8ag">No warnings for this token in ${escape_html(activeMode)} mode.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(summarizeTokenValidation(selectedTokenValidation()));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let note = each_array[$$index];
        $$renderer2.push(`<p class="validation-issue svelte-1uha8ag">${escape_html(note)}</p>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="panel svelte-1uha8ag"><div class="panel-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Local aliases</p> <h2 class="svelte-1uha8ag">Project-specific names</h2></div> <button class="ghost-button svelte-1uha8ag">Add alias</button></div> <div class="alias-list svelte-1uha8ag"><!--[-->`);
    const each_array_1 = ensure_array_like(manifest.aliases);
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let alias = each_array_1[index];
      $$renderer2.push(`<div class="alias-row svelte-1uha8ag"><input${attr("value", alias.name)} class="svelte-1uha8ag"/> `);
      $$renderer2.select(
        {
          value: alias.tokenId,
          oninput: (event) => updateAlias(index, { tokenId: event.currentTarget.value }),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_2 = ensure_array_like(ALL_TOKEN_IDS);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let tokenId = each_array_2[$$index_1];
            $$renderer3.option({ value: tokenId }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(tokenLabel(tokenId))}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        "svelte-1uha8ag"
      );
      $$renderer2.push(` <button class="ghost-button svelte-1uha8ag">Remove</button></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="panel svelte-1uha8ag"><div class="panel-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Import and migration</p> <h2 class="svelte-1uha8ag">CSS review queue</h2></div> <button class="ghost-button svelte-1uha8ag">Reset manifest</button></div> <label class="field-block svelte-1uha8ag"><span>Source CSS path</span> <input${attr("value", config.importSourcePath)} placeholder="../project/src/app.css" class="svelte-1uha8ag"/></label> <div class="action-row svelte-1uha8ag"><button${attr("disabled", !config.importSourcePath, true)} class="svelte-1uha8ag">${escape_html("Scan CSS variables")}</button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section></aside> <main class="stage-shell svelte-1uha8ag"><header class="stage-header svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Preview harness</p> <h2 class="svelte-1uha8ag">Standalone fixture app + live token inventory</h2></div> <div class="stage-meta svelte-1uha8ag"><span>Mode: ${escape_html(activeMode)}</span> <span>Selected: ${escape_html(selectedToken().label)}</span></div></header> <section${attr_class("stage svelte-1uha8ag", void 0, { "grayscale": manifest.alt.grayscalePreview })}${attr("data-theme", activeMode)}${attr_style(stageStyle())}><div class="hero-grid svelte-1uha8ag"><button${attr_class("surface-card surface-card-app svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["app"]),
      "warning": hasWarnings(["app"])
    })}><span class="fixture-label svelte-1uha8ag">App background</span> <small class="svelte-1uha8ag">${escape_html(tokenLabel("app"))}</small></button> <button${attr_class("surface-card surface-card-shell svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["shell"]),
      "warning": hasWarnings(["shell"])
    })}><span class="fixture-label svelte-1uha8ag">Shell</span> <small class="svelte-1uha8ag">${escape_html(tokenLabel("shell"))}</small></button> <div${attr_class("surface-card surface-card-panel svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["surface", "surface-raised", "border", "text"]),
      "warning": hasWarnings(["surface", "surface-raised", "border", "text"])
    })} role="button" tabindex="0"><span class="fixture-label svelte-1uha8ag">Primary surface</span> <h3 class="svelte-1uha8ag">Depth stack</h3> <p class="svelte-1uha8ag">Use the preview to judge visual weight in-place while themes swap.</p> <div class="inner-stack svelte-1uha8ag"><button${attr_class("nested-surface svelte-1uha8ag", void 0, { "selected-usage": isSelectedUsage(["surface-raised"]) })}>Raised</button> <button${attr_class("nested-surface nested-muted svelte-1uha8ag", void 0, { "selected-usage": isSelectedUsage(["surface-muted"]) })}>Muted</button> <button${attr_class("nested-surface nested-subtle svelte-1uha8ag", void 0, { "selected-usage": isSelectedUsage(["surface-subtle"]) })}>Subtle</button> <button${attr_class("nested-surface nested-field svelte-1uha8ag", void 0, { "selected-usage": isSelectedUsage(["field", "input"]) })}>Field</button></div></div></div> <div class="fixture-grid svelte-1uha8ag"><article class="fixture-panel svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Text hierarchy</h3> <span>Primary, secondary, muted, faint, inverse</span></div> <div class="text-stack svelte-1uha8ag"><!--[-->`);
    const each_array_5 = ensure_array_like(textInventory);
    for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
      let tokenId = each_array_5[$$index_5];
      $$renderer2.push(`<button${attr_class(`text-sample text-sample-${tokenId}`, "svelte-1uha8ag", {
        "selected-usage": isSelectedUsage([tokenId]),
        "warning": hasWarnings([tokenId])
      })}><span>${escape_html(tokenLabel(tokenId))}</span> <strong>The quick brown fox jumps over the lazy dog.</strong></button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="fixture-panel svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Accent and links</h3> <span>Interactive emphasis and tinting</span></div> <div class="accent-grid svelte-1uha8ag"><!--[-->`);
    const each_array_6 = ensure_array_like(accentInventory);
    for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
      let tokenId = each_array_6[$$index_6];
      $$renderer2.push(`<button${attr_class(`accent-sample accent-sample-${tokenId}`, "svelte-1uha8ag", {
        "selected-usage": isSelectedUsage([tokenId]),
        "warning": hasWarnings([tokenId])
      })}><span>${escape_html(tokenLabel(tokenId))}</span></button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="fixture-panel svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Status pairs</h3> <span>Surface + text combinations</span></div> <div class="status-grid svelte-1uha8ag"><!--[-->`);
    const each_array_7 = ensure_array_like(["success", "warning", "danger", "info"]);
    for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
      let stem = each_array_7[$$index_7];
      $$renderer2.push(`<button${attr_class(`status-card status-card-${stem}`, "svelte-1uha8ag", {
        "selected-usage": isSelectedUsage([stem, `${stem}-surface`]),
        "warning": hasWarnings([stem, `${stem}-surface`])
      })}><strong>${escape_html(stem)}</strong> <span>${escape_html(tokenLabel(stem))}</span></button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="fixture-panel svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Controls</h3> <span>Primary, secondary, ghost, and field states</span></div> <div class="control-grid svelte-1uha8ag"><button${attr_class("control-primary svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["control-primary", "control-primary-text"]),
      "warning": hasWarnings(["control-primary", "control-primary-text"])
    })}>Primary action</button> <button${attr_class("control-secondary svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage([
        "control-secondary",
        "control-secondary-border",
        "control-secondary-text"
      ]),
      "warning": hasWarnings([
        "control-secondary",
        "control-secondary-border",
        "control-secondary-text"
      ])
    })}>Secondary</button> <button${attr_class("control-ghost svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["control-ghost-hover"]),
      "warning": hasWarnings(["control-ghost-hover"])
    })}>Ghost hover</button> <label${attr_class("input-preview svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["input", "input-border", "input-placeholder"]),
      "warning": hasWarnings(["input", "input-border", "input-placeholder"])
    })}><span>Input field</span> <input placeholder="Input placeholder" class="svelte-1uha8ag"/></label></div></article> <article class="fixture-panel svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Borders and focus</h3> <span>Quiet, default, strong, and focus treatments</span></div> <div class="border-grid svelte-1uha8ag"><!--[-->`);
    const each_array_8 = ensure_array_like(borderInventory);
    for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
      let tokenId = each_array_8[$$index_8];
      $$renderer2.push(`<button${attr_class(`border-sample border-sample-${tokenId}`, "svelte-1uha8ag", {
        "selected-usage": isSelectedUsage([tokenId]),
        "warning": hasWarnings([tokenId])
      })}>${escape_html(tokenLabel(tokenId))}</button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="fixture-panel fixture-panel-overlay svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Overlay and scrim</h3> <span>Shared overlay pattern with only core tokens</span></div> <div class="overlay-demo svelte-1uha8ag"><div class="scrim svelte-1uha8ag"></div> <button${attr_class("overlay-card svelte-1uha8ag", void 0, {
      "selected-usage": isSelectedUsage(["surface-overlay", "text", "border"]),
      "warning": hasWarnings(["surface-overlay", "text", "border"])
    })}><strong>Overlay surface</strong> <p class="svelte-1uha8ag">Modal, popover, or detached chrome should read from the same semantic surface.</p></button></div></article></div> <article class="inventory svelte-1uha8ag"><div class="fixture-panel-header svelte-1uha8ag"><h3 class="svelte-1uha8ag">Token inventory</h3> <span>Every shared token is visible and selectable here.</span></div> <!--[-->`);
    const each_array_9 = ensure_array_like(TOKEN_GROUP_ORDER);
    for (let $$index_10 = 0, $$length = each_array_9.length; $$index_10 < $$length; $$index_10++) {
      let group = each_array_9[$$index_10];
      $$renderer2.push(`<div class="inventory-group svelte-1uha8ag"><div class="inventory-group-header svelte-1uha8ag"><h4 class="svelte-1uha8ag">${escape_html(group)}</h4> <span>${escape_html(TOKENS_BY_GROUP[group].length)} tokens</span></div> <div class="inventory-grid svelte-1uha8ag"><!--[-->`);
      const each_array_10 = ensure_array_like(TOKENS_BY_GROUP[group]);
      for (let $$index_9 = 0, $$length2 = each_array_10.length; $$index_9 < $$length2; $$index_9++) {
        let tokenId = each_array_10[$$index_9];
        $$renderer2.push(`<button${attr_class("inventory-card svelte-1uha8ag", void 0, {
          "selected-usage": isSelectedUsage([tokenId]),
          "warning": hasWarnings([tokenId])
        })}><span class="inventory-swatch svelte-1uha8ag"${attr_style(`background:${toCssColor(currentTheme().colors[tokenId])}`)}></span> <span class="inventory-title svelte-1uha8ag">${escape_html(tokenLabel(tokenId))}</span> <code class="svelte-1uha8ag">${escape_html(tokenId)}</code></button>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]--></article></section></main></div>`);
  });
}
export {
  _page as default
};
