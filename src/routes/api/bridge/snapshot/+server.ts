import { json } from '@sveltejs/kit';
import { bridgeState } from '$lib/server/bridge-state';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json(bridgeState.snapshot());
};
