import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { r as resolveTheme, A as ALL_TOKEN_IDS, b as themeCssVariables, p as parseColor, c as createDefaultManifest, D as DEFAULT_PROJECT_CONFIG } from "./engine.js";
function generateThemeCss(manifest) {
  const light = resolveTheme(manifest, "light");
  const dark = resolveTheme(manifest, "dark");
  const alt = resolveTheme(manifest, "alt");
  const bridge = ALL_TOKEN_IDS.map((tokenId) => `  --color-${tokenId}: var(--theme-${tokenId});`).join("\n");
  const aliases = manifest.aliases.map((alias) => `  --${alias.name}: var(--color-${alias.tokenId});`).join("\n");
  return `@theme {
${bridge}
}

:root,
:root[data-theme='light'] {
${themeCssVariables(light)}
  color-scheme: light;
}

:root[data-theme='dark'] {
${themeCssVariables(dark)}
  color-scheme: dark;
}

:root[data-theme='alt'] {
${themeCssVariables(alt)}
  color-scheme: dark;
}

:root {
${aliases || "  /* No local aliases defined. */"}
}
`;
}
const NAME_MAP = [
  { match: /\b(app|bg|background)\b/, tokenId: "app", confidence: 0.72, reason: "Looks like an app background token." },
  { match: /\bshell\b/, tokenId: "shell", confidence: 0.9, reason: "Shell naming matches the canonical shell token." },
  { match: /\bsurface(?:[-_]raised|[-_]elevated|[-_]strong)\b/, tokenId: "surface-raised", confidence: 0.92, reason: "Raised/elevated surface naming." },
  { match: /\bsurface(?:[-_]muted)\b/, tokenId: "surface-muted", confidence: 0.92, reason: "Muted surface naming." },
  { match: /\bsurface(?:[-_]subtle|[-_]sunken)\b/, tokenId: "surface-subtle", confidence: 0.9, reason: "Subtle or sunken surface naming." },
  { match: /\bsurface(?:[-_]overlay)?\b/, tokenId: "surface", confidence: 0.62, reason: "Generic surface naming." },
  { match: /\b(field|input)(?!.*border)(?!.*placeholder)\b/, tokenId: "input", confidence: 0.84, reason: "Field/input background naming." },
  { match: /\btext(?:[-_]primary)?\b/, tokenId: "text", confidence: 0.82, reason: "Primary text naming." },
  { match: /\btext[-_](secondary|main-secondary)\b/, tokenId: "text-secondary", confidence: 0.88, reason: "Secondary text naming." },
  { match: /\btext[-_](muted|subtle)\b/, tokenId: "text-muted", confidence: 0.83, reason: "Muted text naming." },
  { match: /\btext[-_](faint|placeholder)\b/, tokenId: "text-faint", confidence: 0.84, reason: "Faint text naming." },
  { match: /\btext[-_](inverse|invert)\b/, tokenId: "text-inverse", confidence: 0.9, reason: "Inverse text naming." },
  { match: /\bborder[-_](subtle)\b/, tokenId: "border-subtle", confidence: 0.9, reason: "Subtle border naming." },
  { match: /\bborder[-_](strong|focus)\b/, tokenId: "border-strong", confidence: 0.75, reason: "Strong border naming." },
  { match: /\bborder\b/, tokenId: "border", confidence: 0.8, reason: "Default border naming." },
  { match: /\bfocus\b/, tokenId: "focus-ring", confidence: 0.83, reason: "Focus naming." },
  { match: /\b(accent|brand)(?!.*surface)(?!.*strong)\b/, tokenId: "accent", confidence: 0.81, reason: "Accent or brand naming." },
  { match: /\b(accent|brand)[-_](strong|hover)\b/, tokenId: "accent-strong", confidence: 0.75, reason: "Accent strong/hover naming." },
  { match: /\baccent[-_]surface\b/, tokenId: "accent-surface", confidence: 0.88, reason: "Accent surface naming." },
  { match: /\blink(?:[-_]hover)?\b/, tokenId: "link", confidence: 0.82, reason: "Link naming." },
  { match: /\blink[-_]hover\b/, tokenId: "link-hover", confidence: 0.88, reason: "Link hover naming." },
  { match: /\bsuccess(?:[-_]soft|[-_]surface)?\b/, tokenId: "success", confidence: 0.72, reason: "Success naming." },
  { match: /\bsuccess[-_](soft|surface)\b/, tokenId: "success-surface", confidence: 0.85, reason: "Success surface naming." },
  { match: /\bwarning(?:[-_]soft|[-_]surface)?\b/, tokenId: "warning", confidence: 0.72, reason: "Warning naming." },
  { match: /\bwarning[-_](soft|surface)\b/, tokenId: "warning-surface", confidence: 0.85, reason: "Warning surface naming." },
  { match: /\bdanger(?:[-_]soft|[-_]surface)?\b/, tokenId: "danger", confidence: 0.72, reason: "Danger naming." },
  { match: /\bdanger[-_](soft|surface)\b/, tokenId: "danger-surface", confidence: 0.85, reason: "Danger surface naming." },
  { match: /\binfo(?:[-_]soft|[-_]surface)?\b/, tokenId: "info", confidence: 0.72, reason: "Info naming." },
  { match: /\binfo[-_](soft|surface)\b/, tokenId: "info-surface", confidence: 0.85, reason: "Info surface naming." },
  { match: /\b(button|control)[-_]primary(?:[-_]text)?\b/, tokenId: "control-primary", confidence: 0.86, reason: "Primary control naming." },
  { match: /\b(button|control)[-_]primary[-_]text\b/, tokenId: "control-primary-text", confidence: 0.9, reason: "Primary control text naming." },
  { match: /\b(button|control)[-_]secondary(?:[-_]text|[-_]border)?\b/, tokenId: "control-secondary", confidence: 0.82, reason: "Secondary control naming." },
  { match: /\b(button|control)[-_]secondary[-_]text\b/, tokenId: "control-secondary-text", confidence: 0.88, reason: "Secondary control text naming." },
  { match: /\b(button|control)[-_]secondary[-_]border\b/, tokenId: "control-secondary-border", confidence: 0.88, reason: "Secondary control border naming." },
  { match: /\bghost[-_]hover\b/, tokenId: "control-ghost-hover", confidence: 0.87, reason: "Ghost hover naming." },
  { match: /\binput[-_]border\b/, tokenId: "input-border", confidence: 0.89, reason: "Input border naming." },
  { match: /\binput[-_]placeholder\b/, tokenId: "input-placeholder", confidence: 0.89, reason: "Input placeholder naming." }
];
function splitLightDarkValue(value) {
  const match = value.match(/light-dark\((.*)\)/);
  if (!match) {
    return {};
  }
  const inner = match[1];
  let depth = 0;
  let separator = -1;
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      separator = index;
      break;
    }
  }
  if (separator === -1) {
    return {};
  }
  return {
    light: inner.slice(0, separator).trim(),
    dark: inner.slice(separator + 1).trim()
  };
}
function parseCandidateValues(rawValue) {
  const lightDark = splitLightDarkValue(rawValue);
  if (lightDark.light || lightDark.dark) {
    return {
      light: lightDark.light ? parseColor(lightDark.light) : null,
      dark: lightDark.dark ? parseColor(lightDark.dark) : null
    };
  }
  const parsed = parseColor(rawValue);
  return {
    light: parsed,
    dark: parsed
  };
}
function suggestToken(sourceName) {
  const normalized = sourceName.toLowerCase();
  let best = null;
  for (const entry of NAME_MAP) {
    if (!entry.match.test(normalized)) {
      continue;
    }
    if (!best || entry.confidence > best.confidence) {
      best = {
        sourceName,
        rawValue: "",
        suggestedTokenId: entry.tokenId,
        confidence: entry.confidence,
        reason: entry.reason
      };
    }
  }
  if (!best) {
    return {
      suggestedTokenId: null,
      confidence: 0.2,
      reason: "No strong semantic match. Review manually."
    };
  }
  return best;
}
function extractImportProposal(sourcePath, css) {
  const regex = /--([a-z0-9-_]+)\s*:\s*([^;]+);/gi;
  const candidates = [];
  for (const match of css.matchAll(regex)) {
    const sourceName = match[1];
    const rawValue = match[2].trim();
    const suggestion = suggestToken(sourceName);
    const values = parseCandidateValues(rawValue);
    candidates.push({
      sourceName,
      rawValue,
      suggestedTokenId: suggestion.suggestedTokenId,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      light: values.light,
      dark: values.dark
    });
  }
  candidates.sort((left, right) => right.confidence - left.confidence);
  return {
    sourcePath,
    candidates
  };
}
const SESSION_DIR = ".semantic-colors";
const SESSION_PATH = path.join(SESSION_DIR, "session.json");
const DEFAULT_CONFIG_PATH = "semantic-colors.project.json";
async function safeReadText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
async function ensureParent(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}
function resolvePath(basePath, targetPath) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(path.dirname(basePath), targetPath);
}
function resolveProjectPath(configPath, projectRoot, targetPath) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  const root = projectRoot ? resolvePath(configPath, projectRoot) : path.dirname(configPath);
  return path.resolve(root, targetPath);
}
function defaultConfigPath(cwd) {
  return path.join(cwd, DEFAULT_CONFIG_PATH);
}
async function readSession(cwd) {
  const sessionFilePath = path.join(cwd, SESSION_PATH);
  const raw = await safeReadText(sessionFilePath);
  if (!raw) {
    return {
      configPath: defaultConfigPath(cwd)
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      configPath: parsed.configPath || defaultConfigPath(cwd)
    };
  } catch {
    return {
      configPath: defaultConfigPath(cwd)
    };
  }
}
async function writeSession(cwd, configPath) {
  const sessionFilePath = path.join(cwd, SESSION_PATH);
  await ensureParent(sessionFilePath);
  await writeFile(
    sessionFilePath,
    JSON.stringify(
      {
        configPath
      },
      null,
      2
    )
  );
}
function configWithDefaults(projectRoot, config) {
  return {
    ...DEFAULT_PROJECT_CONFIG,
    projectRoot,
    ...config,
    version: 1
  };
}
async function loadWorkspaceState(cwd, requestedConfigPath) {
  const session = await readSession(cwd);
  const configPath = requestedConfigPath || session.configPath;
  const rawConfig = await safeReadText(configPath);
  let config = configWithDefaults(path.dirname(configPath));
  if (rawConfig) {
    try {
      const parsed = JSON.parse(rawConfig);
      config = configWithDefaults(path.dirname(configPath), parsed);
    } catch {
      config = configWithDefaults(path.dirname(configPath));
    }
  }
  const manifestPath = resolveProjectPath(configPath, config.projectRoot, config.manifestPath);
  const rawManifest = await safeReadText(manifestPath);
  let manifest = createDefaultManifest();
  if (rawManifest) {
    try {
      manifest = {
        ...createDefaultManifest(),
        ...JSON.parse(rawManifest)
      };
    } catch {
      manifest = createDefaultManifest();
    }
  }
  return {
    configPath,
    config,
    manifest
  };
}
async function saveWorkspaceState(cwd, configPath, config, manifest) {
  const normalizedConfig = configWithDefaults(path.dirname(configPath), config);
  const manifestPath = resolveProjectPath(configPath, normalizedConfig.projectRoot, normalizedConfig.manifestPath);
  const cssOutputPath = resolveProjectPath(configPath, normalizedConfig.projectRoot, normalizedConfig.cssOutputPath);
  const css = generateThemeCss(manifest);
  await ensureParent(configPath);
  await writeFile(configPath, JSON.stringify(normalizedConfig, null, 2));
  await ensureParent(manifestPath);
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      null,
      2
    )
  );
  if (normalizedConfig.bridgeEnabled) {
    await ensureParent(cssOutputPath);
    await writeFile(cssOutputPath, css);
  }
  await writeSession(cwd, configPath);
}
async function importFromCss(configPath, sourcePath) {
  const configRoot = path.dirname(configPath);
  const resolvedSourcePath = resolveProjectPath(configPath, configRoot, sourcePath);
  const css = await readFile(resolvedSourcePath, "utf8");
  return extractImportProposal(resolvedSourcePath, css);
}
export {
  importFromCss as i,
  loadWorkspaceState as l,
  saveWorkspaceState as s
};
