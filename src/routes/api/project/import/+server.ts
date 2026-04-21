import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { importProjectRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError, importFromCss } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = importProjectRequestSchema.parse(await request.json());

    const proposal = await importFromCss(process.cwd(), payload.configPath, payload.sourcePath);
    return json(proposal);
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid import request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
