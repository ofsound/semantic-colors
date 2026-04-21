import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { bridgeState } from '$lib/server/bridge-state';
import { bridgeCommitRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError, loadWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = bridgeCommitRequestSchema.parse(await request.json());
    const snapshot = bridgeState.snapshot();

    if (payload.configPath && payload.configPath !== snapshot.configPath) {
      const workspace = await loadWorkspaceState(process.cwd(), payload.configPath);
      bridgeState.syncPersisted(workspace.manifest, workspace.configPath, 'server');
    } else if (!snapshot.configPath) {
      const workspace = await loadWorkspaceState(process.cwd(), payload.configPath);
      bridgeState.syncPersisted(workspace.manifest, workspace.configPath, 'server');
    }

    const nextSnapshot = bridgeState.discard('extension');
    return json({
      ok: true,
      version: nextSnapshot.version,
      draft: nextSnapshot.draft
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid discard request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
