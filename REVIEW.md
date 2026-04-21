# `semantic-colors` — Project Review

Below is a candid review of `semantic-colors` as it stands right now. I ran your own gates (`check`, `lint`, `knip`, `test`) — all green, 7 tests passing — so this review is about what those gates don't catch.

## 1. Versions & stack (actually healthy)

For once, the version story is genuinely current, not random:

- Svelte 5.55, SvelteKit 2.57, `@sveltejs/vite-plugin-svelte` 7, Vite 8, Vitest 4, TypeScript 5.9, ESLint 10.2, Zod 4.3, Prettier 3.8 — all at or next to `latest`.
- Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) are used consistently; no legacy `export let` / `$:` / `<slot>` leakage.
- Tooling is well‑rounded: ESLint flat config, Prettier, svelte‑check, knip, Vitest, zod validation at the API boundary, a typed adapter‑node output, `.d.ts` shims for `culori` and `apca-w3`.

Nothing to fix here. This foundation is fine.

Minor nits:

- `@types/node ^25.6.0` — pin to whatever Node version you actually run (an `engines.node` + `.nvmrc` would make this concrete; right now there's nothing).
- `tsconfig.json` declares `"types": ["node", "vitest/globals"]` for the whole app. That leaks `describe/it/expect` as globals into production code and IntelliSense. Move vitest globals into a test‑only tsconfig or drop them.
- No CI config, no pre-commit hook (Husky/lefthook), no `.editorconfig`. For a "very important product" that's the first gap I'd close.

## 2. Done well

- Clean separation: pure `theme/` (engine/css/importer/color/schema/defaults) + `server/` (filesystem + zod contracts) + `components/` + `routes/`. No circular deps.
- The security‑relevant pieces actually have tests (`project-files.test.ts` covers path‑traversal on config path, manifest path, and import source). Good instinct.
- `ProjectFilesAccessError` → explicit `403`, `ZodError` → `400`. API error mapping is correct, not just `throw`.
- Input‑side zod schemas are strict (`.strict()`) and the manifest tokens schema forces the record key to match the token id. That's more rigor than most projects ship with.
- `clampToDisplayable` uses a proper binary search in OKLCH then a `clampRgb` fallback — that's the right shape for gamut mapping.
- Inline `--theme-*` vars on the stage `<section>` correctly isolate preview from global theming.

## 3. Critical / correctness issues

These are the ones I'd fix before any public commit:

**a) You've committed machine‑specific state.** `semantic-colors.project.json` and `.semantic-colors/session.json` are tracked and contain your absolute home path:

```json
{
  "version": 1,
  "projectRoot": "/Users/ben/Dev/SVELTE/semantic-colors",
  "bridgeEnabled": false,
  ...
}
```

This will break for every other contributor on first `npm run dev`. Options: gitignore both files; ship `.example` templates; or make the tool auto‑init them relative on first boot.

**b) Path sandbox is weaker than it looks.** `assertPathWithin(cwd, resolvedConfigPath, …)` only protects the _config file_ itself. Once the config's `projectRoot` is read, `resolveProjectRoot` trusts whatever the user typed there, and subsequent writes are only bounded by that user‑supplied root:

```ts
function resolveProjectRoot(configPath: string, projectRoot: string): string {
  if (!projectRoot) {
    return path.dirname(configPath);
  }
  return resolvePath(configPath, projectRoot);
}

function resolveProjectPath(projectRoot: string, targetPath: string, label: string): string {
  ...
  assertPathWithin(projectRoot, resolvedTargetPath, label);
  return resolvedTargetPath;
}
```

Setting `projectRoot` to `/` in the UI means the tool will happily write anywhere on disk as long as the sub‑path "stays within" `/`. For a local dev tool that's arguably fine, but the README calls this "Bridge writes" and the surface is a POST endpoint. I'd clamp `projectRoot` to be within `cwd` (or an explicit allow‑list), document the model, and state the threat model in README.

**c) Server never validates data read from disk.** You zod‑validate POST bodies, but `loadWorkspaceState` does:

```ts
let manifest: ThemeManifest = createDefaultManifest();
if (rawManifest) {
  try {
    manifest = {
      ...createDefaultManifest(),
      ...(JSON.parse(rawManifest) as ThemeManifest)
    };
  } catch {
    manifest = createDefaultManifest();
  }
}
```

That's a type assertion + shallow merge — corrupt manifest JSON silently yields a half‑broken object, and `ensureManifest` only shallow‑merges tokens by id (a token with a missing `exception` will crash the UI). Run `themeManifestSchema.safeParse` here too, and if it fails, either fall back to defaults _with a visible warning_ or refuse to load. Same for `ProjectConfig`.

**d) APCA is being used in a way APCA doesn't like.**

```ts
function contrastIssue(text: OklchColor, background: OklchColor, label: string): string | null {
  const contrast = Math.abs(
    APCAcontrast(sRGBtoY(toRgbChannels(text)), sRGBtoY(toRgbChannels(background)))
  );
  if (contrast >= 60) {
    return null;
  }
  return `${label} contrast is ${contrast.toFixed(1)}Lc`;
}
```

APCA deliberately returns a _signed_ Lc — the sign encodes polarity (dark text on light vs light text on dark). Taking `Math.abs` and comparing to a single 60 threshold throws away the polarity check and uses a threshold that APCA's own spec doesn't define as universal (thresholds are a lookup table keyed by text weight + size). For a theme editor whose whole pitch is perceptual contrast, this is the one place I'd not hand‑wave — at minimum keep the sign, split the threshold per use case (body text vs large label vs placeholder), and surface the Lc value, not just "warning".

Also worth flagging: `apca-w3`'s license is source‑available / non‑commercial‑restricted. If this product is ever commercial, your legal team needs to know. [apca-w3 on GitHub](https://github.com/Myndex/apca-w3) has the details.

**e) The Tailwind v4 `@theme` block emits `var(...)` values.**

```ts
return `@theme {
${bridge}
}
...`;
```

where each `bridge` line is `--color-x: var(--theme-x);`. Tailwind v4 `@theme` is meant to register _static_ theme values for the Tailwind JIT to turn into utilities — `var()` indirection inside `@theme` doesn't give you what you probably want (utility classes keyed to mode‑switching vars). Either:

- Emit the resolved color literal in `@theme` (defeats `data-theme` switching via vars), or
- Drop the `@theme` block and emit plain `:root { --color-*: var(--theme-*); }` (recommended for a `data-theme`‑switched design system), or
- Gate this on a `targetEngine: 'tailwind-v4' | 'plain'` config and do the right thing per target.

Right now you're kind of doing neither, and emitting `@theme` also silently couples consuming projects to Tailwind v4.

**f) `:root[data-theme='alt']` is hardcoded to `color-scheme: dark`** in the generated CSS. But Alt can derive from Light — so this will lie to form controls and scrollbars when the user picks "Derive from Light".

**g) Importer has no "does this value look like a color?" filter.** `extractImportProposal` matches any `--foo: bar;` — including `--radius-1: 4px;`, gradients, `calc()` values — then `parseColor` silently returns `null`. Users will see dozens of non‑color candidates in the review queue. Two line fix: drop candidates whose `light && dark` both failed to parse, or at least surface a "not a color" flag in the UI.

## 4. Obviously vibe‑coded or sloppy

**a) The autosave dep‑tracking hack** in `+page.svelte`:

```ts
$effect(() => {
  void JSON.stringify($state.snapshot(manifest));
  void JSON.stringify($state.snapshot(config));
  void configPath;

  if (!booted) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    void persistState();
  }, 500);
});
```

Double‑stringifying the entire manifest on every effect run just to force dep tracking is a tell. `$effect` already tracks reads; a dedicated `.svelte.ts` module exposing `createAutosave(manifest, config, configPath)` with an explicit `$state.snapshot` comparison and a proper debounce is the sustainable version. Bonus: the whole autosave/booted state machine gets testable in isolation.

**b) `booted`, `saveTimer`, `holdPreviewStartedAt`, `holdPreviewReturnMode` are plain `let`s at module top.** They're not reactive so technically it works, but they're component‑instance‑lifetime state living next to `$state` variables. Put the keyboard hold‑preview logic behind a small store or an action; put `booted`/`saveTimer` inside the autosave module. The page is currently 466 lines of "holds everything".

**c) `+page.svelte` is a god component.** State, 12 handlers, autosave, data loading, keyboard routing, import orchestration, bridge persistence, even the "is this user a noob" guide. Even after the sub‑component split, the business logic here is one module's worth:

- `src/lib/theme/autosave.svelte.ts` — debounced persist, booted flag
- `src/lib/theme/mode.svelte.ts` — active mode + hold‑to‑preview state machine
- `src/lib/theme/project.svelte.ts` — load/reload/save/import orchestration
- `+page.svelte` becomes ~80 lines of binding

**d) `applyPageData` is called via an IIFE pattern:**

```ts
const loadInitialData = () => data;
applyPageData(loadInitialData());
```

The indirection adds no value. Call `applyPageData(data)` directly, or skip `applyPageData` entirely and initialize state inline.

**e) Duplicated string‑literal union type.** `'idle' | 'saving' | 'saved' | 'error'` is copy‑pasted in three components (`+page.svelte`, `ProjectPanel.svelte`, `FixtureStage.svelte`). Export a `type SaveState` from `schema.ts`.

**f) `saveHeading` and `saveHint` are nested ternaries** in `+page.svelte`. Replace with a `const SAVE_COPY: Record<SaveState, { heading: string; hint(config): string }>`. Scales much better as states are added.

**g) Import heuristic rules have actual bugs.** E.g. in `importer.ts`:

- `/\b(accent|brand)[-_](strong|hover)\b/` maps `accent-hover` to `accent-strong` — wrong; `accent-hover` should map to `link-hover` or have its own token.
- `/\bborder[-_](strong|focus)\b/` maps `border-focus` to `border-strong`, then relies on the later `/\bfocus\b/` rule winning on higher confidence (0.83 > 0.75). This "highest confidence wins" ordering makes the ruleset fragile: reorder two entries and you silently regress mappings. There's also no `surface(?:[-_]overlay)?` → `surface-overlay` rule, so overlay surfaces never get suggested.
- The whole file is ~200 lines of regex literals with no test coverage except one 3‑variable smoke test.

A small declarative table (exact match → suffix match → prefix match, each with tests) would be more sustainable than confidence‑sorted regex.

**h) The hold‑to‑preview keyboard code is fragile.**

```ts
function handleKeyup(event: KeyboardEvent): void {
  if (event.key === '3' && holdPreviewReturnMode) {
    const heldFor = performance.now() - holdPreviewStartedAt;
    if (heldFor > 180) {
      activeMode = holdPreviewReturnMode;
    }
    holdPreviewReturnMode = null;
  }
}
```

If the user holds `3`, alt‑tabs away and releases, `keyup` never fires and you're stuck in Alt. If they hold `3` and click a mode button within 180ms, state desyncs. There's also no UI feedback while holding. Again, a small state machine would make this reliable.

**i) `document.documentElement.dataset.theme = activeMode`** has no consumer in this app — the stage uses inline `--theme-*` vars, the shell CSS doesn't reference `[data-theme]`, and the _generated_ CSS is written to a target project, not loaded here. This line looks like an artifact from an earlier design. Delete it or actually consume it.

**j) `+page.server.ts` has zero error handling.** If the manifest JSON is corrupt or a user permission flips, the user gets SvelteKit's default 500. At least catch `ProjectFilesAccessError` there and render a recovery UI.

**k) Two API endpoints generate CSS unconditionally.** `saveWorkspaceState` always calls `generateThemeCss(manifest)` before checking `bridgeEnabled`. Cheap today, wasteful if the manifest grows.

**l) `textarea`/`selectedTokenId` default `'surface'` is a stringly‑typed magic value.** `schema.ts` could export `DEFAULT_TOKEN_ID: TokenId = 'surface'` so renaming that id would be a compile error instead of a runtime surprise.

**m) `updatedAt` is written twice per save.** Once by the client (`new Date().toISOString()` in the POST body) and then again server‑side. Pick one — server is the authority.

**n) `resetManifest()` is declared below its caller** `confirmResetManifest()`. Hoisted, so it works, but stylistically it reads backwards; Prettier won't catch this but a reader will notice.

## 5. Architecture / sustainability

- **Use the framework instead of hand‑rolling.** Your own `.cursor/rules/svelte-5-patterns.mdc` says "Prefer Remote Functions (`$app/server`) over manual API routes for type‑safe client‑server calls." You have three manual endpoints + zod + fetch + `responseMessage` all reinventing what `query`/`command` Remote Functions would give you for free with end‑to‑end types. This would delete `responseMessage`, the content‑type sniffing, the manual 400/403 branching, and most of `src/lib/server/contracts.ts`'s plumbing (you'd still keep zod schemas, but compose them into remote functions). Worth the migration before product v1.

- **No migration strategy for the manifest.** `version: 1` is encoded, but there's no `migrate()` pipeline. On v2 of the schema, you'll regret this. A simple `migrations.ts` with `migrations[from] = (m) => m as VNext` and a test per migration is <30 lines.

- **No concurrency protection.** Two fast autosaves race to `writeFile` the same manifest. For a solo local tool that's acceptable; for the "very important product" you mention, consider an atomic write (write to `file.tmp` then `rename`) and an `If-Match`/ETag on the save endpoint.

- **No snapshot test on generated CSS.** The CSS contract is the product surface. One Vitest snapshot pinning the default manifest's generated CSS would catch regressions and make the Tailwind v4 vs plain‑CSS decision reviewable in PRs.

- **No Playwright/e2e.** The UX flows (edit token → debounce → save → reload) are exactly what e2e is for.

- **`defaults.ts` is 400 lines of color literals.** This is the design system's source of truth. Consider keeping it as a JSON (`semantic-colors/defaults.manifest.json`) loaded at build time, so designers can PR color changes without touching TypeScript — better separation for a design‑tooling product.

- **No telemetry or error reporting hook** (even a pluggable `onError(err)` in `persistState`). For a tool that writes files on the user's machine, at least log failed saves somewhere persistent.

- **No "preview generated CSS" view in the UI.** Users flip `bridgeEnabled` blind. A read‑only panel that shows the current generated CSS (same string the server would write) removes all the guesswork — and doubles as a manual copy‑paste escape hatch if you decide bridge writes are too invasive.

- **Accessibility gaps.** `window.confirm` is blocking, not announced nicely; the warning badges are the word "Warn" (not localizable, not screenreader‑ideal); range sliders have no live value announcement; the `.skip-link` is there (good) but the color‑picker controls are all range + number pairs with no keyboard shortcuts for fine adjustment. Nothing broken, just thin for a design tool that will be used all day.

## 6. Small things to clean up

- `structuredClone` in `createDefaultManifest` + a second `cloneColor` helper — pick one convention.
- `showSetupGuide` heuristic (`!bridgeEnabled && !importSourcePath && aliases.length === 0`) is prone to false positives — any existing project with bridge off for local reasons will see the "first run" guide. Persist a `hasDismissedSetup` flag.
- `semantic-colors-shell.css` has one non‑prefixed `body { background: ... }` rule that leaks globally. Prefix or move to `app.css`.
- Hardcoded hex colors (`#111827`, `#4b5563`, `#b91c1c`, etc.) are scattered through component `<style>` blocks — in a semantic‑color project, these should eat their own dogfood via the manifest (or at least a shared "shell" token set).
- `eslint-config-prettier` 10 works fine with ESLint 10, but you're putting it between the typescript‑eslint configs and your ignore block; convention is to put it last among rule‑config entries. Cosmetic.

---

**Summary.** The bones are good: modern stack, runes used correctly, clear module boundaries, zod at the API, tests for the security‑critical parts, and all gates pass. The concerning parts are concentrated in three places:

1. **Correctness the tests don't catch** — APCA misuse, Tailwind `@theme` misuse, `color-scheme` on Alt, unvalidated disk reads, committed absolute paths, path‑sandbox only half‑enforced, and importer heuristics with real logic bugs.
2. **`+page.svelte` is doing too much**, and the autosave `$effect` is held together with a dep‑tracking hack. Extract to `.svelte.ts` modules.
3. **Sustainability gaps** — no CI, no manifest migration path, no generated‑CSS snapshot, no Remote Functions despite your own rules pointing at them, no engines/Node pin, no e2e, no error telemetry.

None of this is catastrophic. The product is coherent and the code is mostly honest. But if this is day one of something you want to live for years, I'd prioritize in this order before anything else ships:

1. Untrack and relocate the user‑specific config files.
2. Validate manifest/config on load with the same zod schemas you use on save.
3. Fix the APCA polarity + threshold logic, or at minimum stop pretending it's a pass/fail.
4. Extract autosave + mode + project orchestration from `+page.svelte` into `.svelte.ts` modules, then add one snapshot test on `generateThemeCss` and one e2e smoke.
5. Add CI running `check`, `lint`, `knip`, `test` on every PR.

Happy to start on any of these — my strong recommendation is #1 and #2 first, because they're small and they turn a personal project into something another person can clone and run.
