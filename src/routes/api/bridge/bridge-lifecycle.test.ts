import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bridgeState } from '$lib/server/bridge-state';
import { createDefaultManifest } from '$lib/theme/defaults';
import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
import { resolveWorkspaceConfigPath, saveWorkspaceState } from '$lib/server/project-files';
import { POST as commitDraft } from './commit/+server';
import { POST as updateBridgeConfig } from './config/+server';
import { POST as discardDraft } from './discard/+server';
import { POST as stageDraft } from './draft/+server';
import { POST as overrideToken } from './token/+server';

const tempDirs: string[] = [];
const originalCwd = process.cwd();

async function createWorkspace(
  cwd?: string,
  relativeDir = ''
): Promise<{
  cwd: string;
  configPath: string;
  requestConfigPath: string;
  manifestPath: string;
}> {
  const resolvedCwd = cwd ?? (await mkdtemp(path.join(os.tmpdir(), 'semantic-colors-bridge-')));
  if (!tempDirs.includes(resolvedCwd)) {
    tempDirs.push(resolvedCwd);
  }

  const workspaceDir = relativeDir ? path.join(resolvedCwd, relativeDir) : resolvedCwd;
  await mkdir(workspaceDir, { recursive: true });
  const configPath = resolveWorkspaceConfigPath(
    resolvedCwd,
    path.join(workspaceDir, 'semantic-colors.project.json')
  );
  await saveWorkspaceState(
    resolvedCwd,
    configPath,
    DEFAULT_PROJECT_CONFIG,
    createDefaultManifest()
  );
  return {
    cwd: resolvedCwd,
    configPath,
    requestConfigPath: configPath,
    manifestPath: path.join(workspaceDir, DEFAULT_PROJECT_CONFIG.manifestPath)
  };
}

async function readManifest(manifestPath: string) {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as ReturnType<
    typeof createDefaultManifest
  >;
}

async function readProjectConfig(configPath: string) {
  return JSON.parse(await readFile(configPath, 'utf8')) as typeof DEFAULT_PROJECT_CONFIG;
}

function request(body: unknown): Request {
  return new Request('http://localhost/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('bridge draft lifecycle routes', () => {
  beforeEach(() => {
    bridgeState.reset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    bridgeState.reset();
    await Promise.allSettled(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

  it('stages draft changes without persisting them to disk, then discards back to base', async () => {
    const workspace = await createWorkspace();
    process.chdir(workspace.cwd);

    await stageDraft({
      request: request({
        configPath: workspace.requestConfigPath,
        commands: [
          {
            kind: 'update-token-color',
            tokenId: 'accent',
            mode: 'light',
            color: { l: 0.77, c: 0.2, h: 310 }
          }
        ]
      })
    } as never);

    const staged = bridgeState.snapshot(workspace.configPath);
    expect(staged).not.toBeNull();
    if (!staged) throw new Error('Expected staged snapshot');
    expect(staged.draft.dirty).toBe(true);
    expect(staged.manifest.tokens.accent.light.h).toBe(310);

    const onDisk = await readManifest(workspace.manifestPath);
    expect(onDisk.tokens.accent.light.h).not.toBe(310);

    await discardDraft({
      request: request({
        configPath: workspace.requestConfigPath
      })
    } as never);

    const discarded = bridgeState.snapshot(workspace.configPath);
    expect(discarded).not.toBeNull();
    if (!discarded) throw new Error('Expected discarded snapshot');
    expect(discarded.draft.dirty).toBe(false);
    expect(discarded.manifest.tokens.accent.light.h).toBe(onDisk.tokens.accent.light.h);
  });

  it('commits a staged draft and clears dirty state', async () => {
    const workspace = await createWorkspace();
    process.chdir(workspace.cwd);

    await stageDraft({
      request: request({
        configPath: workspace.requestConfigPath,
        commands: [
          {
            kind: 'update-alt-settings',
            patch: {
              source: 'dark',
              delta: { h: 18 }
            }
          }
        ]
      })
    } as never);

    await commitDraft({
      request: request({
        configPath: workspace.requestConfigPath
      })
    } as never);

    const committed = bridgeState.snapshot(workspace.configPath);
    expect(committed).not.toBeNull();
    if (!committed) throw new Error('Expected committed snapshot');
    expect(committed.draft.dirty).toBe(false);
    expect(committed.manifest.alt.source).toBe('dark');
    expect(committed.manifest.alt.delta.h).toBe(18);

    const onDisk = await readManifest(workspace.manifestPath);
    expect(onDisk.alt.source).toBe('dark');
    expect(onDisk.alt.delta.h).toBe(18);
  });

  it('keeps /api/bridge/token compatible by staging through the draft flow', async () => {
    const workspace = await createWorkspace();
    process.chdir(workspace.cwd);

    const response = await overrideToken({
      request: request({
        configPath: workspace.requestConfigPath,
        tokenId: 'link',
        mode: 'both',
        color: { l: 0.55, c: 0.22, h: 245 },
        persist: false
      })
    } as never);

    expect(response.status).toBe(200);
    const snapshot = bridgeState.snapshot(workspace.configPath);
    expect(snapshot).not.toBeNull();
    if (!snapshot) throw new Error('Expected token override snapshot');
    expect(snapshot.draft.dirty).toBe(true);
    expect(snapshot.manifest.tokens.link.light.h).toBe(245);
    expect(snapshot.manifest.tokens.link.dark.h).toBe(245);
  });

  it('isolates draft state by config path across multiple workspaces', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'semantic-colors-bridge-multi-'));
    tempDirs.push(root);
    const workspaceA = await createWorkspace(root, 'site-a');
    const workspaceB = await createWorkspace(root, 'site-b');
    const base = createDefaultManifest();
    process.chdir(root);

    await stageDraft({
      request: request({
        configPath: workspaceA.requestConfigPath,
        commands: [
          {
            kind: 'update-token-color',
            tokenId: 'accent',
            mode: 'light',
            color: { l: 0.77, c: 0.2, h: 310 }
          }
        ]
      })
    } as never);

    await stageDraft({
      request: request({
        configPath: workspaceB.requestConfigPath,
        commands: [
          {
            kind: 'update-token-color',
            tokenId: 'link',
            mode: 'both',
            color: { l: 0.55, c: 0.22, h: 245 }
          }
        ]
      })
    } as never);

    const snapshotA = bridgeState.snapshot(workspaceA.configPath);
    const snapshotB = bridgeState.snapshot(workspaceB.configPath);
    expect(snapshotA).not.toBeNull();
    expect(snapshotB).not.toBeNull();
    if (!snapshotA || !snapshotB) throw new Error('Expected isolated snapshots');
    expect(snapshotA.draft.dirty).toBe(true);
    expect(snapshotB.draft.dirty).toBe(true);
    expect(snapshotA.manifest.tokens.accent.light.h).toBe(310);
    expect(snapshotA.manifest.tokens.link.light.h).toBe(base.tokens.link.light.h);
    expect(snapshotB.manifest.tokens.link.light.h).toBe(245);
    expect(snapshotB.manifest.tokens.accent.light.h).toBe(base.tokens.accent.light.h);

    await commitDraft({
      request: request({
        configPath: workspaceA.requestConfigPath
      })
    } as never);

    const onDiskA = await readManifest(workspaceA.manifestPath);
    const onDiskB = await readManifest(workspaceB.manifestPath);
    const snapshotBAfterCommit = bridgeState.snapshot(workspaceB.configPath);
    expect(onDiskA.tokens.accent.light.h).toBe(310);
    expect(onDiskB.tokens.link.light.h).toBe(base.tokens.link.light.h);
    expect(snapshotBAfterCommit?.draft.dirty).toBe(true);
  });

  it('updates bridge output setting without rewriting manifest content', async () => {
    const workspace = await createWorkspace();
    process.chdir(workspace.cwd);
    const manifestBefore = await readFile(workspace.manifestPath, 'utf8');

    const enableResponse = await updateBridgeConfig({
      request: request({
        configPath: workspace.requestConfigPath,
        bridgeEnabled: true
      })
    } as never);

    expect(enableResponse.status).toBe(200);
    const enabledConfig = await readProjectConfig(workspace.configPath);
    expect(enabledConfig.bridgeEnabled).toBe(true);
    const cssOutputPath = path.resolve(
      path.dirname(workspace.configPath),
      enabledConfig.cssOutputPath
    );
    const generatedCss = await readFile(cssOutputPath, 'utf8');
    expect(generatedCss).toContain(":root[data-theme='light']");
    expect(await readFile(workspace.manifestPath, 'utf8')).toBe(manifestBefore);

    const disableResponse = await updateBridgeConfig({
      request: request({
        configPath: workspace.requestConfigPath,
        bridgeEnabled: false
      })
    } as never);

    expect(disableResponse.status).toBe(200);
    const disabledConfig = await readProjectConfig(workspace.configPath);
    expect(disabledConfig.bridgeEnabled).toBe(false);
    expect(await readFile(workspace.manifestPath, 'utf8')).toBe(manifestBefore);
  });
});
