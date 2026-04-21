import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDefaultManifest } from '$lib/theme/defaults';
import { generateThemeCss } from '$lib/theme/css';
import { extractImportProposal } from '$lib/theme/importer';
import type { ImportProposal, ProjectConfig, ThemeManifest } from '$lib/theme/schema';
import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';

const SESSION_DIR = '.semantic-colors';
const SESSION_PATH = path.join(SESSION_DIR, 'session.json');
const DEFAULT_CONFIG_PATH = 'semantic-colors.project.json';

interface SessionState {
  configPath: string;
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

function resolvePath(basePath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(path.dirname(basePath), targetPath);
}

function resolveProjectPath(configPath: string, projectRoot: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  const root = projectRoot ? resolvePath(configPath, projectRoot) : path.dirname(configPath);
  return path.resolve(root, targetPath);
}

function defaultConfigPath(cwd: string): string {
  return path.join(cwd, DEFAULT_CONFIG_PATH);
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
  const configPath = requestedConfigPath || session.configPath;
  const rawConfig = await safeReadText(configPath);

  let config = configWithDefaults(path.dirname(configPath));
  if (rawConfig) {
    try {
      const parsed = JSON.parse(rawConfig) as Partial<ProjectConfig>;
      config = configWithDefaults(path.dirname(configPath), parsed);
    } catch {
      config = configWithDefaults(path.dirname(configPath));
    }
  }

  const manifestPath = resolveProjectPath(configPath, config.projectRoot, config.manifestPath);
  const rawManifest = await safeReadText(manifestPath);

  let manifest: ThemeManifest = createDefaultManifest();
  if (rawManifest) {
    try {
      manifest = {
        ...createDefaultManifest(),
        ...(JSON.parse(rawManifest) as ThemeManifest)
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

export async function saveWorkspaceState(
  cwd: string,
  configPath: string,
  config: ProjectConfig,
  manifest: ThemeManifest
): Promise<void> {
  const normalizedConfig = configWithDefaults(path.dirname(configPath), config);
  const manifestPath = resolveProjectPath(
    configPath,
    normalizedConfig.projectRoot,
    normalizedConfig.manifestPath
  );
  const cssOutputPath = resolveProjectPath(
    configPath,
    normalizedConfig.projectRoot,
    normalizedConfig.cssOutputPath
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

export async function importFromCss(
  configPath: string,
  sourcePath: string
): Promise<ImportProposal> {
  const configRoot = path.dirname(configPath);
  const resolvedSourcePath = resolveProjectPath(configPath, configRoot, sourcePath);
  const css = await readFile(resolvedSourcePath, 'utf8');
  return extractImportProposal(resolvedSourcePath, css);
}
