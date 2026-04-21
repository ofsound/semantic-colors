// @ts-nocheck
import { loadWorkspaceState } from '$lib/server/project-files';
import type { PageServerLoad } from './$types';

export const load = async () => {
  return loadWorkspaceState(process.cwd());
};
;null as any as PageServerLoad;