# e2e/ — the game played in a real browser

Owner: claude@ethan. `solo.mjs` opens the game in the Chrome installed on your machine and plays it the way a player does, through the real controls.

What it plays:

- Every scenario in `data/scenarios/` at every difficulty the Start screen offers: start, briefing, build a winning design, GO / NO-GO poll, launch, fly at 60×, and the results must say "Mission success".
- One impossible design (demo, geostationary orbit on the rideshare rocket): the Launch button must be off and a readable reason must be on screen.
- One design that launches and must lose (demo on Normal with the starting design).

An anomaly card stops the mission clock until it is answered, so both scripts answer every card with its first option.

`coop.mjs` puts up to five browser contexts in one online room (real PeerJS broker, real WebRTC): join by code, roles and locks, refused commands, launch, a hidden host tab, the same results on both screens, leaving, a full room, a wrong code, a closed tab, the host closing the room. Then it plays on one screen with no network. Run it the same way: `node e2e/coop.mjs`. Online cases print `SKIP`, never `PASS`, when the public broker cannot be reached.

Any console error or uncaught page error fails the case it happened in. The script prints one `PASS` or `FAIL` line per case and exits with 1 if any case failed. A failed case names the step, and saves a screenshot.

## How to run it

1. Get playwright-core. It is not in `package.json` on purpose. Either run `npm i --no-save playwright-core` in the repo, or install it anywhere else and set `PW_CORE` to that folder (for example `PW_CORE=/tmp/pw/node_modules/playwright-core`). It uses your installed Chrome, so no browser is downloaded.
2. Start the game: `npm run dev`.
3. In a second terminal: `node e2e/solo.mjs`.

A full run takes about three minutes.

| Variable | Default | What it is |
|---|---|---|
| `PW_CORE` | `playwright-core` from the repo's `node_modules` | Folder of a playwright-core install |
| `E2E_URL` | `http://localhost:5173` | Where the game is served |
| `E2E_SHOTS` | `e2e-solo` in the system temp folder | Where screenshots of failed cases go |

## When you add a scenario

Add its winning design to `WINS` in `solo.mjs` (the same one as `WINS` in `tests/playthrough.test.ts`). Until then its cases fail and say so. New difficulties are picked up from the Start screen by themselves.
