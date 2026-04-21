
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/bridge" | "/api/bridge/events" | "/api/bridge/publish" | "/api/bridge/snapshot" | "/api/bridge/token" | "/api/project" | "/api/project/import" | "/api/project/load" | "/api/project/save";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/bridge": Record<string, never>;
			"/api/bridge/events": Record<string, never>;
			"/api/bridge/publish": Record<string, never>;
			"/api/bridge/snapshot": Record<string, never>;
			"/api/bridge/token": Record<string, never>;
			"/api/project": Record<string, never>;
			"/api/project/import": Record<string, never>;
			"/api/project/load": Record<string, never>;
			"/api/project/save": Record<string, never>
		};
		Pathname(): "/" | "/api/bridge/events" | "/api/bridge/publish" | "/api/bridge/snapshot" | "/api/bridge/token" | "/api/project/import" | "/api/project/load" | "/api/project/save";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}