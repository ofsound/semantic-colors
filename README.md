# Semantic Colors

## Purpose

This repo is a SvelteKit-based theme editing tool for a semantic color system.
It lets an operator edit Light and Dark anchor tokens, derive an Alt theme from
either anchor with OKLCH delta shifts, preview the result in a built-in fixture
stage, validate the result, and optionally write generated theme CSS into a
target project.

Current scope is the tool itself. The preview stage is a local fixture harness,
not an imported external app. The bridge can write generated CSS to another
path, but the tool UI and stage live in this repo.

For consumption-side workflows (live inspection, real-DOM APCA auditing, hot
overrides on a shipped product page), see the companion Chromium extension in
[extension/](./extension/README.md). It connects to the engine over a live
HTTP + SSE bridge (`/api/bridge/*`) and treats this tool as the source of
truth for tokens and aliases.

## Quick Start

Install dependencies:
npm install

Run the dev server:
npm run dev

Run tests:
npm test

Run type and Svelte checks:
npm run check

Build production output:
npm run build

Preview the production build locally:
npm run preview

## High-Level Architecture

The app is organized around a small set of modules:

1. SvelteKit UI
   - src/routes/+page.svelte is the main operator interface.
   - It renders the sidebar controls, keyboard handling, token editor,
     import review queue, and preview fixture stage.

2. Server endpoints
   - src/routes/api/project/load/+server.ts loads config and manifest state.
   - src/routes/api/project/save/+server.ts persists config and manifest and
     optionally writes generated CSS.
   - src/routes/api/project/import/+server.ts scans a CSS file and returns
     proposed semantic mappings.

3. Theme engine
   - src/lib/theme/engine.ts resolves light, dark, and alt theme colors.
   - It also runs validation, including APCA-based contrast checks.

4. CSS generator
   - src/lib/theme/css.ts emits the generated CSS contract.
   - Output includes an @theme block and explicit :root[data-theme='...']
     sections for light, dark, and alt.

5. Importer
   - src/lib/theme/importer.ts regex-extracts CSS custom properties from a
     source file and proposes mappings into canonical tokens.

6. Persistence helpers
   - src/lib/server/project-files.ts resolves file paths, loads state,
     writes state, and stores the last-used config path in a session file.

7. Bridge (consumption channel)
   - src/lib/server/bridge-state.ts holds a singleton snapshot of the live
     manifest plus a fan-out broadcaster.
   - src/routes/api/bridge/{snapshot,events,publish,token}/+server.ts expose
     the snapshot over HTTP and a push stream over Server-Sent Events.
   - The SvelteKit page publishes every edit to the bridge so external
     consumers (notably the Chromium extension in extension/) see changes
     live; the page also listens for non-UI overrides and applies them.

## Data Model and Persisted Files

The tool persists state across three files:

1. semantic-colors.project.json
   Main project config. Important fields:
   - projectRoot: base path used to resolve relative manifest and CSS paths
   - bridgeEnabled: whether generated CSS should be written on save
   - manifestPath: path to the theme manifest JSON
   - cssOutputPath: path to write generated CSS when the bridge is enabled
   - importSourcePath: CSS file to scan for variable import proposals
   - selectorStrategy: currently expects data-theme

2. semantic-colors/theme.manifest.json
   Main theme manifest. Important concepts:
   - alt settings: source anchor (light or dark), delta.l, delta.c, delta.h,
     harmonyLock flag, grayscalePreview flag
   - tokens: canonical semantic token records with light and dark OKLCH values
   - aliases: project-specific custom property names mapped to canonical tokens

3. .semantic-colors/session.json
   Stores the last used config path so reloads can reopen the same project
   config without re-entering it.

Token structure is defined in src/lib/theme/schema.ts. Each token has an id,
label, description, group, role, light anchor, dark anchor, and exception data.
Some tokens also define altParent or harmonyGroup metadata.

## Runtime Workflow

At runtime the tool behaves as follows:

1. +page.server.ts loads workspace state through project-files.ts.
2. The page initializes config and manifest state from the server load result.
3. The operator edits token anchors or Alt settings in the sidebar.
4. engine.ts resolves the active theme:
   - Light uses each token's light anchor.
   - Dark uses each token's dark anchor.
   - Alt starts from the selected source anchor and applies delta shifts.
5. Validation runs on the resolved themes.
6. The UI debounces autosave and POSTs to /api/project/save.
7. save/+server.ts writes config and manifest.
8. If bridgeEnabled is true, generated CSS is also written to cssOutputPath.

## UI and Operator Workflow

Main UI behaviors:

- Theme modes: Light, Dark, Alt
- Keyboard shortcuts:
  - 1: switch to Light
  - 2: switch to Dark
  - 3: switch to Alt
  - hold 3: momentary Alt preview, then return to the previous mode
  - L: toggle greyscale hierarchy preview
- Token editing:
  - the selected token shows manual Light and Dark OKLCH controls
  - Alt controls expose source anchor selection and delta shifts for hue,
    chroma, and lightness
  - token exceptions allow Alt derive/pin/exclude behavior and max chroma
- Import review:
  - the operator supplies a CSS source path
  - the importer scans custom properties and proposes token mappings
  - reviewed mappings can be applied into the manifest and alias list
- Bridge:
  - when enabled, saves also regenerate the target CSS file
  - when disabled, the tool still saves config and manifest state

## Important Implementation Notes

APCA validation
Validation is implemented in src/lib/theme/engine.ts using apca-w3. The tool
checks a fixed set of foreground/background token pairs and surfaces warnings
in the sidebar for the active mode.

Gamut clamping
Color math uses OKLCH through culori. If a derived color is outside the
displayable gamut, chroma is reduced until the color becomes displayable.
Max chroma can also be capped per token.

Alt derivation behavior
Alt derivation is driven by manifest.alt.source and manifest.alt.delta.
Tokens marked pin or exclude keep their source anchor in Alt. Tokens with
altParent reuse another token's resolved Alt color.

Alias generation
Generated CSS maps canonical --color-\* bridge variables to theme variables,
then emits alias variables from manifest.aliases so a consuming project can
keep local custom property names.

## Repo Map: Read These First

If you need to change behavior, start here:

- src/routes/+page.svelte
  Main UI, mode switching, autosave trigger, keyboard controls, stage fixture,
  import review flow, and token editing experience.

- src/lib/theme/engine.ts
  Theme resolution and validation logic.

- src/lib/server/project-files.ts
  State loading/saving, path resolution, session handling, and bridge writes.

Useful secondary files:

- src/lib/theme/css.ts
  Generated CSS output contract.

- src/lib/theme/importer.ts
  CSS variable extraction and mapping heuristics.

- src/lib/theme/schema.ts
  Shared types, token ids, groups, and config shape.

- src/lib/theme/defaults.ts
  Default manifest and seeded token definitions.

## Known Cautions for Maintainers

- Bridge writes are disabled by default in semantic-colors.project.json.
- The stage is a built-in fixture harness, not a real imported product UI.
- Generated CSS output location is controlled by cssOutputPath and resolved
  relative to projectRoot or the config file location.
- selectorStrategy currently assumes data-theme selectors.
- The tool autosaves after edits, so config and manifest changes can persist
  quickly during development.
- Session state is separate from the main config and only tracks the last-used
  config path.

## Verification Notes

This README is aligned with the current repo structure and scripts:

- package.json scripts: dev, build, preview, check, test
- routes present: +page, +page.server, and the project load/save/import APIs
- persisted files present: semantic-colors.project.json,
  semantic-colors/theme.manifest.json, .semantic-colors/session.json

For a quick sanity check after future changes, run:
npm test
npm run check
npm run build
