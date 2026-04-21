export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DHXxF-4U.js",app:"_app/immutable/entry/app.CwZkb9-X.js",imports:["_app/immutable/entry/start.DHXxF-4U.js","_app/immutable/chunks/BGGfzTVb.js","_app/immutable/chunks/DNtpN99C.js","_app/immutable/entry/app.CwZkb9-X.js","_app/immutable/chunks/DNtpN99C.js","_app/immutable/chunks/Dj6f-nJM.js","_app/immutable/chunks/DEDqjojZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/project/import",
				pattern: /^\/api\/project\/import\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/project/import/_server.ts.js'))
			},
			{
				id: "/api/project/load",
				pattern: /^\/api\/project\/load\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/project/load/_server.ts.js'))
			},
			{
				id: "/api/project/save",
				pattern: /^\/api\/project\/save\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/project/save/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
