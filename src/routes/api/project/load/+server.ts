import { json } from '@sveltejs/kit';
import { loadWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const configPath = url.searchParams.get('configPath') ?? undefined;
  const state = await loadWorkspaceState(process.cwd(), configPath);
  return json(state);
};
