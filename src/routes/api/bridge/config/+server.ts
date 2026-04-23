import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { bridgeConfigQuerySchema, bridgeConfigUpdateRequestSchema } from '$lib/server/contracts';
import {
  ProjectFilesAccessError,
  loadWorkspaceState,
  updateWorkspaceBridgeEnabled
} from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const { configPath } = bridgeConfigQuerySchema.parse({
      configPath: url.searchParams.get('configPath') ?? undefined
    });
    const workspace = await loadWorkspaceState(process.cwd(), configPath);
    return json({
      configPath: workspace.configPath,
      bridgeEnabled: workspace.config.bridgeEnabled
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid bridge config request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = bridgeConfigUpdateRequestSchema.parse(await request.json());
    const nextConfig = await updateWorkspaceBridgeEnabled(
      process.cwd(),
      payload.configPath,
      payload.bridgeEnabled
    );
    return json({
      ok: true,
      configPath: nextConfig.configPath,
      bridgeEnabled: nextConfig.bridgeEnabled
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid bridge config update request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
