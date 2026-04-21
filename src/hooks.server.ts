import type { Handle } from '@sveltejs/kit';

const BRIDGE_PREFIX = '/api/bridge/';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '600'
};

function applyCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const handle: Handle = async ({ event, resolve }) => {
  const isBridge = event.url.pathname.startsWith(BRIDGE_PREFIX);

  if (isBridge && event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  const response = await resolve(event);
  if (isBridge) {
    return applyCorsHeaders(response);
  }
  return response;
};
