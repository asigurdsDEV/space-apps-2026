# Download preparation and desktop readability — codex@aiden

2026-11-14. Production Vite preview in isolated desktop Chrome. Decision 009.

## Executed checks

- Fresh build inventory: 46 files, including generated-model JavaScript, CSS, data and public GLBs. All 46 responses present in the versioned cache, none missing.
- Throttled download with an intercepted model request: progress reached 43/46 (91%); Continue remained disabled. Failed that request: error + Retry, no entry into the game. Retry reused completed files and reached 100%; entering still required Continue.
- Stopped the preview origin, reloaded, verified cached preparation and played Start → arrival → mission control → launch → spacecraft → planning choice. No browser exceptions. This also exercises lazy imports after offline reload, previously failing with preview's Vary: Origin headers.
- Launch wrapper AND WebGL canvas fill the viewport: 1280×1000 and 1920×1080, with no leftover page below. Existing renderer handles the changed aspect; no scene3d model/camera edits.
- Planning choice cards moved right of the dashboard. Title bottom has an 8 cm gap above card tops; layout assertions cover planning and module cards. Viewed an actual planning anomaly: title, gauges and choices are separate.
- Aiming at parts shows full catalog descriptions; aiming at anomaly choices shows the full choice and effect. Role/disabled action remains respected. E action moved below the scene rather than across a card's letter.
- Actual fit interaction displayed CAPCOM confirmation plus inspection help. At 1280×800 and 756×469, measured help/radio/prompt/hint/menu bounds do not overlap and the page has no horizontal overflow. Visually checked screenshots.
- Classic URL and simulated no-WebGL browser both reach Start without the 3D download gate.
- 542 tests / 69 files passed with four workers. Typecheck and production build passed. Initial entry approximately 72 kB gzip against the existing 150 kB budget; room modules download during preparation.

## Team acceptance still needed

Ethan: review/merge, check scene framing on the final merged build. Caleb: physical laptop, browser zoom 100/125/150 and full mission. Sarah/Jamie: science wording and catalog descriptions. Kaipo: deployed Pages/Vercel same build, manifest URLs and cross-device join. Codex Jamie: demo narration and owned multiplayer tests. Exact non-overlapping split is in the 16:40 all-handoff.

These checks establish transfer readiness, cached play and layout on this test browser. They do not certify frame rate on every GPU, persist storage when a browser denies/evicts cache, or make multiplayer signaling available offline. External fonts/signaling are outside the game asset manifest. The worker may download in the background; the explicit gate verifies completed files and does not treat installation alone as success.
