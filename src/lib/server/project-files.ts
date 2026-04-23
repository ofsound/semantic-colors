import { realpathSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDefaultManifest } from '$lib/theme/defaults';
import { generateThemeCss } from '$lib/theme/css';
import { extractImportProposal } from '$lib/theme/importer';
import { projectConfigSchema, themeManifestSchema } from '$lib/server/contracts';
import type { ImportProposal, ProjectConfig, ThemeManifest } from '$lib/theme/schema';
import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';

const SESSION_DIR = '.semantic-colors';
const SESSION_PATH = path.join(SESSION_DIR, 'session.json');
const DEFAULT_CONFIG_PATH = 'semantic-colors.project.json';

interface SessionState {
  configPath: string;
}

export class ProjectFilesAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFilesAccessError';
  }
}

async function safeReadText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function canonicalizePath(targetPath: string): string {
  const resolvedPath = path.resolve(targetPath);
  try {
    return realpathSync.native(resolvedPath);
  } catch {
    try {
      return path.join(
        realpathSync.native(path.dirname(resolvedPath)),
        path.basename(resolvedPath)
      );
    } catch {
      return resolvedPath;
    }
  }
}

function isPathWithin(root: string, targetPath: string): boolean {
  const relativePath = path.relative(canonicalizePath(root), canonicalizePath(targetPath));
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function assertPathWithin(root: string, targetPath: string, label: string): void {
  if (!isPathWithin(root, targetPath)) {
    throw new ProjectFilesAccessError(`${label} must stay within ${canonicalizePath(root)}.`);
  }
}

function resolvePath(basePath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return path.resolve(targetPath);
  }
  return path.resolve(path.dirname(basePath), targetPath);
}

function resolveConfigPath(cwd: string, configPath?: string): string {
  const resolvedConfigPath = configPath
    ? path.isAbsolute(configPath)
      ? path.resolve(configPath)
      : path.resolve(cwd, configPath)
    : defaultConfigPath(cwd);

  const canonicalConfigPath = canonicalizePath(resolvedConfigPath);
  assertPathWithin(cwd, canonicalConfigPath, 'Config path');
  return canonicalConfigPath;
}

function resolveProjectRoot(configPath: string, projectRoot: string): string {
  if (!projectRoot) {
    return path.dirname(configPath);
  }

  return resolvePath(configPath, projectRoot);
}

function resolveProjectPath(projectRoot: string, targetPath: string, label: string): string {
  const resolvedTargetPath = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(projectRoot, targetPath);

  assertPathWithin(projectRoot, resolvedTargetPath, label);
  return resolvedTargetPath;
}

function defaultConfigPath(cwd: string): string {
  return path.join(cwd, DEFAULT_CONFIG_PATH);
}

export function resolveWorkspaceConfigPath(cwd: string, configPath?: string): string {
  return resolveConfigPath(cwd, configPath);
}

async function readSession(cwd: string): Promise<SessionState> {
  const sessionFilePath = path.join(cwd, SESSION_PATH);
  const raw = await safeReadText(sessionFilePath);
  if (!raw) {
    return {
      configPath: defaultConfigPath(cwd)
    };
  }

  try {
    const parsed = JSON.parse(raw) as SessionState;
    return {
      configPath: parsed.configPath || defaultConfigPath(cwd)
    };
  } catch {
    return {
      configPath: defaultConfigPath(cwd)
    };
  }
}

async function writeSession(cwd: string, configPath: string): Promise<void> {
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

function configWithDefaults(projectRoot: string, config?: Partial<ProjectConfig>): ProjectConfig {
  return {
    ...DEFAULT_PROJECT_CONFIG,
    projectRoot,
    ...config,
    version: 1
  };
}

export async function loadWorkspaceState(cwd: string, requestedConfigPath?: string) {
  const session = await readSession(cwd);
  const configPath = resolveConfigPath(cwd, requestedConfigPath || session.configPath);
  const rawConfig = await safeReadText(configPath);

  let config = configWithDefaults(path.dirname(configPath));
  if (rawConfig) {
    try {
      const parsed = projectConfigSchema.parse(JSON.parse(rawConfig));
      config = configWithDefaults(path.dirname(configPath), parsed);
    } catch {
      config = configWithDefaults(path.dirname(configPath));
    }
  }

  const projectRoot = resolveProjectRoot(configPath, config.projectRoot);
  const manifestPath = resolveProjectPath(projectRoot, config.manifestPath, 'Manifest path');
  const rawManifest = await safeReadText(manifestPath);

  let manifest: ThemeManifest = createDefaultManifest();
  if (rawManifest) {
    try {
      manifest = themeManifestSchema.parse(JSON.parse(rawManifest));
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

export async function saveWorkspaceState(
  cwd: string,
  configPathInput: string,
  config: ProjectConfig,
  manifest: ThemeManifest
): Promise<void> {
  const configPath = resolveConfigPath(cwd, configPathInput);
  const normalizedConfig = configWithDefaults(path.dirname(configPath), config);
  const projectRoot = resolveProjectRoot(configPath, normalizedConfig.projectRoot);
  const manifestPath = resolveProjectPath(
    projectRoot,
    normalizedConfig.manifestPath,
    'Manifest path'
  );
  const cssOutputPath = resolveProjectPath(
    projectRoot,
    normalizedConfig.cssOutputPath,
    'CSS output path'
  );
  const css = generateThemeCss(manifest);

  await ensureParent(configPath);
  await writeFile(configPath, JSON.stringify(normalizedConfig, null, 2));
  await ensureParent(manifestPath);
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...manifest,
        updatedAt: new Date().toISOString()
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

export async function updateWorkspaceBridgeEnabled(
  cwd: string,
  configPathInput: string,
  bridgeEnabled: boolean
): Promise<{ configPath: string; bridgeEnabled: boolean }> {
  const { configPath, config, manifest } = await loadWorkspaceState(cwd, configPathInput);
  const nextConfig = configWithDefaults(path.dirname(configPath), { ...config, bridgeEnabled });
  const projectRoot = resolveProjectRoot(configPath, nextConfig.projectRoot);
  const cssOutputPath = resolveProjectPath(
    projectRoot,
    nextConfig.cssOutputPath,
    'CSS output path'
  );

  await ensureParent(configPath);
  await writeFile(configPath, JSON.stringify(nextConfig, null, 2));

  if (nextConfig.bridgeEnabled) {
    const css = generateThemeCss(manifest);
    await ensureParent(cssOutputPath);
    await writeFile(cssOutputPath, css);
  }

  await writeSession(cwd, configPath);

  return {
    configPath,
    bridgeEnabled: nextConfig.bridgeEnabled
  };
}

export async function importFromCss(
  cwd: string,
  configPathInput: string,
  sourcePath: string
): Promise<ImportProposal> {
  const { config, configPath } = await loadWorkspaceState(cwd, configPathInput);
  const projectRoot = resolveProjectRoot(configPath, config.projectRoot);
  const resolvedSourcePath = resolveProjectPath(projectRoot, sourcePath, 'Import source path');
  const css = await readFile(resolvedSourcePath, 'utf8');
  return extractImportProposal(resolvedSourcePath, css);
}
