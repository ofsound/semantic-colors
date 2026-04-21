import { bridgeState } from '$lib/server/bridge-state';
import type { BridgeEvent } from '$lib/server/bridge-state';
import type { RequestHandler } from './$types';

function formatEvent(event: BridgeEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const GET: RequestHandler = async () => {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));
      unsubscribe = bridgeState.subscribe((event) => {
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
};
