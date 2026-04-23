import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { ensureBridgeSnapshot } from '$lib/server/bridge-workspace';
import { bridgeState } from '$lib/server/bridge-state';
import { bridgeCommitRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = bridgeCommitRequestSchema.parse(await request.json());
    const { configPath } = await ensureBridgeSnapshot(process.cwd(), payload.configPath);
    const nextSnapshot = bridgeState.discard(configPath, 'extension');
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
