import { t as importProjectRequestSchema } from "../../../../../chunks/contracts.js";
import { n as importFromCss, t as ProjectFilesAccessError } from "../../../../../chunks/project-files.js";
import { error, json } from "@sveltejs/kit";
import { ZodError } from "zod";
//#region src/routes/api/project/import/+server.ts
var POST = async ({ request }) => {
	try {
		const payload = importProjectRequestSchema.parse(await request.json());
		return json(await importFromCss(process.cwd(), payload.configPath, payload.sourcePath));
	} catch (caughtError) {
		if (caughtError instanceof ZodError) throw error(400, caughtError.issues[0]?.message ?? "Invalid import request.");
		if (caughtError instanceof ProjectFilesAccessError) throw error(403, caughtError.message);
		throw caughtError;
	}
};
//#endregion
export { POST };
