import { json } from "@sveltejs/kit";
import { l as loadWorkspaceState } from "../../../../../chunks/project-files.js";
const GET = async ({ url }) => {
  const configPath = url.searchParams.get("configPath") ?? void 0;
  const state = await loadWorkspaceState(process.cwd(), configPath);
  return json(state);
};
export {
  GET
};
