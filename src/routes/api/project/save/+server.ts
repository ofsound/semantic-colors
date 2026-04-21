import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { saveProjectRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError, saveWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = saveProjectRequestSchema.parse(await request.json());

    await saveWorkspaceState(process.cwd(), payload.configPath, payload.config, payload.manifest);
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid save request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
