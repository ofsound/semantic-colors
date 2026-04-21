import { loadWorkspaceState } from '$lib/server/project-files';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return loadWorkspaceState(process.cwd());
};
