import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultManifest } from '$lib/theme/defaults';
import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
import { ProjectFilesAccessError, importFromCss, saveWorkspaceState } from './project-files';

const tempDirs: string[] = [];

async function createTempWorkspace(): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'semantic-colors-'));
  tempDirs.push(tempDir);
  return tempDir;
}

describe('project file guards', () => {
  afterEach(async () => {
    await Promise.allSettled(
      tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
    );
  });

  it('rejects config paths outside the workspace root', async () => {
    const cwd = await createTempWorkspace();

    await expect(
      saveWorkspaceState(
        cwd,
        '../escape.project.json',
        DEFAULT_PROJECT_CONFIG,
        createDefaultManifest()
      )
    ).rejects.toBeInstanceOf(ProjectFilesAccessError);
  });

  it('rejects writes that escape the configured project root', async () => {
    const cwd = await createTempWorkspace();
    const configPath = path.join(cwd, 'semantic-colors.project.json');

    await expect(
      saveWorkspaceState(
        cwd,
        configPath,
        {
          ...DEFAULT_PROJECT_CONFIG,
          manifestPath: '../escape.manifest.json'
        },
        createDefaultManifest()
      )
    ).rejects.toBeInstanceOf(ProjectFilesAccessError);
  });

  it('rejects imports that escape the configured project root', async () => {
    const cwd = await createTempWorkspace();
    const projectRoot = path.join(cwd, 'target-project');
    const configPath = path.join(cwd, 'semantic-colors.project.json');

    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      configPath,
      JSON.stringify(
        {
          ...DEFAULT_PROJECT_CONFIG,
          projectRoot
        },
        null,
        2
      )
    );

    await expect(importFromCss(cwd, configPath, '../escape.css')).rejects.toBeInstanceOf(
      ProjectFilesAccessError
    );
  });
});
