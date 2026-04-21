import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { applyBridgeDraftCommands } from '$lib/server/bridge-draft';
import { bridgeState } from '$lib/server/bridge-state';
import { bridgeDraftRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError, loadWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

async function ensureActiveSnapshot(configPath?: string) {
  const current = bridgeState.snapshot();
  if (current.configPath && (!configPath || current.configPath === configPath)) {
    return current;
  }

  const workspace = await loadWorkspaceState(process.cwd(), configPath);
  return bridgeState.syncPersisted(workspace.manifest, workspace.configPath, 'server');
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = bridgeDraftRequestSchema.parse(await request.json());
    const current = await ensureActiveSnapshot(payload.configPath);
    const nextManifest = applyBridgeDraftCommands(current.manifest, payload.commands);
    const snapshot = bridgeState.stage(
      nextManifest,
      payload.configPath ?? current.configPath,
      'extension'
    );

    return json({
      ok: true,
      version: snapshot.version,
      draft: snapshot.draft
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid draft request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
