import { n as loadProjectQuerySchema } from "../../../../../chunks/contracts.js";
import { r as loadWorkspaceState, t as ProjectFilesAccessError } from "../../../../../chunks/project-files.js";
import { error, json } from "@sveltejs/kit";
import { ZodError } from "zod";
//#region src/routes/api/project/load/+server.ts
var GET = async ({ url }) => {
	try {
		const { configPath } = loadProjectQuerySchema.parse({ configPath: url.searchParams.get("configPath") ?? void 0 });
		return json(await loadWorkspaceState(process.cwd(), configPath));
	} catch (caughtError) {
		if (caughtError instanceof ZodError) throw error(400, caughtError.issues[0]?.message ?? "Invalid load request.");
		if (caughtError instanceof ProjectFilesAccessError) throw error(403, caughtError.message);
		throw caughtError;
	}
};
//#endregion
export { GET };
