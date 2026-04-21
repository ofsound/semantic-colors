import { r as saveProjectRequestSchema } from "../../../../../chunks/contracts.js";
import { i as saveWorkspaceState, t as ProjectFilesAccessError } from "../../../../../chunks/project-files.js";
import { error, json } from "@sveltejs/kit";
import { ZodError } from "zod";
//#region src/routes/api/project/save/+server.ts
var POST = async ({ request }) => {
	try {
		const payload = saveProjectRequestSchema.parse(await request.json());
		await saveWorkspaceState(process.cwd(), payload.configPath, payload.config, payload.manifest);
		return json({
			ok: true,
			savedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
	} catch (caughtError) {
		if (caughtError instanceof ZodError) throw error(400, caughtError.issues[0]?.message ?? "Invalid save request.");
		if (caughtError instanceof ProjectFilesAccessError) throw error(403, caughtError.message);
		throw caughtError;
	}
};
//#endregion
export { POST };
