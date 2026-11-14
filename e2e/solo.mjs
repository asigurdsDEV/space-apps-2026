#!/usr/bin/env node
// Solo end-to-end test: plays the real game in the installed Chrome, through the real controls.
// For every scenario in data/scenarios/ at every difficulty the Start screen offers:
// start -> briefing -> build a winning design -> GO / NO-GO poll -> launch -> fly at 60x -> results.
// Then one design that must be refused at launch, and one that launches and must lose.
// A case also fails on any console error or uncaught page error. How to run: e2e/README.md.

import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.E2E_URL ?? 'http://localhost:5173'
const SHOTS = process.env.E2E_SHOTS ?? join(tmpdir(), 'e2e-solo')
const WON = 'Mission success' // ui/mission/format.ts, outcome "success"

// One known winning design per scenario, as changes from its starting design.
// The same designs as WINS in tests/playthrough.test.ts, which proves them against the sim alone.
const WINS = {
  demo: { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
  moon: { bus: 'medium-bus', instruments: 'laser-altimeter,radiation-detector,ir-spectrometer', comms: 'high-gain-dish' },
  mars: { instruments: 'subsurface-radar,ir-spectrometer', comms: 'mars-hga' },
}
/** Demo scenario: the rideshare rocket cannot reach GEO, so the sim refuses the launch. */
const REFUSED = { scenario: 'demo', design: { orbit: 'geo' } }
/** Demo scenario at Normal: the starting design launches, flies the whole year and misses the science goal. */
const LOSES = { scenario: 'demo', level: 'normal', design: {} }

let chromium
try {
  ;({ chromium } = createRequire(import.meta.url)(process.env.PW_CORE ?? 'playwright-core'))
} catch {
  console.error(
    'e2e: playwright-core was not found. Run `npm i --no-save playwright-core` in the repo, or set PW_CORE to a\n' +
      'playwright-core folder installed somewhere else (for example /tmp/pw/node_modules/playwright-core).',
  )
  process.exit(2)
}

const scenarioDir = fileURLToPath(new URL('../data/scenarios/', import.meta.url))
const scenarios = readdirSync(scenarioDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(scenarioDir, file), 'utf8')))
const scenario = (id) => scenarios.find((s) => s.scenario_id === id)

// ---------------------------------------------------------------- steps (each one is what a player does)

/** Start screen -> briefing -> builder. */
async function openBuilder(page, at, config, level) {
  at('open the Start screen')
  await page.goto(BASE)
  await page.getByLabel('Your name').fill('E2E')
  at(`pick ${config.scenario_id} at ${level} and press Start mission`)
  await page.locator('.ss-root').getByLabel('Mission scenario').selectOption(config.scenario_id)
  await page.locator('.ss-root').getByLabel('Difficulty').selectOption(level)
  await page.getByRole('button', { name: 'Start mission' }).click()
  at('read the briefing and press Start designing')
  const title = await page.locator('.bf-title').innerText()
  if (!title.includes(config.title)) throw new Error(`the briefing is for "${title}", not "${config.title}"`)
  await page.getByRole('button', { name: 'Start designing' }).click()
  await page.locator('.mb').waitFor()
}

/** Pick parts in the builder: a radio per single choice, the checkboxes for instruments. */
async function build(page, at, design) {
  for (const [key, value] of Object.entries(design)) {
    at(`builder: set ${key} to ${value}`)
    if (key !== 'instruments') {
      await page.locator(`#mb-${key}-${value}`).check()
      continue
    }
    const want = value.split(',').map((id) => `mb-instruments-${id}`)
    const offered = await page.locator('input[name="instruments"]').evaluateAll((boxes) => boxes.map((box) => box.id))
    const missing = want.filter((id) => !offered.includes(id))
    if (missing.length) throw new Error(`the builder does not offer ${missing.join(', ')}`)
    for (const id of offered) await page.locator(`#${id}`).setChecked(want.includes(id))
  }
}

const blockers = (page) => page.locator('.mb-issue.is-error').allInnerTexts()

/**
 * Wait for the results on `page`. An anomaly card stops the mission clock until it is answered,
 * so every card that shows is answered with its first option, by whichever of `players` may answer it.
 */
async function toResults(page, ms, players = [page]) {
  const end = Date.now() + ms
  while ((await page.locator('.mv-results').count()) === 0) {
    if (Date.now() > end) throw new Error(`no results after ${Math.round(ms / 1000)} s`)
    for (const player of players) await player.locator('.mv-decision__option:enabled').first().click({ timeout: 500 }).catch(() => {})
    await page.waitForTimeout(250)
  }
}

/** Launch mission -> GO / NO-GO poll -> Launch -> 60x -> results. Returns what the results screen says. */
async function fly(page, at, config) {
  at('builder: press Launch mission')
  const blocked = await blockers(page)
  if (blocked.length) throw new Error(`the builder blocks the launch: ${blocked.join(' | ')}`)
  await page.getByRole('button', { name: 'Launch mission' }).click()

  at('GO / NO-GO poll: wait for every console, then press Launch')
  const verdict = await page.locator('.gng-verdict').innerText()
  const go = page.getByRole('button', { name: 'Launch', exact: true })
  if (await go.isDisabled()) throw new Error(`the poll holds the launch: ${verdict}`)
  await go.click()

  at('flight: switch to 60×')
  const top = page.getByRole('button', { name: '60×' })
  // On Hard a launch failure ends the mission at once, so the results can show instead of the flight.
  await top.or(page.locator('.mv-results')).first().waitFor()
  if (await top.isVisible()) await top.click()

  at('flight: wait for the results')
  // 60× is 60 mission days a second. Three times that, plus half a minute, before giving up.
  const days = config.duration_s / config.dt_s
  await toResults(page, 30_000 + (days / 60) * 3000)
  const outcome = (await page.locator('.mv-results .mv-title').innerText()).trim()
  const score = (await page.locator('.mv-results .mv-score').innerText()).replace(/\s+/g, ' ').trim()
  const why = (await page.locator('.mv-why li').allInnerTexts()).join(' ')
  return { outcome, score, why }
}

// ---------------------------------------------------------------- cases

async function winCase(page, at, config, level) {
  const design = WINS[config.scenario_id]
  if (!design) throw new Error(`e2e/solo.mjs has no winning design for "${config.scenario_id}": add one to WINS`)
  await openBuilder(page, at, config, level)
  await build(page, at, design)
  const result = await fly(page, at, config)
  if (result.outcome !== WON) throw new Error(`the results say "${result.outcome}" (${result.score}), not "${WON}". ${result.why}`)
  return `${result.outcome}, ${result.score}`
}

async function refusedCase(page, at) {
  await openBuilder(page, at, scenario(REFUSED.scenario), 'normal')
  await build(page, at, REFUSED.design)
  at('builder: expect the launch to be refused with a reason')
  const reasons = await blockers(page)
  if (await page.getByRole('button', { name: 'Launch mission' }).isEnabled()) throw new Error('the Launch mission button is still enabled')
  // Readable: a sentence, with no leaked value or error code such as orbit_unreachable.
  const readable = reasons.filter((text) => /[a-z]{3,} [a-z]{3,}/i.test(text) && !/undefined|NaN|\b[a-z]+_[a-z_]+\b/.test(text))
  if (!readable.length) throw new Error(`no readable reason on screen: ${JSON.stringify(reasons)}`)
  return `refused: ${readable[0].replace(/\s+/g, ' ')}`
}

async function losingCase(page, at) {
  const config = scenario(LOSES.scenario)
  await openBuilder(page, at, config, LOSES.level)
  await build(page, at, LOSES.design)
  const result = await fly(page, at, config)
  if (result.outcome === WON) throw new Error(`a design that should lose won (${result.score})`)
  if (!result.why) throw new Error('the results give no reason under "What happened"')
  return `${result.outcome}, ${result.score}`
}

// ---------------------------------------------------------------- runner

let failed = 0

/** One case in a fresh browser profile. Prints its PASS or FAIL line; returns what `play` returned. */
async function run(browser, name, play) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  const errors = []
  page.on('console', (message) => message.type() === 'error' && errors.push(`console error: ${message.text()}`))
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))
  let step = 'start'
  try {
    const result = await play(page, (next) => (step = next))
    step = 'check the console'
    if (errors.length) throw new Error(`${errors.length} console or page error(s)`)
    console.log(`PASS ${name}${typeof result === 'string' ? `: ${result}` : ''}`)
    return result
  } catch (error) {
    failed++
    const shot = join(SHOTS, `${name.replace(/[^a-z0-9]+/gi, '-')}.png`)
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    console.log(`FAIL ${name}: at "${step}": ${String(error.message).split('\n')[0]} (screenshot: ${shot})`)
    for (const line of errors) console.log(`     ${line}`)
  } finally {
    await context.close()
  }
}

mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  if (!scenarios.length) throw new Error(`no scenarios found in ${scenarioDir}`)
  // The difficulties come from the real Start screen, so a new level is played without touching this file.
  const levels = await run(browser, 'start screen', async (page, at) => {
    at('open the Start screen')
    await page.goto(BASE)
    // Inside the Start screen: the one-screen strip under it has a Difficulty picker of its own.
    const values = (label) => page.locator('.ss-root').getByLabel(label).locator('option').evaluateAll((options) => options.map((option) => option.value))
    const offered = await values('Mission scenario')
    const missing = scenarios.map((s) => s.scenario_id).filter((id) => !offered.includes(id))
    if (missing.length) throw new Error(`data/scenarios has ${missing.join(', ')}, but the Start screen does not offer it`)
    const found = await values('Difficulty')
    if (!found.length) throw new Error('the Start screen offers no difficulty')
    return found
  })
  for (const config of scenarios) {
    for (const level of levels ?? []) {
      await run(browser, `${config.scenario_id} ${level} winning design`, (page, at) => winCase(page, at, config, level))
    }
  }
  await run(browser, `${REFUSED.scenario} impossible design refused at launch`, refusedCase)
  await run(browser, `${LOSES.scenario} ${LOSES.level} starting design loses`, losingCase)
} finally {
  await browser.close()
}
console.log(failed ? `${failed} case(s) failed` : 'all cases passed')
process.exit(failed ? 1 : 0)
