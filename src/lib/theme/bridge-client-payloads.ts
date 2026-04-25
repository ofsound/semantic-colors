import { z } from 'zod';
import { themeManifestSchema } from '$lib/theme/theme-manifest-zod';

const bridgeOriginSchema = z.enum(['ui', 'extension', 'server']);

/**
 * Subset of BridgeSnapshot fields the workspace UI consumes from HTTP/SSE.
 * Extra snapshot fields are allowed (.passthrough()) so the server can evolve.
 */
export const bridgeClientSnapshotSchema = z
  .object({
    configPath: z.string(),
    origin: bridgeOriginSchema,
    manifest: themeManifestSchema,
    draft: z
      .object({
        dirty: z.boolean(),
        baseVersion: z.number().optional(),
        lastEditor: bridgeOriginSchema.optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export type BridgeClientSnapshot = z.infer<typeof bridgeClientSnapshotSchema>;

const bridgeSseSnapshotEventSchema = z.object({
  type: z.literal('snapshot'),
  snapshot: bridgeClientSnapshotSchema
});

/**
 * Validates a Server-Sent Events `snapshot` payload (JSON body of the event).
 */
export function parseBridgeSseSnapshotEvent(raw: unknown): BridgeClientSnapshot | null {
  const result = bridgeSseSnapshotEventSchema.safeParse(raw);
  return result.success ? result.data.snapshot : null;
}

/**
 * Validates GET `/api/bridge/snapshot` JSON (full snapshot object).
 */
export function parseBridgeSnapshotResponse(raw: unknown): BridgeClientSnapshot | null {
  const result = bridgeClientSnapshotSchema.safeParse(raw);
  return result.success ? result.data : null;
}
