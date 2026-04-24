# Semantic Colors Inspector (Chromium MV3)

Live companion for the `semantic-colors` engine. Where the SvelteKit authoring
tool handles creation (anchors, alt derivation, fixture preview, CSS import,
alias management), this extension handles **consumption and validation** on
whichever real product page is loaded in the browser.

## What it does

1. **Live inspection on the real product.** Hover any element on the inspected
   page; the panel resolves the element's color into its semantic token and the
   local alias chain (e.g. `--color-surface-raised → --your-local-alias`).
2. **Highlight all consumers of a token.** Click a row in the Tokens tab and
   every element using that token lights up in the live page.
3. **Real-DOM APCA auditing.** The Contrast tab walks the actual text
   elements, finds their nearest opaque background, and flags APCA failures in
   situ — including combinations the authoring tool never anticipated.
4. **Hot override injection.** The Overrides tab exposes OKLCH sliders for any
   token. Changes are written to the page via `!important --theme-*` /
   `--color-*` declarations. Try before you commit.
5. **Theme-mode stress testing.** Cycle `data-theme` on the inspected page
   (Light / Dark / Alt) from the panel header.
6. **Coverage & violation reporting.** The Coverage tab shows per-token usage
   counts, unused ("dead") tokens, and elements using raw color values instead
   of tokens.
7. **Bidirectional bridge.** Push any override back to the engine through the
   localhost bridge. Optionally persist to disk so the SvelteKit tool saves and
   regenerates CSS.

## Architecture

```
    ┌──────────────────────┐          SSE (snapshot)          ┌──────────────────┐
    │ semantic-colors      │  ───────────────────────────▶   │ Extension panel  │
    │ SvelteKit engine     │                                 │ (chrome devtools)│
    │ /api/bridge/*        │ ◀──── POST overrides ──────     │                  │
    └──────────┬───────────┘                                 └────────┬─────────┘
               │ publish on every edit                                │
               ▼                                              port /  │
    ┌──────────────────────┐                            runtime msg   │
    │ Bridge state (SSR)   │                                          ▼
    │ in-memory snapshot   │          ┌──────────────────────────────────────┐
    └──────────────────────┘          │ Background service worker (relay)    │
                                      └────────┬────────────┬────────────────┘
                                               │            │
                                               ▼            ▼
                                      ┌──────────────┐  ┌──────────────┐
                                      │ Content      │  │ Inspected    │
                                      │ bridge (in   │  │ tab DOM      │
                                      │ the page)    │──│              │
                                      └──────────────┘  └──────────────┘
```

The bridge is rooted in a singleton `BridgeStateStore` on the SvelteKit server
(`src/lib/server/bridge-state.ts`). Four endpoints expose it:

| Endpoint               | Method | Purpose                                                       |
| ---------------------- | ------ | ------------------------------------------------------------- |
| `/api/bridge/snapshot` | `GET`  | Current manifest, resolved themes, generated CSS, validations |
| `/api/bridge/events`   | `GET`  | Server-Sent Events stream (`hello`, `snapshot`, `ping`)       |
| `/api/bridge/publish`  | `POST` | UI broadcasts its in-memory manifest (no persistence)         |
| `/api/bridge/token`    | `POST` | External override: `{ tokenId, mode, color, persist }`        |

## Build and load

```bash
# from the repo root
npm install
npm run extension:build
```

This produces `extension/dist/`. Load it into a Chromium browser:

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `extension/dist`.

Open any page you want to inspect, open DevTools, and switch to the
**Semantic Colors** panel. The panel auto-connects to `http://localhost:5173`
(change it in the header if you run the engine on a different port).

## Watch mode

```bash
npm run extension:watch
```

Keeps `extension/dist` rebuilt on every source change. After a rebuild, click
the refresh icon next to the extension in `chrome://extensions` to reload.

## Relationship to the authoring UI

The SvelteKit UI publishes its in-memory manifest to `/api/bridge/publish` on
every edit (debounced ~80 ms). The extension receives that via SSE and updates
the token color map used for inspection, highlighting, and contrast mapping —
so edits in one land in the other with no reload.

Conversely, pushing an override from the extension calls `/api/bridge/token`.
The server re-publishes the mutated manifest; the UI listens on the same SSE
stream and applies updates whose `origin !== 'ui'`. If `persist` is enabled,
the engine also writes the manifest (and, if the bridge is enabled in the
project config, regenerates the target CSS file) via the existing save path.
