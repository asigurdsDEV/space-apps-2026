# Offline cache browser check

2026-11-14 · codex@aiden · snapshot `0c68c68` (production source from `b00e53f`). PR #93 is merged. Evidence report only; no production changes.

## Result

**Partial pass.** The cached Start page reloads and all six public files are available with the preview server stopped. **A newly installed cache does not complete the offline solo flow in the local Vite production preview:** lazy Hangar/cutscene/SpaceView imports fail and Builder displays “Something went wrong.” The same flow succeeds online with two canvases present. This is a local-preview finding; GitHub Pages reproduction is not established.

| Check | Observed result |
|---|---|
| `npm run build` | Pass: typecheck and production build |
| `npm test -- tests/offline-public.test.mjs pwa/sw-source.test.ts` | Pass: 3 tests in 2 files, using the project Vitest runner |
| Fresh Chrome profile, online Start only, wait for controlling worker | Pass; `smdg-dmamn8`, 19 cached resources |
| Stop origin, reload with HTTP cache disabled | Pass: Start renders through service worker |
| Fetch every public file with origin stopped | Pass: six HTTP 200 responses; all GLBs have `glTF` header |
| Fetch new uncached URL with origin stopped | Rejects, confirming the origin cannot supply a fallback |
| Offline Start mission → Briefing | Briefing text appears; lazy room/cutscene imports report errors |
| Offline Start designing → Builder | Fail: error-boundary screen, no canvases |
| Restore origin, repeat reload → Start mission → Start designing | Pass: builder controls and two sized canvases present |
| Repeat offline flow without Chrome network emulation, origin still stopped | Same lazy-import failure |

## Public files fetched offline

| Path under `/space-apps-2026/` | Bytes |
|---|---:|
| `icon.svg` | 896 |
| `manifest.webmanifest` | 421 |
| `visual-assets/flight/hurricane.glb` | 2,012 |
| `visual-assets/flight/manifest.json` | 1,631 |
| `visual-assets/flight/tdrs-relay.glb` | 5,200 |
| `visual-assets/flight/wildfire.glb` | 1,900 |

## Reproduce locally

1. Build this snapshot, then run `npm run preview -- --host 127.0.0.1 --port 4197 --strictPort`.
2. Open `http://127.0.0.1:4197/space-apps-2026/` in a **fresh** Chrome profile. Stay on Start; do not first visit Builder online. Wait for `navigator.serviceWorker.controller` and a completed cache install.
3. Disable the HTTP disk cache for the test. Stop the preview server. Reload Start; it should still render. Confirm fetching a unique uncached URL rejects.
4. Press **Start mission**, then **Start designing**. Observe the error-boundary screen and console errors for lazy modules. Reproduced both with and without page-level CDP offline emulation.
5. Restore preview, reload and repeat those buttons: Builder loads with two canvases. This is the online control; it can warm/replace cache entries, so start fresh for another first-use-offline test.

Observed failing URLs include `assets/Hangar-B9lC6nAh.js`, `assets/canvas-K9FtT4-6.js` and `assets/SpaceView-YrClKHrr.js`; error: `TypeError: Failed to fetch dynamically imported module: …`. These files are present in Cache Storage with status 200 and JavaScript bodies. The initial preview responses include `Vary: Origin`; the service worker uses default `caches.match(request)` after precaching URL strings. Request-mode/header matching is a **diagnostic lead, not a confirmed root cause**. A synthetic `Request` cannot reliably reproduce browser-generated Origin headers, so that probe does not establish the cause.

## Environment and limits

Headless Chrome 157.0.0.0 on macOS, isolated temporary profile, local production preview at the GitHub Pages base path, CDP browser automation with explicit assertions. The online control found two canvases (741×469 and 664×220); this is not a visual-quality/FPS assessment. Page-level offline emulation alone allowed worker network traffic in this setup; stopping the server plus the negative uncached fetch is the actual offline boundary used above.

No live Pages offline verdict: a header probe could not resolve the Pages hostname in this shell. No physical phone, browser restart, installed-PWA upgrade, cache eviction, Safari, venue co-op or V7 flight-target acceptance tested. Cache existence and GLB bytes do not prove integrated flight gameplay. Known public-file versioning limitation is already documented in `pwa/public-files.ts`.

## Owner follow-up

claude@aiden owns PWA/config: reproduce the first-use-offline lazy-import failure, compare local preview and Pages headers, fix within that lane if confirmed, and repeat this test before claiming complete offline play. Ethan retains app/scene3d/V7. This report does not transfer either scope.
