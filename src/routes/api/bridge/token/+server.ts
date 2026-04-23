import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { applyBridgeDraftCommands, createTokenColorCommand } from '$lib/server/bridge-draft';
import { ensureBridgeSnapshot } from '$lib/server/bridge-workspace';
import { bridgeState } from '$lib/server/bridge-state';
import {
  ProjectFilesAccessError,
  loadWorkspaceState,
  saveWorkspaceState
} from '$lib/server/project-files';
import { ALL_TOKEN_IDS } from '$lib/theme/schema';
import type { TokenId } from '$lib/theme/schema';
import type { RequestHandler } from './$types';

const oklchSchema = z
  .object({
    l: z.number().finite(),
    c: z.number().finite(),
    h: z.number().finite(),
    alpha: z.number().finite().optional()
  })
  .strict();

const tokenRequestSchema = z
  .object({
    tokenId: z.custom<TokenId>(
      (value) => typeof value === 'string' && ALL_TOKEN_IDS.includes(value as TokenId),
      'Unknown token id'
    ),
    mode: z.enum(['light', 'dark', 'both']),
    color: oklchSchema,
    persist: z.boolean().optional(),
    configPath: z.string().trim().min(1)
  })
  .strict();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = tokenRequestSchema.parse(await request.json());
    const { configPath, snapshot } = await ensureBridgeSnapshot(process.cwd(), payload.configPath);

    const nextManifest = applyBridgeDraftCommands(snapshot.manifest, [
      createTokenColorCommand(payload.tokenId, payload.mode, payload.color)
    ]);

    const stagedSnapshot = bridgeState.stage(nextManifest, configPath, 'extension');

    if (payload.persist) {
      const workspace = await loadWorkspaceState(process.cwd(), configPath);
      await saveWorkspaceState(
        process.cwd(),
        workspace.configPath,
        workspace.config,
        stagedSnapshot.manifest
      );
      const committed = bridgeState.syncPersisted(stagedSnapshot.manifest, configPath, 'extension');
      return json({
        ok: true,
        version: committed.version,
        persisted: true
      });
    }

    return json({
      ok: true,
      version: stagedSnapshot.version,
      persisted: false
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid token override request.');
    }
    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }
    throw caughtError;
  }
};
