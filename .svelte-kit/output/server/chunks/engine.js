import { APCAcontrast, sRGBtoY } from "apca-w3";
import { clampRgb, converter, displayable, formatCss, parse } from "culori";
//#region src/lib/theme/schema.ts
var TOKEN_GROUP_ORDER = [
	"surfaces",
	"text",
	"borders",
	"accent",
	"status",
	"controls"
];
var TOKENS_BY_GROUP = {
	surfaces: [
		"app",
		"shell",
		"surface",
		"surface-raised",
		"surface-muted",
		"surface-subtle",
		"surface-overlay",
		"field"
	],
	text: [
		"text",
		"text-secondary",
		"text-muted",
		"text-faint",
		"text-inverse"
	],
	borders: [
		"border",
		"border-subtle",
		"border-strong",
		"focus-ring"
	],
	accent: [
		"accent",
		"accent-strong",
		"accent-surface",
		"link",
		"link-hover"
	],
	status: [
		"success",
		"success-surface",
		"warning",
		"warning-surface",
		"danger",
		"danger-surface",
		"info",
		"info-surface"
	],
	controls: [
		"control-primary",
		"control-primary-text",
		"control-secondary",
		"control-secondary-text",
		"control-secondary-border",
		"control-ghost-hover",
		"input",
		"input-border",
		"input-placeholder"
	]
};
var ALL_TOKEN_IDS = TOKEN_GROUP_ORDER.flatMap((group) => TOKENS_BY_GROUP[group]);
var DEFAULT_PROJECT_CONFIG = {
	version: 1,
	projectRoot: "",
	bridgeEnabled: false,
	manifestPath: "semantic-colors/theme.manifest.json",
	cssOutputPath: "src/lib/styles/semantic-theme.generated.css",
	importSourcePath: "",
	selectorStrategy: "data-theme"
};
//#endregion
//#region src/lib/theme/defaults.ts
function token(definition) {
	const { altBehavior = "derive", ...rest } = definition;
	return {
		...rest,
		exception: { altBehavior }
	};
}
var TOKENS = [
	token({
		id: "app",
		label: "App",
		description: "Outer application background.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .982,
			c: .006,
			h: 95
		},
		dark: {
			l: .16,
			c: .015,
			h: 265
		}
	}),
	token({
		id: "shell",
		label: "Shell",
		description: "Secondary shell or page frame surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .965,
			c: .008,
			h: 95
		},
		dark: {
			l: .205,
			c: .016,
			h: 265
		}
	}),
	token({
		id: "surface",
		label: "Surface",
		description: "Primary content surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .998,
			c: .003,
			h: 95
		},
		dark: {
			l: .235,
			c: .013,
			h: 265
		}
	}),
	token({
		id: "surface-raised",
		label: "Surface Raised",
		description: "Card or elevated panel surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .976,
			c: .01,
			h: 95
		},
		dark: {
			l: .29,
			c: .014,
			h: 265
		}
	}),
	token({
		id: "surface-muted",
		label: "Surface Muted",
		description: "Muted supporting surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .945,
			c: .012,
			h: 95
		},
		dark: {
			l: .33,
			c: .016,
			h: 265
		}
	}),
	token({
		id: "surface-subtle",
		label: "Surface Subtle",
		description: "Low-contrast surface for soft differentiation.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .925,
			c: .011,
			h: 95
		},
		dark: {
			l: .37,
			c: .016,
			h: 265
		}
	}),
	token({
		id: "surface-overlay",
		label: "Surface Overlay",
		description: "Overlay panel or chrome surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .992,
			c: .006,
			h: 95,
			alpha: .92
		},
		dark: {
			l: .2,
			c: .014,
			h: 265,
			alpha: .92
		}
	}),
	token({
		id: "field",
		label: "Field",
		description: "Input or inset field surface.",
		group: "surfaces",
		role: "neutral",
		light: {
			l: .998,
			c: .002,
			h: 95
		},
		dark: {
			l: .18,
			c: .013,
			h: 265
		}
	}),
	token({
		id: "text",
		label: "Text",
		description: "Primary readable text.",
		group: "text",
		role: "neutral",
		light: {
			l: .22,
			c: .016,
			h: 260
		},
		dark: {
			l: .94,
			c: .01,
			h: 95
		}
	}),
	token({
		id: "text-secondary",
		label: "Text Secondary",
		description: "Supporting readable text.",
		group: "text",
		role: "neutral",
		light: {
			l: .43,
			c: .014,
			h: 260
		},
		dark: {
			l: .78,
			c: .012,
			h: 95
		}
	}),
	token({
		id: "text-muted",
		label: "Text Muted",
		description: "Muted annotation text.",
		group: "text",
		role: "neutral",
		light: {
			l: .54,
			c: .012,
			h: 260
		},
		dark: {
			l: .68,
			c: .012,
			h: 95
		}
	}),
	token({
		id: "text-faint",
		label: "Text Faint",
		description: "Lowest emphasis text.",
		group: "text",
		role: "neutral",
		light: {
			l: .65,
			c: .01,
			h: 260
		},
		dark: {
			l: .58,
			c: .011,
			h: 95
		}
	}),
	token({
		id: "text-inverse",
		label: "Text Inverse",
		description: "Text used on dark or accent surfaces.",
		group: "text",
		role: "neutral",
		light: {
			l: .992,
			c: .003,
			h: 95
		},
		dark: {
			l: .18,
			c: .013,
			h: 265
		}
	}),
	token({
		id: "border",
		label: "Border",
		description: "Default border.",
		group: "borders",
		role: "neutral",
		light: {
			l: .82,
			c: .012,
			h: 95
		},
		dark: {
			l: .45,
			c: .012,
			h: 265
		}
	}),
	token({
		id: "border-subtle",
		label: "Border Subtle",
		description: "Low-contrast border.",
		group: "borders",
		role: "neutral",
		light: {
			l: .88,
			c: .009,
			h: 95
		},
		dark: {
			l: .34,
			c: .011,
			h: 265
		}
	}),
	token({
		id: "border-strong",
		label: "Border Strong",
		description: "Higher-emphasis border.",
		group: "borders",
		role: "neutral",
		light: {
			l: .72,
			c: .014,
			h: 95
		},
		dark: {
			l: .58,
			c: .013,
			h: 265
		}
	}),
	token({
		id: "focus-ring",
		label: "Focus Ring",
		description: "Focus and outline indicator.",
		group: "borders",
		role: "accent",
		light: {
			l: .69,
			c: .16,
			h: 246
		},
		dark: {
			l: .76,
			c: .14,
			h: 246
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "accent",
		label: "Accent",
		description: "Primary accent color.",
		group: "accent",
		role: "accent",
		light: {
			l: .63,
			c: .17,
			h: 230
		},
		dark: {
			l: .76,
			c: .14,
			h: 230
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "accent-strong",
		label: "Accent Strong",
		description: "Higher-impact accent.",
		group: "accent",
		role: "accent",
		light: {
			l: .54,
			c: .2,
			h: 240
		},
		dark: {
			l: .8,
			c: .17,
			h: 240
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "accent-surface",
		label: "Accent Surface",
		description: "Tinted accent background.",
		group: "accent",
		role: "accent",
		light: {
			l: .95,
			c: .045,
			h: 230
		},
		dark: {
			l: .29,
			c: .07,
			h: 230
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "link",
		label: "Link",
		description: "Default link color.",
		group: "accent",
		role: "accent",
		light: {
			l: .57,
			c: .18,
			h: 252
		},
		dark: {
			l: .82,
			c: .16,
			h: 252
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "link-hover",
		label: "Link Hover",
		description: "Hovered link color.",
		group: "accent",
		role: "accent",
		light: {
			l: .49,
			c: .2,
			h: 252
		},
		dark: {
			l: .88,
			c: .18,
			h: 252
		},
		harmonyGroup: "accent"
	}),
	token({
		id: "success",
		label: "Success",
		description: "Positive state text or icon.",
		group: "status",
		role: "status",
		light: {
			l: .65,
			c: .17,
			h: 153
		},
		dark: {
			l: .77,
			c: .14,
			h: 153
		},
		altBehavior: "pin"
	}),
	token({
		id: "success-surface",
		label: "Success Surface",
		description: "Positive state surface.",
		group: "status",
		role: "status",
		light: {
			l: .95,
			c: .05,
			h: 153
		},
		dark: {
			l: .28,
			c: .06,
			h: 153
		},
		altBehavior: "pin"
	}),
	token({
		id: "warning",
		label: "Warning",
		description: "Warning state text or icon.",
		group: "status",
		role: "status",
		light: {
			l: .74,
			c: .15,
			h: 82
		},
		dark: {
			l: .83,
			c: .12,
			h: 82
		},
		altBehavior: "pin"
	}),
	token({
		id: "warning-surface",
		label: "Warning Surface",
		description: "Warning surface.",
		group: "status",
		role: "status",
		light: {
			l: .97,
			c: .04,
			h: 82
		},
		dark: {
			l: .3,
			c: .05,
			h: 82
		},
		altBehavior: "pin"
	}),
	token({
		id: "danger",
		label: "Danger",
		description: "Danger state text or icon.",
		group: "status",
		role: "status",
		light: {
			l: .62,
			c: .21,
			h: 28
		},
		dark: {
			l: .75,
			c: .17,
			h: 28
		},
		altBehavior: "pin"
	}),
	token({
		id: "danger-surface",
		label: "Danger Surface",
		description: "Danger surface.",
		group: "status",
		role: "status",
		light: {
			l: .96,
			c: .05,
			h: 28
		},
		dark: {
			l: .28,
			c: .06,
			h: 28
		},
		altBehavior: "pin"
	}),
	token({
		id: "info",
		label: "Info",
		description: "Informational state text or icon.",
		group: "status",
		role: "status",
		light: {
			l: .67,
			c: .13,
			h: 232
		},
		dark: {
			l: .8,
			c: .11,
			h: 232
		},
		altBehavior: "pin"
	}),
	token({
		id: "info-surface",
		label: "Info Surface",
		description: "Informational surface.",
		group: "status",
		role: "status",
		light: {
			l: .96,
			c: .04,
			h: 232
		},
		dark: {
			l: .28,
			c: .05,
			h: 232
		},
		altBehavior: "pin"
	}),
	token({
		id: "control-primary",
		label: "Control Primary",
		description: "Primary action fill.",
		group: "controls",
		role: "control",
		light: {
			l: .54,
			c: .2,
			h: 240
		},
		dark: {
			l: .8,
			c: .17,
			h: 240
		},
		altParent: "accent-strong",
		harmonyGroup: "accent"
	}),
	token({
		id: "control-primary-text",
		label: "Control Primary Text",
		description: "Text on primary actions.",
		group: "controls",
		role: "control",
		light: {
			l: .992,
			c: .003,
			h: 95
		},
		dark: {
			l: .18,
			c: .013,
			h: 265
		},
		altParent: "text-inverse"
	}),
	token({
		id: "control-secondary",
		label: "Control Secondary",
		description: "Secondary action fill.",
		group: "controls",
		role: "control",
		light: {
			l: .976,
			c: .01,
			h: 95
		},
		dark: {
			l: .29,
			c: .014,
			h: 265
		},
		altParent: "surface-raised"
	}),
	token({
		id: "control-secondary-text",
		label: "Control Secondary Text",
		description: "Text on secondary actions.",
		group: "controls",
		role: "control",
		light: {
			l: .22,
			c: .016,
			h: 260
		},
		dark: {
			l: .94,
			c: .01,
			h: 95
		},
		altParent: "text"
	}),
	token({
		id: "control-secondary-border",
		label: "Control Secondary Border",
		description: "Secondary action border.",
		group: "controls",
		role: "control",
		light: {
			l: .72,
			c: .014,
			h: 95
		},
		dark: {
			l: .58,
			c: .013,
			h: 265
		},
		altParent: "border-strong"
	}),
	token({
		id: "control-ghost-hover",
		label: "Control Ghost Hover",
		description: "Ghost action hover state.",
		group: "controls",
		role: "control",
		light: {
			l: .925,
			c: .011,
			h: 95
		},
		dark: {
			l: .37,
			c: .016,
			h: 265
		},
		altParent: "surface-subtle"
	}),
	token({
		id: "input",
		label: "Input",
		description: "Input background.",
		group: "controls",
		role: "control",
		light: {
			l: .998,
			c: .002,
			h: 95
		},
		dark: {
			l: .18,
			c: .013,
			h: 265
		},
		altParent: "field"
	}),
	token({
		id: "input-border",
		label: "Input Border",
		description: "Input border.",
		group: "controls",
		role: "control",
		light: {
			l: .82,
			c: .012,
			h: 95
		},
		dark: {
			l: .45,
			c: .012,
			h: 265
		},
		altParent: "border"
	}),
	token({
		id: "input-placeholder",
		label: "Input Placeholder",
		description: "Input placeholder text.",
		group: "controls",
		role: "control",
		light: {
			l: .65,
			c: .01,
			h: 260
		},
		dark: {
			l: .58,
			c: .011,
			h: 95
		},
		altParent: "text-faint"
	})
];
function createDefaultManifest() {
	return {
		version: 1,
		name: "Semantic Color System",
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		alt: {
			source: "dark",
			delta: {
				l: .02,
				c: .03,
				h: 28
			},
			harmonyLock: true,
			grayscalePreview: false
		},
		tokens: Object.fromEntries(TOKENS.map((token) => [token.id, structuredClone(token)])),
		aliases: []
	};
}
//#endregion
//#region src/lib/theme/color.ts
var toOklch = converter("oklch");
var toRgb = converter("rgb");
function cloneColor(color) {
	return { ...color };
}
function normalizeHue(hue) {
	const value = hue % 360;
	return value < 0 ? value + 360 : value;
}
function sanitizeColor(color) {
	return {
		l: clamp(color.l, 0, 1),
		c: Math.max(0, color.c),
		h: normalizeHue(color.h),
		alpha: color.alpha ?? 1
	};
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function parseColor(input) {
	const parsed = parse(input);
	if (!parsed) return null;
	const color = toOklch(parsed);
	if (!color || color.l === void 0 || color.c === void 0 || color.h === void 0) return null;
	return sanitizeColor({
		l: color.l,
		c: color.c,
		h: color.h ?? 0,
		alpha: color.alpha ?? 1
	});
}
function toCssColor(color) {
	const normalized = sanitizeColor(color);
	return formatCss(toOklch(normalized)) ?? `oklch(${(normalized.l * 100).toFixed(2)}% ${normalized.c.toFixed(4)} ${normalized.h.toFixed(2)})`;
}
function toRgbChannels(color) {
	const rgb = toRgb(color);
	if (!rgb || rgb.r === void 0 || rgb.g === void 0 || rgb.b === void 0) return [
		0,
		0,
		0
	];
	return [
		Math.round(clamp(rgb.r, 0, 1) * 255),
		Math.round(clamp(rgb.g, 0, 1) * 255),
		Math.round(clamp(rgb.b, 0, 1) * 255)
	];
}
function clampToDisplayable(color, maxChroma) {
	const working = sanitizeColor(color);
	if (maxChroma !== void 0 && maxChroma !== null) working.c = Math.min(working.c, maxChroma);
	const candidate = toOklch(working);
	if (candidate && displayable(candidate)) return working;
	let low = 0;
	let high = working.c;
	let best = {
		...working,
		c: 0
	};
	for (let index = 0; index < 18; index += 1) {
		const mid = (low + high) / 2;
		const probe = {
			...working,
			c: mid
		};
		const converted = toOklch(probe);
		if (converted && displayable(converted)) {
			best = probe;
			low = mid;
		} else high = mid;
	}
	const backToOklch = toOklch(clampRgb(best));
	if (!backToOklch || backToOklch.l === void 0 || backToOklch.c === void 0 || backToOklch.h === void 0) return sanitizeColor(best);
	return sanitizeColor({
		l: backToOklch.l,
		c: backToOklch.c,
		h: backToOklch.h ?? working.h,
		alpha: backToOklch.alpha ?? working.alpha
	});
}
//#endregion
//#region src/lib/theme/engine.ts
function ensureManifest(manifest) {
	if (!manifest) return createDefaultManifest();
	const fallback = createDefaultManifest();
	const tokens = {
		...fallback.tokens,
		...manifest.tokens
	};
	return {
		...fallback,
		...manifest,
		alt: {
			...fallback.alt,
			...manifest.alt,
			delta: {
				...fallback.alt.delta,
				...manifest.alt?.delta
			}
		},
		tokens
	};
}
function anchorFor(token, source) {
	return source === "light" ? token.light : token.dark;
}
function resolveAltToken(tokenId, manifest, cache) {
	const cached = cache.get(tokenId);
	if (cached) return cached;
	const token = manifest.tokens[tokenId];
	if (!token) {
		const fallback = createDefaultManifest().tokens[tokenId];
		cache.set(tokenId, fallback.dark);
		return fallback.dark;
	}
	const source = manifest.alt.source;
	const sourceColor = cloneColor(anchorFor(token, source));
	const altBehavior = token.exception.altBehavior;
	if (altBehavior === "exclude" || altBehavior === "pin" || token.group === "status") {
		cache.set(tokenId, sourceColor);
		return sourceColor;
	}
	if (token.altParent) {
		const parent = resolveAltToken(token.altParent, manifest, cache);
		cache.set(tokenId, parent);
		return parent;
	}
	const shifted = clampToDisplayable({
		l: sourceColor.l + manifest.alt.delta.l,
		c: sourceColor.c + manifest.alt.delta.c,
		h: normalizeHue(sourceColor.h + manifest.alt.delta.h),
		alpha: sourceColor.alpha
	}, token.exception.maxChroma ?? void 0);
	cache.set(tokenId, shifted);
	return shifted;
}
function resolveTheme(manifestInput, mode) {
	const manifest = ensureManifest(manifestInput);
	const colors = {};
	const altCache = /* @__PURE__ */ new Map();
	for (const tokenId of ALL_TOKEN_IDS) {
		const token = manifest.tokens[tokenId];
		if (!token) continue;
		colors[tokenId] = mode === "alt" ? resolveAltToken(tokenId, manifest, altCache) : cloneColor(mode === "light" ? token.light : token.dark);
	}
	return {
		mode,
		colors
	};
}
function contrastIssue(text, background, label) {
	const contrast = Math.abs(APCAcontrast(sRGBtoY(toRgbChannels(text)), sRGBtoY(toRgbChannels(background))));
	if (contrast >= 60) return null;
	return `${label} contrast is ${contrast.toFixed(1)}Lc`;
}
var CONTRAST_PAIRS = [
	[
		"text",
		"surface",
		"Body text on surface"
	],
	[
		"text-secondary",
		"surface-muted",
		"Secondary text on muted surface"
	],
	[
		"text-inverse",
		"accent-strong",
		"Inverse text on accent strong"
	],
	[
		"control-primary-text",
		"control-primary",
		"Primary control text"
	],
	[
		"control-secondary-text",
		"control-secondary",
		"Secondary control text"
	],
	[
		"input-placeholder",
		"input",
		"Input placeholder"
	],
	[
		"success",
		"success-surface",
		"Success text"
	],
	[
		"warning",
		"warning-surface",
		"Warning text"
	],
	[
		"danger",
		"danger-surface",
		"Danger text"
	],
	[
		"info",
		"info-surface",
		"Info text"
	]
];
function validateManifest(manifestInput) {
	const manifest = ensureManifest(manifestInput);
	const validations = {
		light: createValidationShell(),
		dark: createValidationShell(),
		alt: createValidationShell()
	};
	for (const mode of [
		"light",
		"dark",
		"alt"
	]) {
		const resolved = resolveTheme(manifest, mode);
		for (const tokenId of ALL_TOKEN_IDS) {
			const base = mode === "alt" ? anchorFor(manifest.tokens[tokenId], manifest.alt.source) : anchorFor(manifest.tokens[tokenId], mode);
			const resolvedColor = resolved.colors[tokenId];
			const gamutAdjusted = Math.abs(base.c - resolvedColor.c) > .002 || Math.abs(base.l - resolvedColor.l) > .002 || Math.abs(base.h - resolvedColor.h) > .5;
			validations[mode].perToken[tokenId] = {
				tokenId,
				gamutAdjusted,
				contrastIssues: []
			};
		}
		for (const [foregroundId, backgroundId, label] of CONTRAST_PAIRS) {
			const issue = contrastIssue(resolved.colors[foregroundId], resolved.colors[backgroundId], label);
			if (issue) {
				validations[mode].perToken[foregroundId].contrastIssues.push(issue);
				validations[mode].perToken[backgroundId].contrastIssues.push(issue);
			}
		}
	}
	return validations;
}
function createValidationShell() {
	const perToken = {};
	for (const tokenId of ALL_TOKEN_IDS) perToken[tokenId] = {
		tokenId,
		gamutAdjusted: false,
		contrastIssues: []
	};
	return { perToken };
}
function summarizeTokenValidation(validation) {
	const notes = [];
	if (validation.gamutAdjusted) notes.push("Chroma was clamped to stay displayable.");
	notes.push(...validation.contrastIssues);
	return notes;
}
function themeCssVariables(resolved) {
	return ALL_TOKEN_IDS.map((tokenId) => `  --theme-${tokenId}: ${toCssColor(resolved.colors[tokenId])};`).join("\n");
}
//#endregion
export { validateManifest as a, createDefaultManifest as c, TOKENS_BY_GROUP as d, TOKEN_GROUP_ORDER as f, themeCssVariables as i, ALL_TOKEN_IDS as l, resolveTheme as n, parseColor as o, summarizeTokenValidation as r, toCssColor as s, ensureManifest as t, DEFAULT_PROJECT_CONFIG as u };
