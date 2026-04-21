import { json } from '@sveltejs/kit';
import { importFromCss } from '$lib/server/project-files';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const payload = (await request.json()) as {
    configPath: string;
    sourcePath: string;
  };

  const proposal = await importFromCss(payload.configPath, payload.sourcePath);
  return json(proposal);
};
