import "../../chunks/index-server.js";
import { A as snapshot, B as escape_html, a as derived, i as bind_props, n as attr_class, o as ensure_array_like, r as attr_style, s as head, z as attr } from "../../chunks/dev.js";
import { a as validateManifest, c as createDefaultManifest, d as TOKENS_BY_GROUP, f as TOKEN_GROUP_ORDER, i as themeCssVariables, l as ALL_TOKEN_IDS, n as resolveTheme, r as summarizeTokenValidation, s as toCssColor, t as ensureManifest, u as DEFAULT_PROJECT_CONFIG } from "../../chunks/engine.js";
//#region src/lib/components/semantic-colors/AliasPanel.svelte
function AliasPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { manifest, tokenLabel, addAlias, removeAlias, updateAlias } = $$props;
		$$renderer.push(`<section class="panel"><div class="panel-header"><div><p class="eyebrow">Local aliases</p> <h2>Project-specific names</h2></div> <button class="ghost-button" type="button">Add alias</button></div> <div class="alias-list svelte-665jiu">`);
		if (manifest.aliases.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="empty-state">No project aliases yet. Add aliases when you need local CSS variable names mapped to the
        shared semantic tokens.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(manifest.aliases);
			for (let index = 0, $$length = each_array.length; index < $$length; index++) {
				let alias = each_array[index];
				$$renderer.push(`<div class="alias-row svelte-665jiu"><input${attr("value", alias.name)}/> `);
				$$renderer.select({
					value: alias.tokenId,
					oninput: (event) => updateAlias(index, { tokenId: event.currentTarget.value })
				}, ($$renderer) => {
					$$renderer.push(`<!--[-->`);
					const each_array_1 = ensure_array_like(ALL_TOKEN_IDS);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let tokenId = each_array_1[$$index];
						$$renderer.option({ value: tokenId }, ($$renderer) => {
							$$renderer.push(`${escape_html(tokenLabel(tokenId))}`);
						});
					}
					$$renderer.push(`<!--]-->`);
				});
				$$renderer.push(` <button class="ghost-button" type="button">Remove</button></div>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></div></section>`);
	});
}
//#endregion
//#region src/lib/components/semantic-colors/WarningBadge.svelte
function WarningBadge($$renderer, $$props) {
	let { visible, summary } = $$props;
	if (visible) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span${attr("aria-label", summary)} class="warning-badge"${attr("title", summary)}>Warn</span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]-->`);
}
//#endregion
//#region src/lib/components/semantic-colors/FixtureStage.svelte
function FixtureStage($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { activeMode, selectedTokenId, selectedTokenLabel, saveState, saveMessage, stageStyle, grayscalePreview, isSelectedUsage, hasWarnings, warningSummary, selectToken, tokenLabel } = $$props;
		const textInventory = TOKENS_BY_GROUP.text;
		const accentInventory = TOKENS_BY_GROUP.accent;
		const borderInventory = TOKENS_BY_GROUP.borders;
		$$renderer.push(`<header class="stage-header svelte-5wb5fr"><div><p class="eyebrow">Preview harness</p> <h2>Standalone fixture app + live token inventory</h2></div> <div class="stage-meta svelte-5wb5fr"><span>Mode: ${escape_html(activeMode)}</span> <span>Selected: ${escape_html(selectedTokenLabel)}</span></div></header> `);
		if (saveState === "error") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="status-banner status-banner-error svelte-5wb5fr" role="alert"><strong class="svelte-5wb5fr">Autosave needs attention.</strong> <span>${escape_html(saveMessage)}</span></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <section id="preview-stage"${attr_class("stage svelte-5wb5fr", void 0, { "grayscale": grayscalePreview })}${attr("data-theme", activeMode)}${attr_style(stageStyle)}><div class="hero-grid svelte-5wb5fr"><button${attr("aria-pressed", selectedTokenId === "app")}${attr_class("surface-card surface-card-app svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage(["app"]),
			"warning": hasWarnings(["app"])
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary(["app"]),
			visible: hasWarnings(["app"])
		});
		$$renderer.push(`<!----> <span class="fixture-label svelte-5wb5fr">App background</span> <small>${escape_html(tokenLabel("app"))}</small></button> <button${attr("aria-pressed", selectedTokenId === "shell")}${attr_class("surface-card surface-card-shell svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage(["shell"]),
			"warning": hasWarnings(["shell"])
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary(["shell"]),
			visible: hasWarnings(["shell"])
		});
		$$renderer.push(`<!----> <span class="fixture-label svelte-5wb5fr">Shell</span> <small>${escape_html(tokenLabel("shell"))}</small></button> <article${attr_class("surface-card surface-card-panel svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage([
				"surface",
				"surface-raised",
				"border",
				"text"
			]),
			"warning": hasWarnings([
				"surface",
				"surface-raised",
				"border",
				"text"
			])
		})}>`);
		WarningBadge($$renderer, {
			summary: warningSummary([
				"surface",
				"surface-raised",
				"border",
				"text"
			]),
			visible: hasWarnings([
				"surface",
				"surface-raised",
				"border",
				"text"
			])
		});
		$$renderer.push(`<!----> <span class="fixture-label svelte-5wb5fr">Primary surface</span> <h3>Depth stack</h3> <p>Use the preview to judge visual weight in-place while themes swap.</p> <button${attr("aria-pressed", selectedTokenId === "surface")} class="card-select-button svelte-5wb5fr" type="button">Select surface token</button> <div class="inner-stack svelte-5wb5fr"><button${attr("aria-pressed", selectedTokenId === "surface-raised")}${attr_class("nested-surface svelte-5wb5fr", void 0, { "selected-usage": isSelectedUsage(["surface-raised"]) })} type="button">Raised</button> <button${attr("aria-pressed", selectedTokenId === "surface-muted")}${attr_class("nested-surface nested-muted svelte-5wb5fr", void 0, { "selected-usage": isSelectedUsage(["surface-muted"]) })} type="button">Muted</button> <button${attr("aria-pressed", selectedTokenId === "surface-subtle")}${attr_class("nested-surface nested-subtle svelte-5wb5fr", void 0, { "selected-usage": isSelectedUsage(["surface-subtle"]) })} type="button">Subtle</button> <button${attr("aria-pressed", selectedTokenId === "field")}${attr_class("nested-surface nested-field svelte-5wb5fr", void 0, { "selected-usage": isSelectedUsage(["field", "input"]) })} type="button">Field</button></div></article></div> <div class="fixture-grid svelte-5wb5fr"><article class="fixture-panel svelte-5wb5fr"><div class="fixture-panel-header"><h3>Text hierarchy</h3> <span>Primary, secondary, muted, faint, inverse</span></div> <div class="text-stack svelte-5wb5fr"><!--[-->`);
		const each_array = ensure_array_like(textInventory);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let tokenId = each_array[$$index];
			$$renderer.push(`<button${attr("aria-pressed", selectedTokenId === tokenId)}${attr_class(`text-sample text-sample-${tokenId}`, "svelte-5wb5fr", {
				"selected-usage": isSelectedUsage([tokenId]),
				"warning": hasWarnings([tokenId])
			})} type="button">`);
			WarningBadge($$renderer, {
				summary: warningSummary([tokenId]),
				visible: hasWarnings([tokenId])
			});
			$$renderer.push(`<!----> <span>${escape_html(tokenLabel(tokenId))}</span> <strong class="svelte-5wb5fr">The quick brown fox jumps over the lazy dog.</strong></button>`);
		}
		$$renderer.push(`<!--]--></div></article> <article class="fixture-panel svelte-5wb5fr"><div class="fixture-panel-header"><h3>Accent and links</h3> <span>Interactive emphasis and tinting</span></div> <div class="accent-grid svelte-5wb5fr"><!--[-->`);
		const each_array_1 = ensure_array_like(accentInventory);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let tokenId = each_array_1[$$index_1];
			$$renderer.push(`<button${attr("aria-pressed", selectedTokenId === tokenId)}${attr_class(`accent-sample accent-sample-${tokenId}`, "svelte-5wb5fr", {
				"selected-usage": isSelectedUsage([tokenId]),
				"warning": hasWarnings([tokenId])
			})} type="button">`);
			WarningBadge($$renderer, {
				summary: warningSummary([tokenId]),
				visible: hasWarnings([tokenId])
			});
			$$renderer.push(`<!----> <span>${escape_html(tokenLabel(tokenId))}</span></button>`);
		}
		$$renderer.push(`<!--]--></div></article> <article class="fixture-panel svelte-5wb5fr"><div class="fixture-panel-header"><h3>Status pairs</h3> <span>Surface + text combinations</span></div> <div class="status-grid svelte-5wb5fr"><!--[-->`);
		const each_array_2 = ensure_array_like([
			"success",
			"warning",
			"danger",
			"info"
		]);
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let stem = each_array_2[$$index_2];
			$$renderer.push(`<button${attr("aria-pressed", selectedTokenId === stem)}${attr_class(`status-card status-card-${stem}`, "svelte-5wb5fr", {
				"selected-usage": isSelectedUsage([stem, `${stem}-surface`]),
				"warning": hasWarnings([stem, `${stem}-surface`])
			})} type="button">`);
			WarningBadge($$renderer, {
				summary: warningSummary([stem, `${stem}-surface`]),
				visible: hasWarnings([stem, `${stem}-surface`])
			});
			$$renderer.push(`<!----> <strong class="svelte-5wb5fr">${escape_html(stem)}</strong> <span>${escape_html(tokenLabel(stem))}</span></button>`);
		}
		$$renderer.push(`<!--]--></div></article> <article class="fixture-panel svelte-5wb5fr"><div class="fixture-panel-header"><h3>Controls</h3> <span>Primary, secondary, ghost, and field states</span></div> <div class="control-grid svelte-5wb5fr"><button${attr("aria-pressed", selectedTokenId === "control-primary")}${attr_class("control-primary svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage(["control-primary", "control-primary-text"]),
			"warning": hasWarnings(["control-primary", "control-primary-text"])
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary(["control-primary", "control-primary-text"]),
			visible: hasWarnings(["control-primary", "control-primary-text"])
		});
		$$renderer.push(`<!----> Primary action</button> <button${attr("aria-pressed", selectedTokenId === "control-secondary")}${attr_class("control-secondary svelte-5wb5fr", void 0, {
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
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary([
				"control-secondary",
				"control-secondary-border",
				"control-secondary-text"
			]),
			visible: hasWarnings([
				"control-secondary",
				"control-secondary-border",
				"control-secondary-text"
			])
		});
		$$renderer.push(`<!----> Secondary</button> <button${attr("aria-pressed", selectedTokenId === "control-ghost-hover")}${attr_class("control-ghost svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage(["control-ghost-hover"]),
			"warning": hasWarnings(["control-ghost-hover"])
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary(["control-ghost-hover"]),
			visible: hasWarnings(["control-ghost-hover"])
		});
		$$renderer.push(`<!----> Ghost hover</button> <label${attr_class("input-preview svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage([
				"input",
				"input-border",
				"input-placeholder"
			]),
			"warning": hasWarnings([
				"input",
				"input-border",
				"input-placeholder"
			])
		})}>`);
		WarningBadge($$renderer, {
			summary: warningSummary([
				"input",
				"input-border",
				"input-placeholder"
			]),
			visible: hasWarnings([
				"input",
				"input-border",
				"input-placeholder"
			])
		});
		$$renderer.push(`<!----> <span>Input field</span> <input placeholder="Input placeholder" class="svelte-5wb5fr"/></label></div></article> <article class="fixture-panel svelte-5wb5fr"><div class="fixture-panel-header"><h3>Borders and focus</h3> <span>Quiet, default, strong, and focus treatments</span></div> <div class="border-grid svelte-5wb5fr"><!--[-->`);
		const each_array_3 = ensure_array_like(borderInventory);
		for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
			let tokenId = each_array_3[$$index_3];
			$$renderer.push(`<button${attr("aria-pressed", selectedTokenId === tokenId)}${attr_class(`border-sample border-sample-${tokenId}`, "svelte-5wb5fr", {
				"selected-usage": isSelectedUsage([tokenId]),
				"warning": hasWarnings([tokenId])
			})} type="button">`);
			WarningBadge($$renderer, {
				summary: warningSummary([tokenId]),
				visible: hasWarnings([tokenId])
			});
			$$renderer.push(`<!----> ${escape_html(tokenLabel(tokenId))}</button>`);
		}
		$$renderer.push(`<!--]--></div></article> <article class="fixture-panel fixture-panel-overlay svelte-5wb5fr"><div class="fixture-panel-header"><h3>Overlay and scrim</h3> <span>Shared overlay pattern with only core tokens</span></div> <div class="overlay-demo svelte-5wb5fr"><div class="scrim svelte-5wb5fr"></div> <button${attr("aria-pressed", selectedTokenId === "surface-overlay")}${attr_class("overlay-card svelte-5wb5fr", void 0, {
			"selected-usage": isSelectedUsage([
				"surface-overlay",
				"text",
				"border"
			]),
			"warning": hasWarnings([
				"surface-overlay",
				"text",
				"border"
			])
		})} type="button">`);
		WarningBadge($$renderer, {
			summary: warningSummary([
				"surface-overlay",
				"text",
				"border"
			]),
			visible: hasWarnings([
				"surface-overlay",
				"text",
				"border"
			])
		});
		$$renderer.push(`<!----> <strong>Overlay surface</strong> <p>Modal, popover, or detached chrome should read from the same semantic surface.</p></button></div></article></div></section>`);
	});
}
//#endregion
//#region src/lib/components/semantic-colors/ImportReview.svelte
function ImportReview($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { config = void 0, importProposal, importSelection = void 0, isImporting, tokenLabel, runImport, applyImportReview, confirmResetManifest } = $$props;
		$$renderer.push(`<section class="panel"><div class="panel-header"><div><p class="eyebrow">Import and migration</p> <h2>CSS review queue</h2></div> <button class="ghost-button" type="button">Reset manifest</button></div> <label class="field-block"><span>Source CSS path</span> <input${attr("value", config.importSourcePath)} placeholder="../project/src/app.css"/></label> <div class="action-row"><button${attr("disabled", isImporting || !config.importSourcePath, true)} type="button">${escape_html(isImporting ? "Importing..." : "Scan CSS variables")}</button> `);
		if (importProposal) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<button class="secondary-button" type="button">Apply reviewed mappings</button>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> `);
		if (importProposal) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="review-queue svelte-75qkhj"><!--[-->`);
			const each_array = ensure_array_like(importProposal.candidates);
			for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
				let candidate = each_array[$$index_1];
				$$renderer.push(`<article class="review-card svelte-75qkhj"><div><strong>--${escape_html(candidate.sourceName)}</strong> <p class="svelte-75qkhj">${escape_html(candidate.rawValue)}</p> <small>${escape_html(candidate.reason)}</small></div> `);
				$$renderer.select({ value: importSelection[candidate.sourceName] }, ($$renderer) => {
					$$renderer.option({ value: "" }, ($$renderer) => {
						$$renderer.push(`Skip mapping`);
					});
					$$renderer.push(`<!--[-->`);
					const each_array_1 = ensure_array_like(ALL_TOKEN_IDS);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let tokenId = each_array_1[$$index];
						$$renderer.option({ value: tokenId }, ($$renderer) => {
							$$renderer.push(`${escape_html(tokenLabel(tokenId))}`);
						});
					}
					$$renderer.push(`<!--]-->`);
				});
				$$renderer.push(` <div class="review-swatches svelte-75qkhj"><span class="mini-swatch svelte-75qkhj"${attr_style(`background:${candidate.light ? toCssColor(candidate.light) : "transparent"}`)}>L</span> <span class="mini-swatch svelte-75qkhj"${attr_style(`background:${candidate.dark ? toCssColor(candidate.dark) : "transparent"}`)}>D</span></div></article>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<p class="empty-state">Add a source CSS file to scan your current variables, then review the suggested token mappings
      here before applying them.</p>`);
		}
		$$renderer.push(`<!--]--></section>`);
		bind_props($$props, {
			config,
			importSelection
		});
	});
}
//#endregion
//#region src/lib/components/semantic-colors/ModeControls.svelte
function ModeControls($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { manifest = void 0, activeMode, setTheme, updateAltDelta } = $$props;
		$$renderer.push(`<section class="panel"><div class="panel-header"><div><p class="eyebrow">Theme state</p> <h2>Mode controls</h2></div></div> <div class="mode-row svelte-orwi6j"><button${attr("aria-pressed", activeMode === "light")} type="button"${attr_class("svelte-orwi6j", void 0, { "active": activeMode === "light" })}>1 Light</button> <button${attr("aria-pressed", activeMode === "dark")} type="button"${attr_class("svelte-orwi6j", void 0, { "active": activeMode === "dark" })}>2 Dark</button> <button${attr("aria-pressed", activeMode === "alt")} type="button"${attr_class("svelte-orwi6j", void 0, { "active": activeMode === "alt" })}>3 Alt</button></div> <label class="checkbox-row"><input${attr("checked", manifest.alt.grayscalePreview, true)} type="checkbox"/> <span>Greyscale hierarchy overlay (\`L\`)</span></label> <div class="field-grid alt-grid svelte-orwi6j"><label class="field-block"><span>Alt base</span> `);
		$$renderer.select({ value: manifest.alt.source }, ($$renderer) => {
			$$renderer.option({ value: "light" }, ($$renderer) => {
				$$renderer.push(`Derive from Light`);
			});
			$$renderer.option({ value: "dark" }, ($$renderer) => {
				$$renderer.push(`Derive from Dark`);
			});
		});
		$$renderer.push(`</label> <label class="checkbox-row compact svelte-orwi6j"><input${attr("checked", manifest.alt.harmonyLock, true)} type="checkbox"/> <span>Lock harmony</span></label></div> <div${attr_class(`mode-block ${activeMode === "alt" ? "mode-block-promoted" : ""}`, "svelte-orwi6j")}><div class="slider-row svelte-orwi6j"><span>Hue shift</span> <input max="180" min="-180" step="1" type="range"${attr("value", manifest.alt.delta.h)}/> <input class="number-field svelte-orwi6j" max="180" min="-180" step="1" type="number"${attr("value", manifest.alt.delta.h)}/></div> <div class="slider-row svelte-orwi6j"><span>Chroma shift</span> <input max="0.16" min="-0.16" step="0.005" type="range"${attr("value", manifest.alt.delta.c)}/> <input class="number-field svelte-orwi6j" max="0.16" min="-0.16" step="0.005" type="number"${attr("value", manifest.alt.delta.c)}/></div> <div class="slider-row svelte-orwi6j"><span>Lightness shift</span> <input max="0.2" min="-0.2" step="0.01" type="range"${attr("value", manifest.alt.delta.l)}/> <input class="number-field svelte-orwi6j" max="0.2" min="-0.2" step="0.01" type="number"${attr("value", manifest.alt.delta.l)}/></div></div></section>`);
		bind_props($$props, { manifest });
	});
}
//#endregion
//#region src/lib/components/semantic-colors/ProjectPanel.svelte
function ProjectPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { config = void 0, configPath = void 0, saveState, saveHeading, saveMessage, saveHint, showSetupGuide, onReload, onRetrySave } = $$props;
		$$renderer.push(`<section class="panel"><div class="panel-header"><div><p class="eyebrow">Project bridge</p> <h1>Trimodal Semantic Engine</h1></div> <button class="ghost-button" type="button">Reload</button></div> <label class="field-block"><span>Project config path</span> <input${attr("value", configPath)}/></label> <label class="field-block"><span>Project root</span> <input${attr("value", config.projectRoot)} placeholder="/absolute/path/to/project"/></label> <div class="field-grid"><label class="field-block"><span>Manifest path</span> <input${attr("value", config.manifestPath)}/></label> <label class="field-block"><span>CSS output path</span> <input${attr("value", config.cssOutputPath)}/></label></div> <label class="checkbox-row"><input${attr("checked", config.bridgeEnabled, true)} type="checkbox"/> <span>Write generated CSS into the target project</span></label> <div${attr("aria-live", saveState === "error" ? "assertive" : "polite")}${attr_class(`save-state save-state-${saveState}`, "svelte-1w7916z")}${attr("role", saveState === "error" ? "alert" : "status")}><div class="save-state-header svelte-1w7916z"><strong class="svelte-1w7916z">${escape_html(saveHeading)}</strong> <span${attr_class(`save-pill save-pill-${saveState}`, "svelte-1w7916z")}>${escape_html(saveState)}</span></div> <p class="save-message svelte-1w7916z">${escape_html(saveMessage)}</p> <p class="save-hint svelte-1w7916z">${escape_html(saveHint)}</p> `);
		if (saveState === "error") {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="save-actions svelte-1w7916z"><button class="secondary-button" type="button">Retry save</button> <button class="ghost-button" type="button">Reload project</button></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> `);
		if (showSetupGuide) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="setup-guide svelte-1w7916z" role="note"><strong class="svelte-1w7916z">First run checklist</strong> <ol class="svelte-1w7916z"><li class="svelte-1w7916z">Confirm the project root and output paths above.</li> <li class="svelte-1w7916z">Add a source CSS path in the import panel.</li> <li class="svelte-1w7916z">Scan variables or tune tokens directly in the editor.</li> <li class="svelte-1w7916z">Enable bridge output only after the preview looks correct.</li></ol></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section>`);
		bind_props($$props, {
			config,
			configPath
		});
	});
}
//#endregion
//#region src/lib/components/semantic-colors/TokenEditor.svelte
function TokenEditor($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { manifest = void 0, selectedTokenId, activeMode, currentTokenAlt, selectedTokenNotes, setTheme, tokenLabel } = $$props;
		const selectedToken = derived(() => manifest.tokens[selectedTokenId]);
		$$renderer.push(`<section class="panel"><div class="panel-header"><div><p class="eyebrow">Token editor</p> <h2>${escape_html(selectedToken().label)}</h2></div> <span class="token-group svelte-1uy4k50">${escape_html(selectedToken().group)}</span></div> <p class="description svelte-1uy4k50">${escape_html(selectedToken().description)}</p> <div class="swatch-row svelte-1uy4k50"><button${attr("aria-label", `Preview ${selectedToken().label} in light mode: ${toCssColor(selectedToken().light)}`)} class="swatch-card svelte-1uy4k50" type="button"><span>Light</span> <span class="swatch svelte-1uy4k50"${attr_style(`background:${toCssColor(selectedToken().light)}`)}></span> <code class="svelte-1uy4k50">${escape_html(toCssColor(selectedToken().light))}</code></button> <button${attr("aria-label", `Preview ${selectedToken().label} in dark mode: ${toCssColor(selectedToken().dark)}`)} class="swatch-card svelte-1uy4k50" type="button"><span>Dark</span> <span class="swatch svelte-1uy4k50"${attr_style(`background:${toCssColor(selectedToken().dark)}`)}></span> <code class="svelte-1uy4k50">${escape_html(toCssColor(selectedToken().dark))}</code></button> <button${attr("aria-label", `Preview ${selectedToken().label} in alt mode: ${toCssColor(currentTokenAlt)}`)} class="swatch-card svelte-1uy4k50" type="button"><span>Alt</span> <span class="swatch svelte-1uy4k50"${attr_style(`background:${toCssColor(currentTokenAlt)}`)}></span> <code class="svelte-1uy4k50">${escape_html(toCssColor(currentTokenAlt))}</code></button></div> <div${attr_class(`anchor-editor ${activeMode === "light" ? "anchor-editor-active" : ""}`, "svelte-1uy4k50")}><div class="anchor-header svelte-1uy4k50"><strong>Light anchor</strong> <span>${escape_html(activeMode === "light" ? "Editing focus" : "Anchor remains inspectable")}</span></div> <div class="channel-grid svelte-1uy4k50"><label class="channel"><span>L</span> <input max="1" min="0" step="0.005" type="range"${attr("value", selectedToken().light.l)}/> <input class="number-field svelte-1uy4k50" max="1" min="0" step="0.005" type="number"${attr("value", selectedToken().light.l)}/></label> <label class="channel"><span>C</span> <input max="0.37" min="0" step="0.005" type="range"${attr("value", selectedToken().light.c)}/> <input class="number-field svelte-1uy4k50" max="0.37" min="0" step="0.005" type="number"${attr("value", selectedToken().light.c)}/></label> <label class="channel"><span>H</span> <input max="360" min="0" step="1" type="range"${attr("value", selectedToken().light.h)}/> <input class="number-field svelte-1uy4k50" max="360" min="0" step="1" type="number"${attr("value", selectedToken().light.h)}/></label></div></div> <div${attr_class(`anchor-editor ${activeMode === "dark" ? "anchor-editor-active" : ""}`, "svelte-1uy4k50")}><div class="anchor-header svelte-1uy4k50"><strong>Dark anchor</strong> <span>${escape_html(activeMode === "dark" ? "Editing focus" : "Anchor remains inspectable")}</span></div> <div class="channel-grid svelte-1uy4k50"><label class="channel"><span>L</span> <input max="1" min="0" step="0.005" type="range"${attr("value", selectedToken().dark.l)}/> <input class="number-field svelte-1uy4k50" max="1" min="0" step="0.005" type="number"${attr("value", selectedToken().dark.l)}/></label> <label class="channel"><span>C</span> <input max="0.37" min="0" step="0.005" type="range"${attr("value", selectedToken().dark.c)}/> <input class="number-field svelte-1uy4k50" max="0.37" min="0" step="0.005" type="number"${attr("value", selectedToken().dark.c)}/></label> <label class="channel"><span>H</span> <input max="360" min="0" step="1" type="range"${attr("value", selectedToken().dark.h)}/> <input class="number-field svelte-1uy4k50" max="360" min="0" step="1" type="number"${attr("value", selectedToken().dark.h)}/></label></div></div> <div${attr_class(`mode-block ${activeMode === "alt" ? "mode-block-promoted" : ""}`, "svelte-1uy4k50")}><div class="field-grid"><label class="field-block"><span>Alt behavior</span> `);
		$$renderer.select({ value: selectedToken().exception.altBehavior }, ($$renderer) => {
			$$renderer.option({ value: "derive" }, ($$renderer) => {
				$$renderer.push(`Derive`);
			});
			$$renderer.option({ value: "pin" }, ($$renderer) => {
				$$renderer.push(`Pin to source anchor`);
			});
			$$renderer.option({ value: "exclude" }, ($$renderer) => {
				$$renderer.push(`Exclude from Alt`);
			});
		});
		$$renderer.push(`</label> <label class="field-block"><span>Max chroma</span> <input${attr("value", selectedToken().exception.maxChroma)} max="0.37" min="0" step="0.005" type="number"/></label></div> `);
		if (selectedToken().altParent) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="microcopy svelte-1uy4k50">Alt derives from parent token: <strong>${escape_html(tokenLabel(selectedToken().altParent))}</strong></p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="validation-list svelte-1uy4k50"><div class="validation-header svelte-1uy4k50"><p class="eyebrow">Validation</p> `);
		if (selectedTokenNotes.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="validation-count svelte-1uy4k50">${escape_html(selectedTokenNotes.length)} warning(s)</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> `);
		if (selectedTokenNotes.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="validation-ok svelte-1uy4k50">No warnings for this token in ${escape_html(activeMode)} mode.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(selectedTokenNotes);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let note = each_array[$$index];
				$$renderer.push(`<p class="validation-issue svelte-1uy4k50">${escape_html(note)}</p>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]--></div></section>`);
		bind_props($$props, { manifest });
	});
}
//#endregion
//#region src/lib/components/semantic-colors/TokenInventory.svelte
function TokenInventory($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { selectedTokenId, currentColors, isSelectedUsage, hasWarnings, warningSummary, selectToken, tokenLabel } = $$props;
		$$renderer.push(`<article class="inventory svelte-18sludh"><div class="fixture-panel-header"><h3>Token inventory</h3> <span>Every shared token is visible and selectable here.</span></div> <!--[-->`);
		const each_array = ensure_array_like(TOKEN_GROUP_ORDER);
		for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
			let group = each_array[$$index_1];
			$$renderer.push(`<div class="inventory-group svelte-18sludh"><div class="inventory-group-header svelte-18sludh"><h4>${escape_html(group)}</h4> <span>${escape_html(TOKENS_BY_GROUP[group].length)} tokens</span></div> <div class="inventory-grid svelte-18sludh"><!--[-->`);
			const each_array_1 = ensure_array_like(TOKENS_BY_GROUP[group]);
			for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
				let tokenId = each_array_1[$$index];
				$$renderer.push(`<button${attr("aria-pressed", selectedTokenId === tokenId)}${attr_class("inventory-card svelte-18sludh", void 0, {
					"selected-usage": isSelectedUsage([tokenId]),
					"warning": hasWarnings([tokenId])
				})} type="button">`);
				WarningBadge($$renderer, {
					summary: warningSummary([tokenId]),
					visible: hasWarnings([tokenId])
				});
				$$renderer.push(`<!----> <span class="inventory-swatch svelte-18sludh"${attr_style(`background:${toCssColor(currentColors[tokenId])}`)}></span> <span class="inventory-title svelte-18sludh">${escape_html(tokenLabel(tokenId))}</span> <code class="svelte-18sludh">${escape_html(tokenId)}</code></button>`);
			}
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]--></article>`);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		let manifest = ensureManifest(createDefaultManifest());
		let config = { ...DEFAULT_PROJECT_CONFIG };
		let configPath = "";
		let selectedTokenId = "surface";
		let activeMode = "light";
		let importProposal = null;
		let importSelection = {};
		let isImporting = false;
		let saveState = "idle";
		let saveMessage = "Ready";
		const saveHeading = derived(() => saveState === "saving" ? "Autosaving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Ready");
		const saveHint = derived(() => saveState === "error" ? "Check the configured paths, then retry or reload the project state." : saveState === "saving" ? "Changes are persisted automatically after a short pause." : config.bridgeEnabled ? "Bridge output is enabled. Saving updates both the manifest and generated CSS." : "Bridge output is disabled. Saving updates the local manifest and config only.");
		const showSetupGuide = derived(() => !config.bridgeEnabled && !config.importSourcePath && manifest.aliases.length === 0);
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
		const darkTheme = derived(() => resolveTheme(manifest, "dark"));
		const altTheme = derived(() => resolveTheme(manifest, "alt"));
		const currentTheme = derived(() => activeMode === "light" ? lightTheme() : activeMode === "dark" ? darkTheme() : altTheme());
		const validations = derived(() => validateManifest(manifest));
		const selectedToken = derived(() => manifest.tokens[selectedTokenId]);
		const selectedTokenNotes = derived(() => summarizeTokenValidation(validations()[activeMode].perToken[selectedTokenId]));
		const stageStyle = derived(() => `${themeCssVariables(currentTheme())}\n`);
		const currentTokenAlt = derived(() => altTheme().colors[selectedTokenId]);
		async function responseMessage(response, fallback) {
			if ((response.headers.get("content-type") ?? "").includes("application/json")) {
				const payload = await response.json().catch(() => null);
				if (payload?.message) return payload.message;
			}
			return (await response.text().catch(() => "")).trim() || fallback;
		}
		async function reloadProject() {
			const response = await fetch(`/api/project/load?configPath=${encodeURIComponent(configPath)}`);
			if (!response.ok) {
				saveState = "error";
				saveMessage = await responseMessage(response, `Reload failed with status ${response.status}`);
				return;
			}
			applyPageData(await response.json());
			saveState = "saved";
			saveMessage = "Reloaded project state";
		}
		async function persistState() {
			saveState = "saving";
			saveMessage = "Saving manifest and generated CSS...";
			try {
				const response = await fetch("/api/project/save", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						configPath,
						config: snapshot(config),
						manifest: {
							...snapshot(manifest),
							updatedAt: (/* @__PURE__ */ new Date()).toISOString()
						}
					})
				});
				if (!response.ok) throw new Error(await responseMessage(response, `Save failed with status ${response.status}`));
				saveState = "saved";
				saveMessage = config.bridgeEnabled ? "Saved manifest and regenerated target CSS." : "Saved manifest and config. Bridge output is currently disabled.";
			} catch (error) {
				saveState = "error";
				saveMessage = error instanceof Error ? error.message : "Save failed";
			}
		}
		function isSelectedUsage(tokenIds) {
			return tokenIds.includes(selectedTokenId);
		}
		function hasWarnings(tokenIds) {
			return tokenIds.some((tokenId) => summarizeTokenValidation(validations()[activeMode].perToken[tokenId]).length > 0);
		}
		function selectToken(tokenId) {
			selectedTokenId = tokenId;
		}
		function updateAltDelta(channel, value) {
			manifest.alt.delta[channel] = value;
		}
		function setTheme(mode) {
			activeMode = mode;
		}
		function addAlias() {
			manifest.aliases = [...manifest.aliases, {
				name: "color-new-alias",
				tokenId: selectedTokenId
			}];
		}
		function removeAlias(index) {
			manifest.aliases = manifest.aliases.filter((_, aliasIndex) => aliasIndex !== index);
		}
		function updateAlias(index, patch) {
			manifest.aliases[index] = {
				...manifest.aliases[index],
				...patch
			};
		}
		function warningNotes(tokenIds) {
			return [...new Set(tokenIds.flatMap((tokenId) => summarizeTokenValidation(validations()[activeMode].perToken[tokenId])))];
		}
		function warningSummary(tokenIds) {
			const notes = warningNotes(tokenIds);
			if (notes.length === 0) return "No validation warnings.";
			return `${notes.length} validation warning${notes.length === 1 ? "" : "s"}: ${notes.join(" ")}`;
		}
		async function retrySave() {
			await persistState();
		}
		function confirmResetManifest() {
			if (!window.confirm("Reset the manifest to defaults? This replaces all token anchors, alt settings, and aliases in the current project.")) return;
			resetManifest();
			saveMessage = "Reset the manifest to the default semantic color set.";
		}
		async function runImport() {
			isImporting = true;
			saveMessage = "Scanning CSS variables from source file...";
			try {
				const response = await fetch("/api/project/import", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						configPath,
						sourcePath: config.importSourcePath
					})
				});
				if (!response.ok) throw new Error(await responseMessage(response, `Import failed with status ${response.status}`));
				importProposal = await response.json();
				importSelection = Object.fromEntries(importProposal.candidates.map((candidate) => [candidate.sourceName, candidate.suggestedTokenId ?? ""]));
				saveMessage = `Imported ${importProposal.candidates.length} custom properties for review.`;
			} catch (error) {
				saveMessage = error instanceof Error ? error.message : "Import failed";
			} finally {
				isImporting = false;
			}
		}
		function applyImportReview() {
			if (!importProposal) return;
			for (const candidate of importProposal.candidates) {
				const tokenId = importSelection[candidate.sourceName];
				if (!tokenId) continue;
				if (candidate.light) manifest.tokens[tokenId].light = { ...candidate.light };
				if (candidate.dark) manifest.tokens[tokenId].dark = { ...candidate.dark };
				if (!manifest.aliases.some((alias) => alias.name === candidate.sourceName)) manifest.aliases = [...manifest.aliases, {
					name: candidate.sourceName,
					tokenId
				}];
			}
			importProposal = null;
			saveMessage = "Applied reviewed import mappings into the canonical manifest.";
		}
		function resetManifest() {
			manifest = createDefaultManifest();
			selectedTokenId = "surface";
		}
		function tokenLabel(tokenId) {
			return manifest.tokens[tokenId].label;
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			head("1uha8ag", $$renderer, ($$renderer) => {
				$$renderer.title(($$renderer) => {
					$$renderer.push(`<title>Semantic Colors</title>`);
				});
			});
			$$renderer.push(`<a class="skip-link" href="#preview-stage">Skip to preview harness</a> <div class="semantic-colors-app workspace"><aside class="sidebar">`);
			ProjectPanel($$renderer, {
				saveHeading: saveHeading(),
				saveHint: saveHint(),
				saveMessage,
				saveState,
				showSetupGuide: showSetupGuide(),
				onReload: reloadProject,
				onRetrySave: retrySave,
				get config() {
					return config;
				},
				set config($$value) {
					config = $$value;
					$$settled = false;
				},
				get configPath() {
					return configPath;
				},
				set configPath($$value) {
					configPath = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			ModeControls($$renderer, {
				activeMode,
				setTheme,
				updateAltDelta,
				get manifest() {
					return manifest;
				},
				set manifest($$value) {
					manifest = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			TokenEditor($$renderer, {
				activeMode,
				currentTokenAlt: currentTokenAlt(),
				selectedTokenId,
				selectedTokenNotes: selectedTokenNotes(),
				setTheme,
				tokenLabel,
				get manifest() {
					return manifest;
				},
				set manifest($$value) {
					manifest = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----> `);
			AliasPanel($$renderer, {
				addAlias,
				manifest,
				removeAlias,
				tokenLabel,
				updateAlias
			});
			$$renderer.push(`<!----> `);
			ImportReview($$renderer, {
				applyImportReview,
				confirmResetManifest,
				importProposal,
				isImporting,
				runImport,
				tokenLabel,
				get config() {
					return config;
				},
				set config($$value) {
					config = $$value;
					$$settled = false;
				},
				get importSelection() {
					return importSelection;
				},
				set importSelection($$value) {
					importSelection = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----></aside> <main class="stage-shell">`);
			FixtureStage($$renderer, {
				activeMode,
				grayscalePreview: manifest.alt.grayscalePreview,
				hasWarnings,
				isSelectedUsage,
				saveMessage,
				saveState,
				selectToken,
				selectedTokenId,
				selectedTokenLabel: selectedToken().label,
				stageStyle: stageStyle(),
				tokenLabel,
				warningSummary
			});
			$$renderer.push(`<!----> `);
			TokenInventory($$renderer, {
				currentColors: currentTheme().colors,
				hasWarnings,
				isSelectedUsage,
				selectToken,
				selectedTokenId,
				tokenLabel,
				warningSummary
			});
			$$renderer.push(`<!----></main></div>`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
//#endregion
export { _page as default };
