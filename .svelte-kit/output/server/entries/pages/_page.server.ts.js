import { l as loadWorkspaceState } from "../../chunks/project-files.js";
const load = async () => {
  return loadWorkspaceState(process.cwd());
};
export {
  load
};
