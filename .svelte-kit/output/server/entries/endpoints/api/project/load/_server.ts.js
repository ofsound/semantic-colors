import { n as loadWorkspaceState } from "../../../../../chunks/project-files.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/project/load/+server.ts
var GET = async ({ url }) => {
	const configPath = url.searchParams.get("configPath") ?? void 0;
	return json(await loadWorkspaceState(process.cwd(), configPath));
};
//#endregion
export { GET };
