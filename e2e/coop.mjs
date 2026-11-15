// Co-op end to end, in real Chrome: separate browser contexts in one room over the real PeerJS
// broker and real WebRTC, then play on one screen (no network).
//
//   PW_CORE=/path/to/node_modules/playwright-core E2E_URL=http://localhost:5173/ node e2e/coop.mjs
//
// PW_CORE: playwright-core, installed outside the repo (it drives the Chrome already on this machine).
// E2E_URL: the running game (npm run dev, or the built site). E2E_SHOTS: a folder for a screenshot of each failure.
// Prints one PASS / FAIL / SKIP line per case and exits 1 if any case failed. Online cases are
// SKIP, never PASS, when the public broker cannot be reached or an earlier step they need failed.

import { createRequire } from 'node:module'

const { chromium } = createRequire(import.meta.url)(process.env.PW_CORE || 'playwright-core')
const URL_ = process.env.E2E_URL || 'http://localhost:5173/?world=classic' // the 2D screens; the default game is the 3D world
const SHOTS = process.env.E2E_SHOTS
const BROKER = 'https://0.peerjs.com/peerjs/id' // PeerJS's default broker, which app/room.ts uses

// The demo on Easy with this design ends in "Mission success".
const SCENARIO = 'demo'
const WIN = { bus: 'cubesat-12u', instrument: 'ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const pages = []
const counts = { PASS: 0, FAIL: 0, SKIP: 0 }
/** Why the remaining online cases cannot run, once something they all need has failed. */
let blocked = null

// shortcut: headless Chrome never reports a tab as hidden (a second tab in front and a minimized
// window were both tried), so "hidden" is emulated with what a hidden tab does to a page:
// visibilityState is "hidden", requestAnimationFrame stops and timers fire at most once a second.
// Upgrade to a real hidden tab if this ever runs in headed Chrome.
function hideable() {
  const raf = window.requestAnimationFrame.bind(window)
  const timeout = window.setTimeout.bind(window)
  const interval = window.setInterval.bind(window)
  const held = []
  let hidden = false
  window.requestAnimationFrame = (callback) => (hidden ? held.push(callback) && 0 : raf(callback))
  window.setTimeout = (callback, ms, ...rest) => timeout(callback, hidden ? Math.max(1000, ms || 0) : ms, ...rest)
  window.setInterval = (callback, ms, ...rest) => interval(callback, hidden ? Math.max(1000, ms || 0) : ms, ...rest)
  Object.defineProperty(document, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible') })
  Object.defineProperty(document, 'hidden', { get: () => hidden })
  window.__e2eHide = (on) => {
    hidden = on
    if (!on) held.splice(0).forEach((callback) => raf(callback))
    document.dispatchEvent(new Event('visibilitychange'))
  }
}

/** A player: their own browser context, on the Start screen. */
async function open(who) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('console', (message) => message.type() === 'error' && errors.push(`${who}: ${message.text()}`))
  page.on('pageerror', (error) => errors.push(`${who}: uncaught ${error.message}`))
  await page.addInitScript(hideable)
  await page.goto(URL_)
  await page.waitForSelector('.ss-root')
  pages.push([who, page])
  return page
}

function report(result, name, note) {
  counts[result]++
  console.log(`${result} ${name}${note ? ` (${note})` : ''}`)
}

/** One case. `fn` throws to fail and may return a note for the PASS line. `local` cases need no network. */
async function check(name, fn, { needed = false, local = false } = {}) {
  if (blocked && !local) return report('SKIP', name, blocked)
  try {
    report('PASS', name, await fn())
  } catch (error) {
    report('FAIL', name, String(error.message).split('\n')[0])
    if (SHOTS) {
      const file = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      for (const [who, page] of pages) await page.screenshot({ path: `${SHOTS}/${file}-${who}.png`, fullPage: true }).catch(() => {})
    }
    if (needed) blocked = `needs "${name}"`
  }
}

function must(ok, message) {
  if (!ok) throw new Error(message)
}

/** Poll `read` until `ok(value)`; fail with what was last seen. */
async function until(read, ok, what, ms = 8000) {
  const end = Date.now() + ms
  let value
  do {
    value = await read()
    if (ok(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 200))
  } while (Date.now() < end)
  throw new Error(`${what}; last seen: ${JSON.stringify(value)}`)
}

const text = (page, selector) => page.locator(selector).first().innerText().then((t) => t.replace(/\s+/g, ' ').trim(), () => '')
const picked = (page, id) => page.locator(`#mb-${id}:checked`).waitFor()
/** Pick a part and wait until this player's screen shows it picked (a guest's pick goes to the host and back first). */
const pick = async (page, id) => {
  if (!(await page.locator(`#mb-${id}`).isChecked())) await page.locator(`#mb-${id}`).click()
  await picked(page, id)
}
/** Every part picked in the builder, and every budget bar's numbers. */
const design = async (page) =>
  [
    ...(await page.locator('.mb input:checked').evaluateAll((inputs) => inputs.map((input) => input.id).sort())),
    ...(await page.locator('.mb-bar-head').allInnerTexts()),
  ]
    .join(' | ')
    .replace(/\s+/g, ' ')
/** Is the builder section that holds `key` locked (a disabled fieldset)? */
const locked = async (page, key) => (await page.locator('fieldset.mb-slot:disabled', { has: page.locator(`input[name="${key}"]`) }).count()) === 1
/** The id (after "mb-") of an option of `key` that is not picked now. */
const another = (page, key) => page.locator(`input[name="${key}"]:not(:checked)`).first().getAttribute('id').then((id) => id.slice(3))

/**
 * A locked section is only the builder being polite: undo the lock in the DOM and click another
 * option, so the command really goes to the host and the host has to refuse it.
 */
const force = (page, key) =>
  page.evaluate((key) => {
    const input = document.querySelector(`input[name="${key}"]:not(:checked)`)
    const slot = input.closest('fieldset')
    slot.disabled = false
    input.click()
    slot.disabled = true
  }, key)

async function join(page, name, code) {
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: /Join a room/ }).click()
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Room code').fill(code)
  await page.getByRole('button', { name: 'Join room' }).click()
}

/** Briefing -> builder, closing the tips that open on a first visit. */
async function toBuilder(page) {
  await page.getByRole('button', { name: 'Start designing' }).click()
  await page.waitForSelector('.mb')
  await page.getByRole('button', { name: 'Skip tips' }).click()
}

/** Every player watches the 3D launch on their own screen: skip it to reach the flight. */
async function toFlight(page) {
  await page.locator('.s3d-launch').getByRole('button', { name: /^(Skip|Continue)$/ }).click()
  await page.waitForSelector('.mv')
}

/** From the builder, through the GO / NO-GO poll, to the flight. */
async function launch(page) {
  await page.getByRole('button', { name: 'Launch mission' }).click()
  await page.getByRole('button', { name: 'Skip the poll' }).click()
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await toFlight(page)
}

/**
 * Switch the flight to its fastest speed. A real storm day can put an anomaly card on day 1,
 * and the speed buttons are off until it is answered, so cards are answered first.
 */
async function fastest(page, players = [page]) {
  const top = page.locator('.mv-speeds button').last()
  for (let tries = 0; tries < 40; tries++) {
    for (const player of players) {
      const option = player.locator('.mv-decision__option:enabled').first()
      if (await option.count()) await option.click({ timeout: 500 }).catch(() => {})
    }
    if (!(await top.isVisible())) return // straight to the results (a launch failure on Hard)
    // Short tries: a card can turn the buttons off between the check and the click.
    if ((await top.isEnabled()) && (await top.click({ timeout: 500 }).then(() => true, () => false))) return
    await page.waitForTimeout(250)
  }
  throw new Error('the speed buttons stayed off')
}

/**
 * Wait for the results on `page`. An anomaly card stops the mission clock until it is answered,
 * so every card that shows is answered with its first option, by whichever of `players` may answer it.
 */
async function toResults(page, ms, players = [page]) {
  const end = Date.now() + ms
  while ((await page.locator('.mv-results').count()) === 0) {
    if (Date.now() > end) throw new Error(`no results after ${Math.round(ms / 1000)} s`)
    for (const player of players) {
      // A story cutscene covers the screen for a few seconds: skip it, as a player in a hurry would.
      for (const button of [player.locator('.st-skip'), player.locator('.mv-decision__option:enabled').first()]) {
        if (await button.count()) await button.click({ timeout: 500 }).catch(() => {})
      }
    }
    await page.waitForTimeout(250)
  }
}

const result = async (page) => `${await text(page, '.mv-title')}, ${await text(page, '.mv-score')}`

// ------------------------------------------------------------------ online: two to four browsers, one room
const brokerUp = await fetch(BROKER, { signal: AbortSignal.timeout(10_000) }).then((response) => response.ok, () => false)
if (!brokerUp) {
  blocked = 'the public PeerJS broker (0.peerjs.com) could not be reached from this machine'
  console.log(`NOTE ${blocked}: every online case below is SKIP, not PASS`)
}

const host = await open('host')
const guest = await open('guest')
let code = ''

await check(
  'online: the host creates a room',
  async () => {
    await host.getByRole('button', { name: 'Start', exact: true }).click()
    await host.getByRole('button', { name: /Host online/ }).click()
    await host.getByLabel('Your name').fill('Hana')
    await host.getByRole('button', { name: 'Next' }).click()
    await host.locator(`.ss-root [data-scenario="${SCENARIO}"]`).click()
    await host.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /^easy/i }).click()
    await host.getByRole('button', { name: 'Create room' }).click()
    await host.waitForSelector('.ls-root', { timeout: 25_000 }).catch(async () => {
      throw new Error(`no lobby after 25 s; the Start screen says: ${(await text(host, '.ss-error')) || 'nothing, still "Connecting…"'}`)
    })
    code = await host.getByLabel('Room code').inputValue()
    must(/^[A-Z0-9]{6}$/.test(code), `room code is "${code}", expected 6 letters or digits`)
    return `code ${code}`
  },
  { needed: true },
)

await check(
  'online: a guest joins with the code',
  async () => {
    await join(guest, 'Gus', code.toLowerCase()) // typed in lower case: the app says any case works
    await guest.waitForSelector('.ls-root', { timeout: 30_000 }).catch(async () => {
      throw new Error(`no lobby after 30 s; the Start screen says: ${(await text(guest, '.ss-error')) || 'nothing, still "Connecting…"'}`)
    })
    for (const page of [host, guest]) {
      await until(() => page.locator('.ls-crew li').allInnerTexts(), (names) => names.length === 2 && /Hana/.test(names[0]) && /Gus/.test(names[1]), 'the lobby does not list Hana then Gus')
    }
  },
  { needed: true },
)

await check('online: each player claims a different role', async () => {
  await host.getByRole('button', { name: /Mission planning/ }).click()
  await guest.getByRole('button', { name: /^Science/ }).click()
  await host.getByText('Taken by Gus').waitFor()
  await guest.getByText('Taken by Hana').waitFor()
  must(await guest.getByRole('button', { name: /Mission planning/ }).isDisabled(), 'the guest can still press the role the host holds')
  must((await host.locator('.ls-role[aria-pressed="true"]').count()) === 1, 'the host does not see its own role as picked')
})

await check(
  'online: the host starts and both reach the builder for the same mission',
  async () => {
    await host.getByRole('button', { name: 'Continue to briefing' }).click()
    await host.waitForSelector('.bf')
    await guest.waitForSelector('.bf')
    const titles = [await text(host, '.bf-title'), await text(guest, '.bf-title')]
    must(titles[0] !== '' && titles[0] === titles[1], `briefings differ: "${titles[0]}" and "${titles[1]}"`)
    for (const page of [host, guest]) await toBuilder(page)
    return titles[0]
  },
  { needed: true },
)

// Hana holds Mission planning (orbit, launch vehicle, launch), Gus holds Science (instruments).
// Nobody holds Spacecraft (bus, power, battery) or Comms (radio).
await check('roles: the guest changes the part its role owns and the host sees it', async () => {
  await pick(guest, `instruments-${WIN.instrument}`)
  await picked(host, `instruments-${WIN.instrument}`)
})

await check('roles: the host changes the part its role owns and the guest sees it', async () => {
  const before = await host.locator('input[name="orbit"]:checked').getAttribute('id')
  const other = await another(host, 'orbit')
  await pick(host, other)
  await picked(guest, other)
  await pick(host, before.slice(3))
  await guest.locator(`#${before}:checked`).waitFor()
})

await check('roles: another player’s part is locked in the builder, with a readable reason', async () => {
  for (const [page, key, owner] of [[guest, 'orbit', 'Hana'], [guest, 'launch_vehicle', 'Hana'], [host, 'instruments', 'Gus']]) {
    must(await locked(page, key), `${key} is not locked for the player who does not own it`)
    const reason = await text(page, `fieldset.mb-slot:has(input[name="${key}"]) .mb-lock`)
    must(new RegExp(`^Only ${owner} \\(.+\\) can change this`).test(reason), `${key}: the lock says "${reason}"`)
  }
  must(await guest.getByRole('button', { name: 'Launch mission' }).isDisabled(), 'the guest can press Launch though Hana holds Mission planning')
})

await check('roles: the host refuses the guest’s change to the host’s part, with a readable message', async () => {
  const before = await design(host)
  await force(guest, 'orbit')
  const notice = await until(() => text(guest, '.app-notice'), (t) => t !== '', 'the guest got no message')
  must(/Only Hana \(Mission planning\) can change that part of the design/.test(notice), `the message is "${notice}"`)
  must((await design(host)) === before, 'the refused change still reached the host’s design')
  return notice.replace(/\s*×$/, '')
})

await check('roles: the host is refused on the guest’s part too, with a readable message', async () => {
  const before = await design(guest)
  await force(host, 'instruments')
  const notice = await until(() => text(host, '.app-notice'), (t) => t !== '', 'the host got no message')
  must(/Only Gus \(Science\) can change that part of the design/.test(notice), `the message is "${notice}"`)
  await host.waitForTimeout(500)
  must((await design(guest)) === before, 'the refused change still reached the guest’s screen')
  return notice.replace(/\s*×$/, '')
})

await check('roles: a part whose role nobody claimed can be changed by anyone', async () => {
  for (const key of ['bus', 'solar', 'comms']) {
    must(!(await locked(host, key)), `${key} is locked for the host`)
    must(!(await locked(guest, key)), `${key} is locked for the guest`)
  }
  await pick(guest, `bus-${WIN.bus}`)
  await picked(host, `bus-${WIN.bus}`)
  await pick(host, `comms-${WIN.comms}`)
  await picked(guest, `comms-${WIN.comms}`)
  await pick(guest, `solar-${WIN.solar}`)
  await picked(host, `solar-${WIN.solar}`)
})

await check('sync: both screens show the same design and budgets', async () => {
  const mine = await until(() => design(host), (d) => d.includes(`mb-bus-${WIN.bus}`) && d.includes(`mb-solar-${WIN.solar}`), 'the host’s design is not the one picked')
  await until(() => design(guest), (d) => d === mine, `the guest’s screen differs from the host’s (${mine})`)
})

await check(
  'launch: the mission planner launches and both screens fly',
  async () => {
    await launch(host)
    await toFlight(guest)
  },
  { needed: true },
)

await check('flight: a player who is not the mission planner cannot pause, and is told why', async () => {
  await guest.getByRole('button', { name: /Pause/ }).click()
  const notice = await until(() => text(guest, '.app-notice'), (t) => t !== '', 'the guest got no message')
  must(/Only Hana \(Mission planning\) can pause the mission/.test(notice), `the message is "${notice}"`)
  must((await host.getByRole('button', { name: /Pause/ }).count()) === 1, 'the refused pause paused the host')
})

await check('flight: the mission keeps running for the guest while the host’s page is hidden', async () => {
  await host.evaluate(() => window.__e2eHide(true))
  try {
    must((await host.evaluate(() => document.visibilityState)) === 'hidden', 'the host page did not turn hidden')
    const seen = [await text(guest, '.mv-head .mv-muted')]
    for (let i = 0; i < 2; i++) {
      // 1x is one mission day a second; a hidden tab's timers run about once a second.
      seen.push(await until(() => text(guest, '.mv-head .mv-muted'), (t) => t !== seen.at(-1), `the guest’s mission clock stopped at "${seen.at(-1)}"`, 6000))
    }
    return seen.join(' -> ')
  } finally {
    await host.evaluate(() => window.__e2eHide(false))
  }
})

await check('results: both players reach the same results', async () => {
  await fastest(host, [host, guest])
  await toResults(host, 120_000, [host, guest])
  await guest.waitForSelector('.mv-results', { timeout: 15_000 })
  const results = [await result(host), await result(guest)]
  must(results[0] === results[1], `host: "${results[0]}", guest: "${results[1]}"`)
  return results[0]
})

await check('leave: the guest leaves and the host keeps playing', async () => {
  await guest.getByRole('button', { name: 'Main menu' }).click()
  await guest.waitForSelector('.ss-root')
  await until(() => text(host, '.app-crew-menu summary'), (t) => t.startsWith('Crew (1)'), 'the host still counts the guest in the crew')
  await host.getByRole('button', { name: /Design a new mission/ }).click()
  await host.waitForSelector('.mb')
  // Science is free again, so the host can pick instruments now.
  await pick(host, `instruments-${WIN.instrument}`)
  must((await text(host, '.app-notice')) === '', `the host got: "${await text(host, '.app-notice')}"`)
})

await check('room: a third and a fourth player join', async () => {
  for (const [page, name] of [[guest, 'Gus'], [await open('third'), 'Ira'], [await open('fourth'), 'Jo']]) {
    await join(page, name, code)
    // The mission is under way, so a late joiner goes straight to its briefing.
    await page.waitForSelector('.bf', { timeout: 30_000 }).catch(async () => {
      throw new Error(`${name} did not get in after 30 s; the Start screen says: ${(await text(page, '.ss-error')) || 'nothing, still "Connecting…"'}`)
    })
  }
  await until(() => text(host, '.app-crew-menu summary'), (t) => t.startsWith('Crew (4)'), 'the host does not count four players')
})

await check('room: a fifth player is told the room is full', async () => {
  const fifth = await open('fifth')
  const asked = Date.now()
  await join(fifth, 'Kai', code)
  const shown = fifth.locator('.ss-error, .app-closed, .ls-error, .bf, .ls-root')
  await shown.first().waitFor({ timeout: 40_000 }).catch(() => {
    throw new Error('no message after 40 s, the Start screen still says "Connecting…"')
  })
  must((await fifth.locator('.bf, .ls-root').count()) === 0, 'the fifth player got into the room')
  const message = await text(fifth, '.ss-error, .app-closed, .ls-error')
  const waited = `${Math.round((Date.now() - asked) / 1000)} s`
  must(/full/i.test(message), `after ${waited} the message does not say the room is full: "${message}"`)
  return `after ${waited}: ${message}`
})

await check('join: a wrong room code shows a clear error', async () => {
  const lost = await open('wrong-code')
  await join(lost, 'Lee', 'ZZZZZZ')
  await lost.locator('.ss-error').waitFor({ timeout: 40_000 }).catch(() => {
    throw new Error('no error after 40 s, the Start screen still says "Connecting…"')
  })
  const message = await text(lost, '.ss-error')
  must(/could not join that room/i.test(message), `the error is "${message}"`)
  must(await lost.getByRole('button', { name: 'Join room' }).isEnabled(), 'the Start screen stays busy after the error')
  return message
})

// No `leave` message is sent here, as when a tab is closed, a phone sleeps or the Wi-Fi drops.
await check('leave: a guest who closes the tab is dropped from the crew', async () => {
  const fourth = pages.find(([who]) => who === 'fourth')?.[1]
  must(fourth && (await text(host, '.app-crew-menu summary')).startsWith('Crew (4)'), 'needs four players in the room')
  const closed = Date.now()
  await fourth.context().close()
  await until(() => text(host, '.app-crew-menu summary'), (t) => t.startsWith('Crew (3)'), '45 s later the host still counts the closed tab in the crew', 45_000)
  return `after ${Math.round((Date.now() - closed) / 1000)} s`
})

await check('leave: the host goes to the main menu and the guests are told the room is closed', async () => {
  await host.getByRole('button', { name: 'Main menu' }).click()
  await host.waitForSelector('.ss-root')
  for (const [who, page] of pages.filter(([who]) => who === 'guest' || who === 'third')) {
    const message = await until(() => text(page, '.app-closed'), (t) => t !== '', `${who} is not told the room is closed`, 20_000)
    must(/host closed the room/i.test(message), `${who} is told: "${message}"`)
  }
})

// ------------------------------------------------------------------ play on one screen (no network)
const local = await open('one-screen')

await check(
  'one screen: every role’s parts are open on the one device',
  async () => {
    await local.locator('.app-same-screen').getByLabel('Mission').selectOption(SCENARIO)
    await local.locator('.app-same-screen').getByLabel('Difficulty').selectOption('easy')
    await local.getByRole('button', { name: 'Play on one screen' }).click()
    await toBuilder(local)
    must((await local.locator('fieldset.mb-slot:disabled').count()) === 0, 'a section is locked')
    // One part from each role: planning, spacecraft (twice), science, comms.
    for (const id of [await another(local, 'launch_vehicle'), 'launch_vehicle-rideshare', `bus-${WIN.bus}`, `solar-${WIN.solar}`, `instruments-${WIN.instrument}`, `comms-${WIN.comms}`]) {
      await pick(local, id)
      must((await text(local, '.app-notice')) === '', `picking ${id} was answered with "${await text(local, '.app-notice')}"`)
    }
  },
  { local: true },
)

await check(
  'one screen: the crew launches and reaches the results',
  async () => {
    await launch(local)
    await fastest(local)
    await toResults(local, 120_000)
    return result(local)
  },
  { local: true },
)

await check(
  'console: no errors on any page',
  async () => {
    must(errors.length === 0, `${errors.length} console error(s): ${errors.slice(0, 5).join(' ;; ')}`)
  },
  { local: true },
)

await browser.close()
console.log(`${counts.PASS} passed, ${counts.FAIL} failed, ${counts.SKIP} skipped`)
process.exit(counts.FAIL > 0 ? 1 : 0)
