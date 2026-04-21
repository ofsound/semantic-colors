import { json } from '@sveltejs/kit';
import { saveWorkspaceState } from '$lib/server/project-files';
import type { RequestHandler } from './$types';
import type { ProjectConfig, ThemeManifest } from '$lib/theme/schema';

export const POST: RequestHandler = async ({ request }) => {
  const payload = (await request.json()) as {
    configPath: string;
    config: ProjectConfig;
    manifest: ThemeManifest;
  };

  await saveWorkspaceState(process.cwd(), payload.configPath, payload.config, payload.manifest);
  return json({ ok: true, savedAt: new Date().toISOString() });
};
