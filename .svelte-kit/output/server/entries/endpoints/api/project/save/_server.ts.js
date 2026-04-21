import { json } from "@sveltejs/kit";
import { s as saveWorkspaceState } from "../../../../../chunks/project-files.js";
const POST = async ({ request }) => {
  const payload = await request.json();
  await saveWorkspaceState(process.cwd(), payload.configPath, payload.config, payload.manifest);
  return json({ ok: true, savedAt: (/* @__PURE__ */ new Date()).toISOString() });
};
export {
  POST
};
