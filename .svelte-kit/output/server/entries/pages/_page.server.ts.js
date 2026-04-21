import { n as loadWorkspaceState } from "../../chunks/project-files.js";
//#region src/routes/+page.server.ts
var load = async () => {
	return loadWorkspaceState(process.cwd());
};
//#endregion
export { load };
