import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import { saveProjectRequestSchema } from '$lib/server/contracts';
import { bridgeState } from '$lib/server/bridge-state';
import type { RequestHandler } from './$types';

const publishRequestSchema = saveProjectRequestSchema
  .pick({ configPath: true, manifest: true })
  .extend({
    origin: z.enum(['ui', 'extension', 'server']).optional()
  });

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = publishRequestSchema.parse(await request.json());
    const snapshot = bridgeState.publish(
      payload.manifest,
      payload.configPath,
      payload.origin ?? 'ui'
    );
    return json({ ok: true, version: snapshot.version });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid publish request.');
    }
    throw caughtError;
  }
};
