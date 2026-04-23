import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { ensureBridgeSnapshot } from '$lib/server/bridge-workspace';
import { bridgeConfigQuerySchema } from '$lib/server/contracts';
import { ProjectFilesAccessError } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const { configPath } = bridgeConfigQuerySchema.parse({
      configPath: url.searchParams.get('configPath') ?? undefined
    });
    const snapshot = (await ensureBridgeSnapshot(process.cwd(), configPath)).snapshot;
    return json(snapshot);
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid bridge snapshot request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
