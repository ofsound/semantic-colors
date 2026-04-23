import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { saveProjectRequestSchema } from '$lib/server/contracts';
import { bridgeState } from '$lib/server/bridge-state';
import { ProjectFilesAccessError, resolveWorkspaceConfigPath } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

const publishRequestSchema = saveProjectRequestSchema
  .pick({ configPath: true, manifest: true })
  .extend({
    origin: z.enum(['ui', 'extension', 'server']).optional(),
    persisted: z.boolean().optional()
  });

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = publishRequestSchema.parse(await request.json());
    const origin = payload.origin ?? 'ui';
    const configPath = resolveWorkspaceConfigPath(process.cwd(), payload.configPath);
    const snapshot = payload.persisted
      ? bridgeState.syncPersisted(payload.manifest, configPath, origin)
      : bridgeState.stage(payload.manifest, configPath, origin);
    return json({ ok: true, version: snapshot.version });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid publish request.');
    }
    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }
    throw caughtError;
  }
};
