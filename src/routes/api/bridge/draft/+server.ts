import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { applyBridgeDraftCommands } from '$lib/server/bridge-draft';
import { ensureBridgeSnapshot } from '$lib/server/bridge-workspace';
import { bridgeState } from '$lib/server/bridge-state';
import { bridgeDraftRequestSchema } from '$lib/server/contracts';
import { ProjectFilesAccessError } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = bridgeDraftRequestSchema.parse(await request.json());
    const { configPath, snapshot } = await ensureBridgeSnapshot(process.cwd(), payload.configPath);
    const nextManifest = applyBridgeDraftCommands(snapshot.manifest, payload.commands);
    const stagedSnapshot = bridgeState.stage(nextManifest, configPath, 'extension');

    return json({
      ok: true,
      version: stagedSnapshot.version,
      draft: stagedSnapshot.draft
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
