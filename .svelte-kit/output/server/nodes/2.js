import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.CLBgF8ry.js","_app/immutable/chunks/D0wVHJfQ.js","_app/immutable/chunks/BDVgNmUX.js","_app/immutable/chunks/Byi6qqJC.js","_app/immutable/chunks/Bl6PVDF0.js","_app/immutable/chunks/CbKBLIdF.js"];
export const stylesheets = ["_app/immutable/assets/2.HAzohL51.css"];
export const fonts = [];
