# Semantic Colors

SvelteKit **2** app (Svelte **5** Runes) for editing a semantic OKLCH theme, plus an optional **Chromium MV3** extension that talks to the same server over HTTP. Dependency versions are summarized below from [`package.json`](package.json).

## Purpose

This repo is a theme editing tool for a semantic color system. An operator edits
Light and Dark anchor tokens, derives an **Alt** theme from either anchor with
OKLCH delta shifts, previews the result in a built-in fixture stage, validates
the outcome, and can write generated theme CSS into a target project.

The preview stage is a **local fixture harness**, not an imported production app.
The bridge can still write generated CSS to another path on disk; the operator
UI and stage live here.

For **consumption-side** work (live inspection on real pages, DOM-level APCA
auditing, hot overrides), use the companion Chromium extension in
[`extension/`](./extension/README.md). It uses the same engine over HTTP and
Server-Sent Events under `/api/bridge/*` and treats this tool as the source of
truth for tokens and aliases.

## Quick start

```bash
npm install
npm run dev
```

Run checks: `npm run test`, `npm run check`, `npm run lint`, `npm run knip`.
Production app: `npm run build` then `npm run preview`. Extension artifact:
`npm run extension:build` (load unpacked `extension/dist/`).

## Main app stack

| Layer                    | Packages                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                | `svelte` ^5.53, `@sveltejs/kit` ^2.53, `@sveltejs/vite-plugin-svelte` ^7                                                                             |
| Build / dev              | `vite` ^8, `typescript` ^5.9                                                                                                                         |
| Production adapter       | `@sveltejs/adapter-node` ^5.5                                                                                                                        |
| Styling (operator shell) | `tailwindcss` ^4.2, `@tailwindcss/vite` ^4.2, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, `@fontsource-variable/inter`                  |
| UI primitives            | `bits-ui` ^2.18, `shadcn-svelte` ^1.2, `@lucide/svelte`, `@internationalized/date`, `clsx`                                                           |
| Schemas / validation     | `zod` ^4.3                                                                                                                                           |
| Color / contrast         | `culori` ^4, `apca-w3` ^0.1                                                                                                                          |
| Tests                    | `vitest` ^4.1                                                                                                                                        |
| Lint / format            | `eslint` ^10, `typescript-eslint` ^8, `eslint-plugin-svelte` ^3, `prettier` ^3 + `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`, `knip` ^6 |

The operator shell is styled with Tailwind; fixture and preview chrome use plain
CSS (`src/app.css`, `src/lib/styles/`, scoped `<style>` in semantic-colors
components).

## Scripts (`package.json`)

| Script            | Command                                         |
| ----------------- | ----------------------------------------------- |
| `dev`             | `vite dev` — SvelteKit dev server               |
| `build`           | `vite build` — production Node bundle           |
| `preview`         | `vite preview` — serve production build locally |
| `check`           | `svelte-kit sync` + `svelte-check`              |
| `test`            | `vitest run`                                    |
| `lint`            | `prettier --check .` + `eslint .`               |
| `lint:fix`        | `prettier --write .` + `eslint . --fix`         |
| `knip`            | unused export / dependency analysis             |
| `extension:build` | `node extension/build.mjs` — extension `dist/`  |
| `extension:watch` | same with `--watch`                             |

## Source layout (stack-relevant)

| Path                                                                                             | Role                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| [`src/routes/+page.svelte`](src/routes/+page.svelte)                                             | Runes state, workspace controller wiring, shortcuts                                                   |
| [`src/lib/components/semantic-colors/workspace/`](src/lib/components/semantic-colors/workspace/) | Split operator shell: sidebar, stage chrome, save toast                                               |
| [`src/lib/components/ui/`](src/lib/components/ui/)                                               | shadcn-svelte / bits-ui primitives                                                                    |
| [`src/lib/theme/`](src/lib/theme/)                                                               | Theme engine, CSS emit, Zod manifest schemas (`theme-manifest-zod.ts`), client bridge payload parsers |
| [`src/lib/server/`](src/lib/server/)                                                             | **Server-only**: filesystem project access, bridge store, route Zod contracts                         |
| [`src/hooks.server.ts`](src/hooks.server.ts)                                                     | CORS for `/api/bridge/*` only                                                                         |

## High-level architecture

The app is organized around a small set of cooperating areas:

1. **SvelteKit UI** — [`src/routes/+page.svelte`](src/routes/+page.svelte) holds
   page-level rune state, autosave/bridge wiring, and keyboard handling. Presentational
   chunks live under
   [`src/lib/components/semantic-colors/workspace/`](src/lib/components/semantic-colors/workspace/)
   (sidebar, main stage chrome, save toast, shell theme bar).

2. **Server endpoints** — Project APIs under `src/routes/api/project/` load and
   save workspace state, run CSS import scanning, and optionally emit generated
   CSS when the bridge is enabled.

3. **Theme engine** — Resolves Light, Dark, and Alt from the manifest and runs
   validation (including contrast checks).

4. **CSS generator** — Emits the generated CSS contract (including `@theme` and
   explicit `:root[data-theme='…']` sections for light, dark, and alt).

5. **Importer** — Scans a CSS file for custom properties and proposes mappings
   into canonical tokens.

6. **Persistence** — Resolves paths on disk, reads/writes config and manifest,
   and tracks the last-used project config in a small session file.

7. **Bridge** — In-memory snapshot of the live manifest plus fan-out to SSE
   subscribers. The page publishes edits to the bridge; it also listens for
   non-UI updates (for example from the extension) and applies them when
   appropriate.

### Why REST + SSE instead of Remote Functions

Remote Functions are a strong fit for type-safe **in-app** calls. The bridge stays
on explicit `+server.ts` routes because the extension is an **external origin**
client: it needs plain `fetch`, CORS on `/api/bridge/*` (see
[`src/hooks.server.ts`](src/hooks.server.ts)), and a long-lived **Server-Sent
Events** stream (`/api/bridge/events`). Treat the bridge as a deliberate HTTP
contract.

### Extension vs app color math

The SvelteKit app and the extension each ship their own OKLCH / sRGB conversion
helpers because the extension bundle is produced by a **separate** build step.
When you change gamut, conversion, or clamping behavior in one tree, reconcile
the other so in-page tooling does not drift.

### Bridge deployment assumptions

- **Single Node process** — Bridge state lives in memory for one server process
  (`adapter-node`). Multiple instances or serverless workers would not share
  snapshots without a redesign.
- **CORS** — Bridge routes allow a broad origin today so a local extension can
  attach. If the app is exposed beyond localhost, tighten CORS to known origins.

## Data model and persisted files

State is spread across a few local files. Git ignores real project configs and
session data; use the checked-in `*.project.example.json` files as templates.

1. **`semantic-colors.project.json`** — Project config: `projectRoot`,
   `bridgeEnabled`, `manifestPath`, `cssOutputPath`, `importSourcePath`,
   `selectorStrategy` (expects `data-theme` today).

2. **`semantic-colors/theme.manifest.json`** — Theme manifest: Alt settings
   (source anchor, `delta` shifts, `harmonyLock`, `grayscalePreview`), canonical
   `tokens`, and `aliases`.

3. **`.semantic-colors/session.json`** — Remembers the last opened config path.

Token shape is defined in `src/lib/theme/schema.ts` (ids, groups, anchors,
exceptions, optional `altParent` / `harmonyGroup`).

## Runtime workflow

1. [`src/routes/+page.server.ts`](src/routes/+page.server.ts) loads workspace
   state through the project persistence layer.
2. The page hydrates config and manifest from that load result.
3. The operator edits anchors, Alt settings, aliases, or import mappings in the
   sidebar.
4. The engine resolves the active theme (Light / Dark / Alt) from the manifest.
5. Validation runs on the resolved themes.
6. The UI debounces autosave and `POST`s to `/api/project/save`.
7. The save handler writes config and manifest; when the bridge is enabled it
   also writes generated CSS to the configured output path.

## UI and operator workflow

- **Theme modes** — Light, Dark, Alt preview in the fixture header.
- **Keyboard shortcuts** — `1` / `2` / `3` switch modes; hold `3` for a momentary
  Alt preview then return; `G` toggles grayscale (stored on
  `manifest.alt.grayscalePreview`); `B` cycles border preview on the fixture;
  `P` / `T` switch the main viewport between Preview and Tokens.
- **Token editing** — Per-token Light/Dark OKLCH controls; Alt panel for source
  anchor and delta sliders; exceptions for derive / pin / exclude and optional
  max chroma.
- **Import review** — Point at a CSS source path, review proposed variable → token
  mappings, apply into the manifest and alias list.
- **Bridge** — When enabled, saves also regenerate the target CSS file on disk.
  When disabled, the tool still persists manifest and config.

## Important implementation notes

**APCA validation** — Contrast checks run in the theme engine using apca-w3 over
a fixed set of foreground/background pairs; warnings surface for the active
mode.

**Gamut clamping** — OKLCH math may land outside the displayable gamut; chroma is
reduced until the color is in gamut. Per-token max chroma can cap saturation.

**Alt derivation** — Driven by `manifest.alt.source` and `manifest.alt.delta`.
Pin/exclude tokens keep their anchor behavior in Alt; `altParent` reuses another
token’s resolved Alt color.

**Alias generation** — Generated CSS bridges canonical `--color-*` variables to
theme variables, then emits alias variables from `manifest.aliases` so a host
project can keep local custom property names.

## Repo map: read these first

When changing behavior, start here:

- [`src/routes/+page.svelte`](src/routes/+page.svelte) — Page runes, autosave and
  bridge wiring, keyboard handling.
- [`src/lib/components/semantic-colors/workspace/`](src/lib/components/semantic-colors/workspace/) —
  Split operator UI (sidebar, stage shell, toasts).
- [`src/lib/theme/engine.ts`](src/lib/theme/engine.ts) — Resolution and
  validation.
- [`src/lib/server/project-files.ts`](src/lib/server/project-files.ts) — Load,
  save, path safety, bridge file writes.

Useful next:

- [`src/lib/theme/css.ts`](src/lib/theme/css.ts) — Generated CSS contract.
- [`src/lib/theme/importer.ts`](src/lib/theme/importer.ts) — CSS import heuristics.
- [`src/lib/theme/schema.ts`](src/lib/theme/schema.ts) — Shared types and ids.
- [`src/lib/theme/defaults.ts`](src/lib/theme/defaults.ts) — Default manifest.

## Known cautions for maintainers

- Bridge file writes are **off** by default in the example configs; enable
  deliberately when pointing at a real target repo.
- The fixture stage is a harness, not a snapshot of a shipped product UI.
- `cssOutputPath` resolves relative to `projectRoot` or the config file location;
  misconfiguration can overwrite unexpected files.
- `selectorStrategy` currently assumes `data-theme` selectors on the host.
- Autosave debounces writes; local manifest/config can change quickly during
  active editing.
- Session data only tracks the last-used config path, separate from manifest
  content.

## HTTP API (SvelteKit `+server.ts`)

**Project** (same origin as the app): [`/api/project/load`](src/routes/api/project/load/+server.ts), [`/api/project/save`](src/routes/api/project/save/+server.ts), [`/api/project/import`](src/routes/api/project/import/+server.ts).

**Bridge** (CORS-enabled for the extension; SSE on `events`): [`/api/bridge/snapshot`](src/routes/api/bridge/snapshot/+server.ts), [`/api/bridge/events`](src/routes/api/bridge/events/+server.ts), [`/api/bridge/publish`](src/routes/api/bridge/publish/+server.ts), [`/api/bridge/token`](src/routes/api/bridge/token/+server.ts), [`/api/bridge/draft`](src/routes/api/bridge/draft/+server.ts), [`/api/bridge/commit`](src/routes/api/bridge/commit/+server.ts), [`/api/bridge/discard`](src/routes/api/bridge/discard/+server.ts), [`/api/bridge/config`](src/routes/api/bridge/config/+server.ts).

## Extension (second build)

- **Target:** Chromium MV3 (`extension/manifest.json`), built to `extension/dist/`.
- **Pipeline:** [`extension/build.mjs`](extension/build.mjs) — **esbuild** bundles the extension entrypoints (`background`, `devtools`, `drawer`, `content-bridge`); **Vite** `build.lib` compiles the Svelte panel bundles with **`@sveltejs/vite-plugin-svelte`** and **Tailwind 4** (`@tailwindcss/vite`), sharing `vitePreprocess()` with the main app.
- **Color math:** duplicated on purpose in [`extension/src/shared/color.ts`](extension/src/shared/color.ts) vs [`src/lib/theme/color.ts`](src/lib/theme/color.ts); keep them in sync when changing conversions.
- **Docs:** feature behavior and load steps — [`extension/README.md`](extension/README.md).

From repo root: `npm install` then `npm run extension:build`, then load unpacked `extension/dist/` in the browser.

## Local data files (not in git)

Templates: `*.project.example.json`. Live copies and session (see `.gitignore`): `semantic-colors.project.json`, `semantic-colors/theme.manifest.json`, `.semantic-colors/session.json`.

## Quick verification

```bash
npm install
npm run check && npm run lint && npm run knip && npm run test && npm run build
npm run extension:build
```
