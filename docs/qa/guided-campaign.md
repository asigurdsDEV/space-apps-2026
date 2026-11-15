# Guided missions and earned grants — codex@aiden

2026-11-14. Decision011. Desktop browser checks through CUA in the local Vite app; production smoke listed separately below. No catalog or sim balance changes.

## Executed

- Fresh browser origin: campaign board shows First Light funded at $12M with24 science target; Moon $300M and Mars $500M disabled. Name entry and three-step briefing present.
- Started First Light; first-person objective says Science1/24 and points to instruments/radio. Switched via the existing Menu to Classic to fit the reference design using real radio/checkbox controls:12U, camera+IR, large solar wings, X-band. Shared budget panel showed $7.3M/$12M, all four consoles GO, forecast40/24.
- Launched, skipped the launch sequence, answered actual storm and spacecraft decisions, ran at60x and returned to first person. Successful end offered Next grant approved / Moon Mapper / $300M inside the existing Menu. Continue created a fresh Moon assignment and its arrival cutscene.
- Reloaded the page, repeated cached preparation/Continue:1/3 complete; Earth replay available, Moon funded/selected at$300M, Mars locked. Progress survived reload.
- Separate fresh origin: flew the unchanged starter to science failure, answering the actual storm/lost-contact choices. First-person result kept the same$12M grant and offered Retry guided mission. Retry opened a fresh arrival; holding W then pressing E in the3D room launched the new run, confirming room/launch state remount. A second loss returned to a0/3 board; Moon/Mars still locked.
- End-menu timing regression: originally a campaign Menu could open concurrently with an ending cutscene. WorldMenu now honors disabled even if open was set in the same effect batch. On the repeated loss, observed exactly one visible dialog during the ending (Cutscene) and exactly one after it (Mission menu).
- Existing Free play, Daily & online opens Jamie's merged Start flow, with Daily and one-screen controls present. Campaign selection does not change their request shapes or award progress from their scores. Network joins were not re-run.
- Desktop bounds: test viewport override1280x800; the browser's zoom produced a measured CSS viewport1163x727. The board/form remained within the viewport with no horizontal overflow. Saved screenshots of the board, awarded grant and retry notice. This is not a physical laptop or zoom acceptance pass.
- Unit checks cover ordered/duplicate/wrong-session/loss award rejection; corrupt/out-of-order/blocked/quota storage; preserved longer progress from another tab; locked cards and end-of-route copy. All three assignment configs win with real sim+real anomaly rules using the reference designs.

## Production and integration

Download → completed preparation → Continue opened the funded/locked campaign board in the production preview without console errors. Free play opened the existing menu with Daily and one-screen controls; Guided missions returned to the board with heading focus restored. The final integrated build preserves #153's Start polish/one-screen children and Ethan's new models/motion; explicit world=classic URLs keep the legacy solo/co-op entry. No e2e/owner source files changed. 578 tests/76files, typecheck, production build and size check pass; first load72.0kB gzip (150kB limit). Real browser full win/loss/retry ran against the pre-integration feature build; all three configs were also flown by the sim tests.

## Limits

Solo guided campaign; free play/online remain separate. Progress is browser-local, with an in-memory fallback if storage is denied. Existing personal/Daily scores are preserved; they are not treated as proof of campaign completion. Grants are fixed per assignment and do not accumulate through retries. Classic uses the same progress observer and returns to the mission board through Main menu. No new cloud save, currency economy, model assets or sim commands.

Physical laptop frame rate, zoom100/125/150, no-WebGL hardware and new cross-device online play remain owner acceptance tasks. Kaipo must redeploy after merge if Git auto-deployment is still unavailable.
