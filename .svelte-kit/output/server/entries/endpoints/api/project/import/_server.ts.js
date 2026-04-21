import { json } from "@sveltejs/kit";
import { i as importFromCss } from "../../../../../chunks/project-files.js";
const POST = async ({ request }) => {
  const payload = await request.json();
  const proposal = await importFromCss(payload.configPath, payload.sourcePath);
  return json(proposal);
};
export {
  POST
};
