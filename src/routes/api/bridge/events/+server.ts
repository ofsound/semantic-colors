import { error } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { ensureBridgeSnapshot } from '$lib/server/bridge-workspace';
import { bridgeState } from '$lib/server/bridge-state';
import { bridgeConfigQuerySchema } from '$lib/server/contracts';
import { ProjectFilesAccessError } from '$lib/server/project-files';
import type { BridgeEvent } from '$lib/server/bridge-state';
import type { RequestHandler } from './$types';

function formatEvent(event: BridgeEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const { configPath } = bridgeConfigQuerySchema.parse({
      configPath: url.searchParams.get('configPath') ?? undefined
    });
    const { configPath: resolvedConfigPath } = await ensureBridgeSnapshot(
      process.cwd(),
      configPath
    );

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(': connected\n\n'));
        unsubscribe = bridgeState.subscribe(resolvedConfigPath, (event) => {
          try {
            controller.enqueue(encoder.encode(formatEvent(event)));
          } catch {
            unsubscribe?.();
          }
        });
      },
      cancel() {
        unsubscribe?.();
        unsubscribe = null;
      }
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no'
      }
    });
  } catch (caughtError) {
    if (caughtError instanceof ZodError) {
      throw error(400, caughtError.issues[0]?.message ?? 'Invalid bridge event request.');
    }

    if (caughtError instanceof ProjectFilesAccessError) {
      throw error(403, caughtError.message);
    }

    throw caughtError;
  }
};
