import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { bridgeState } from '$lib/server/bridge-state';
import {
  ProjectFilesAccessError,
  loadWorkspaceState,
  saveWorkspaceState
} from '$lib/server/project-files';
import { ALL_TOKEN_IDS } from '$lib/theme/schema';
import type { OklchColor, ThemeManifest, TokenId } from '$lib/theme/schema';
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

function applyOverride(
  manifest: ThemeManifest,
  tokenId: TokenId,
  mode: 'light' | 'dark' | 'both',
  color: OklchColor
): ThemeManifest {
  const next: ThemeManifest = {
    ...manifest,
    tokens: { ...manifest.tokens }
  };
  const existing = next.tokens[tokenId];
  if (!existing) {
    return next;
  }
  const updated = { ...existing };
  if (mode === 'light' || mode === 'both') {
    updated.light = { ...color };
  }
  if (mode === 'dark' || mode === 'both') {
    updated.dark = { ...color };
  }
  next.tokens[tokenId] = updated;
  next.updatedAt = new Date().toISOString();
  return next;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = tokenRequestSchema.parse(await request.json());
    const current = bridgeState.snapshot();
    const nextManifest = applyOverride(
      current.manifest,
      payload.tokenId,
      payload.mode,
      payload.color
    );

    const configPath = payload.configPath || current.configPath;

    if (payload.persist && configPath) {
      const workspace = await loadWorkspaceState(process.cwd(), configPath);
      await saveWorkspaceState(process.cwd(), workspace.configPath, workspace.config, nextManifest);
    }

    const snapshot = bridgeState.publish(nextManifest, configPath, 'extension');
    return json({ ok: true, version: snapshot.version, persisted: Boolean(payload.persist) });
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
