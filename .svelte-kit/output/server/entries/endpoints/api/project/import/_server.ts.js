import { t as importFromCss } from "../../../../../chunks/project-files.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/project/import/+server.ts
var POST = async ({ request }) => {
	const payload = await request.json();
	return json(await importFromCss(payload.configPath, payload.sourcePath));
};
//#endregion
export { POST };
