# Download and offline campaign regression

2026-11-15 01:30 PST · codex@aiden · source `7c5277d`, coordination lock `cef8257`.

## Result

Pass for the cached solo mission path below. This repeats the old local lazy-import failure check after PR #144 and reviews the #157 download-screen restyle requested by Claude Jamie. No game-source changes were needed for the exercised path.

| Check | Observed result |
|---|---|
| Locked dependency install | `npm ci` completed; no tracked lockfile changes. Initial build needed the newly added geotiff dependency. |
| Build/typecheck | Pass |
| Focused preparation, worker, public-files and campaign tests | 17 tests in 6 files pass |
| Whole suite | 629 tests in 82 files pass |
| First load | 72.5 kB gzip / 150 kB limit |
| Build inventory | 75 files, manifest version `159pbfi` |
| Fresh test origin, Download | Ready for launch; Continue receives focus; no Continue action before completion |
| Stop preview server, confirm curl connection refusal, reload | Preparation screen still opens |
| Download with origin stopped | Ready for launch again; Continue reaches guided board |
| First guided assignment | First Light $12M available; Moon $300M and Mars $500M locked |
| Start guided mission, skip arrival | First-person mission control and guidance render, no error boundary |
| Menu → Classic view | Builder, its model and quick tour load offline |
| Reference design | 12U, camera + IR, large solar wings, X-band; $7.3M / $12M; forecast 40 / 24; all four GO |
| GO/NO-GO → Launch | Poll and 3D launch render offline; Skip works |
| First person | Spacecraft cabin, NASA-map Earth and alarm choices render |
| Actual anomaly answers | Safe mode for real G4 storm; pause science for South Atlantic Anomaly; used Classic controls, not injected state |
| Finish at 60×, return to first person | One Mission menu with next grant approved: Moon Mapper $300M |
| Continue | Fresh Moon arrival cutscene |
| Reload with origin still stopped | Download → Continue → board: 1/3 complete, Moon funded/selected, Mars locked |
| Browser errors | No captured error-level console entries at checked milestones |

## Reproduce

1. `npm ci && npm run build`; serve `npm run preview -- --host 127.0.0.1 --port 4207 --strictPort`.
2. Open `http://127.0.0.1:4207/space-apps-2026/` on an unused local origin. Click Download and wait for Ready. Do not enter the game yet.
3. Stop that preview process. Verify an independent curl to that origin is refused. Reload the browser, prepare again and Continue.
4. Play the path above using the actual controls. The origin remains stopped through the final reload.

## Review findings and limits

The #157 download markup keeps error/retry handling and ready-button focus, and the tested offline path succeeds. Its new text **“Everything is downloaded and saved for next time” is too strong**: `downloadAssets` deliberately permits preparation when Cache Storage is unavailable or quota writes fail. The new surface survey also fetches remote NASADEM, NASA POWER, NASA GIBS and place-name data outside the static manifest. Recommended copy: “Game files are ready. Your browser keeps cached files when storage allows.” A short first-screen note should say online co-op and live surface data need a connection. Handed to Claude Aiden / gate owner; no overlapping app edit in this QA task.

This is origin-stopped testing, not a computer-wide network outage: external font/terrain/signaling endpoints were not disabled. Surface survey and online co-op were not opened. HTTP cache was not disabled, so the result verifies saved-resource availability, not exclusive service-worker routing. No simulated failed download or cache-denied browser was run in this pass; those branches passed the focused unit tests. No cache eviction, browser restart, live-host offline run, physical-laptop GPU/zoom test, screen reader or cross-device networking claim.

Browser: ChatGPT in-app Chromium on this Mac, existing viewport/zoom. No new viewport override. Native first-person walking was not exercised in this pass; Classic controls fitted parts and answered choices. Later realism PRs are outside this source snapshot. Node 23.7.0 ran successfully but npm warned that the current Vitest release supports Node 22.12/24/26 ranges; CI uses the repo's supported version.

Evidence screenshot: `preflight-offline-award.jpg` in Aiden's workspace root (not bundled into the repository). It shows the real $300M award earned with the preview origin stopped.
