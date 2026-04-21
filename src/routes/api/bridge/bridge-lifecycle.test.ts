import { readFile, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bridgeState } from '$lib/server/bridge-state';
import { createDefaultManifest } from '$lib/theme/defaults';
import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
import { saveWorkspaceState } from '$lib/server/project-files';
import { POST as commitDraft } from './commit/+server';
import { POST as discardDraft } from './discard/+server';
import { POST as stageDraft } from './draft/+server';
import { POST as overrideToken } from './token/+server';

const tempDirs: string[] = [];
const originalCwd = process.cwd();

async function createWorkspace(): Promise<{
  cwd: string;
  configPath: string;
  requestConfigPath: string;
  manifestPath: string;
}> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'semantic-colors-bridge-'));
  tempDirs.push(cwd);
  const configPath = path.join(cwd, 'semantic-colors.project.json');
  await saveWorkspaceState(cwd, configPath, DEFAULT_PROJECT_CONFIG, createDefaultManifest());
  return {
    cwd,
    configPath,
    requestConfigPath: 'semantic-colors.project.json',
    manifestPath: path.join(cwd, DEFAULT_PROJECT_CONFIG.manifestPath)
  };
}

async function readManifest(manifestPath: string) {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as ReturnType<
    typeof createDefaultManifest
  >;
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

    const staged = bridgeState.snapshot();
    expect(staged.draft.dirty).toBe(true);
    expect(staged.manifest.tokens.accent.light.h).toBe(310);

    const onDisk = await readManifest(workspace.manifestPath);
    expect(onDisk.tokens.accent.light.h).not.toBe(310);

    await discardDraft({
      request: request({
        configPath: workspace.requestConfigPath
      })
    } as never);

    const discarded = bridgeState.snapshot();
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

    const committed = bridgeState.snapshot();
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
    expect(bridgeState.snapshot().draft.dirty).toBe(true);
    expect(bridgeState.snapshot().manifest.tokens.link.light.h).toBe(245);
    expect(bridgeState.snapshot().manifest.tokens.link.dark.h).toBe(245);
  });
});
