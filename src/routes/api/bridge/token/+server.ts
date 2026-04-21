import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { applyBridgeDraftCommands, createTokenColorCommand } from '$lib/server/bridge-draft';
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
    configPath: z.string().optional()
  })
  .strict();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = tokenRequestSchema.parse(await request.json());
    let current = bridgeState.snapshot();
    const configPath = payload.configPath || current.configPath;

    if (!current.configPath || (configPath && current.configPath !== configPath)) {
      const workspace = await loadWorkspaceState(process.cwd(), configPath);
      current = bridgeState.syncPersisted(workspace.manifest, workspace.configPath, 'server');
    }

    const nextManifest = applyBridgeDraftCommands(current.manifest, [
      createTokenColorCommand(payload.tokenId, payload.mode, payload.color)
    ]);

    if (payload.persist && !configPath) {
      throw error(400, 'Persisted overrides require an active project config path.');
    }

    const stagedSnapshot = bridgeState.stage(nextManifest, configPath, 'extension');

    if (payload.persist && configPath) {
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
