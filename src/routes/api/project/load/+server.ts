import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { loadProjectQuerySchema } from '$lib/server/contracts';
import { ProjectFilesAccessError, loadWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const { configPath } = loadProjectQuerySchema.parse({
      configPath: url.searchParams.get('configPath') ?? undefined
    });
    const state = await loadWorkspaceState(process.cwd(), configPath);
    return json(state);
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid load request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
