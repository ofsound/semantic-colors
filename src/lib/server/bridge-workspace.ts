import { bridgeState } from '$lib/server/bridge-state';
import { loadWorkspaceState, resolveWorkspaceConfigPath } from '$lib/server/project-files';
import type { BridgeOrigin, BridgeSnapshot } from '$lib/server/bridge-state';

interface BridgeWorkspaceSnapshot {
  configPath: string;
  snapshot: BridgeSnapshot;
}

export async function ensureBridgeSnapshot(
  cwd: string,
  requestedConfigPath: string,
  origin: BridgeOrigin = 'server'
): Promise<BridgeWorkspaceSnapshot> {
  const configPath = resolveWorkspaceConfigPath(cwd, requestedConfigPath);
  const existing = bridgeState.snapshot(configPath);
  if (existing) {
    return {
      configPath,
      snapshot: existing
    };
  }

  const workspace = await loadWorkspaceState(cwd, configPath);
  return {
    configPath: workspace.configPath,
    snapshot: bridgeState.syncPersisted(workspace.manifest, workspace.configPath, origin)
  };
}
