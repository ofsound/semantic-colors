import { r as saveWorkspaceState } from "../../../../../chunks/project-files.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/project/save/+server.ts
var POST = async ({ request }) => {
	const payload = await request.json();
	await saveWorkspaceState(process.cwd(), payload.configPath, payload.config, payload.manifest);
	return json({
		ok: true,
		savedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
};
//#endregion
export { POST };
