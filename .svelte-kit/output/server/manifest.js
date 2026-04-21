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
		client: {start:"_app/immutable/entry/start.CVvk0JLJ.js",app:"_app/immutable/entry/app.C-PJxybr.js",imports:["_app/immutable/entry/start.CVvk0JLJ.js","_app/immutable/chunks/CYyYJFkw.js","_app/immutable/chunks/DNtpN99C.js","_app/immutable/entry/app.C-PJxybr.js","_app/immutable/chunks/DNtpN99C.js","_app/immutable/chunks/Dj6f-nJM.js","_app/immutable/chunks/DEDqjojZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
				id: "/api/bridge/events",
				pattern: /^\/api\/bridge\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bridge/events/_server.ts.js'))
			},
			{
				id: "/api/bridge/publish",
				pattern: /^\/api\/bridge\/publish\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bridge/publish/_server.ts.js'))
			},
			{
				id: "/api/bridge/snapshot",
				pattern: /^\/api\/bridge\/snapshot\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bridge/snapshot/_server.ts.js'))
			},
			{
				id: "/api/bridge/token",
				pattern: /^\/api\/bridge\/token\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/bridge/token/_server.ts.js'))
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
