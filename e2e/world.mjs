#!/usr/bin/env node
// First-person e2e test: plays the guided First Light in the 3D game (decision 007), the route in docs/DEMO.md:
// download -> mission board -> mission control -> fit the reference design at the stations -> launch -> Skip ->
// spacecraft room -> answer every alarm -> win -> "Moon Mapper unlocked". solo.mjs and coop.mjs cover the Classic view.
// It moves with the dev-build hooks (__fps teleport/interact, __hall stations and cards), so run it against `npm run dev`.
// Fails on any console error or uncaught page error. Same setup as solo.mjs (e2e/README.md):
//   npm i --no-save playwright-core   (or PW_CORE=/path/to/playwright-core)
//   E2E_URL=http://localhost:5173/ node e2e/world.mjs
// Headless WebGL is software-drawn: a run takes about 8 minutes.

import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.E2E_URL ?? 'http://localhost:5173/'
const SHOTS = process.env.E2E_SHOTS ?? join(tmpdir(), 'e2e-world')
// docs/DEMO.md reference design: the winning First Light, as changes from the starting design.
const DESIGN = { bus: ['cubesat-12u'], instruments: ['ir-spectrometer'], solar: ['solar-deployable-large'], comms: ['x-band-transmitter'] }
const LAUNCH_SPOT = { eye: [0, 1.7, -5.2], at: [0, 1.05, -6.5] } // ui/hangar/layout.ts LAUNCH
// Where to stand in the spacecraft room to find the alarm panels and the speed switch (ui/interior/layout.ts ROOM).
const ROOM_SPOTS = [[0, 1.7, 0], [0.8, 1.7, -1.2], [-0.8, 1.7, -1.2], [1.8, 1.7, -0.6], [-1.8, 1.7, -0.6], [1.5, 1.7, 1], [-1.5, 1.7, 1]]

let chromium
try {
  ;({ chromium } = createRequire(import.meta.url)(process.env.PW_CORE ?? 'playwright-core'))
} catch {
  console.error('e2e: playwright-core was not found. Run `npm i --no-save playwright-core` in the repo, or set PW_CORE.')
  process.exit(2)
}

// Runs in the page: aim the first-person camera at a point, and pick parts at a station like a player pressing E.
function hooks() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const aimAt = async (eye, target) => {
    const dx = target[0] - eye[0], dy = target[1] - eye[1], dz = target[2] - eye[2]
    __fps.teleport(eye, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)))
    await sleep(400)
    return __fps.aimed?.id
  }
  window.__e2e = {
    aimAt,
    async pick(key, ids) {
      const station = () => __hall().stations.find((s) => s.key === key)
      const [cx, cz] = __hall().centre
      const at = station().at
      const len = Math.hypot(at[0] - cx, at[2] - cz)
      const eye = [at[0] + ((cx - at[0]) / len) * 1.4, 1.7, at[2] + ((cz - at[2]) / len) * 1.4]
      if ((await aimAt(eye, at)) !== `station:${key}`) throw new Error(`cannot aim at the ${key} station`)
      __fps.interact()
      await sleep(900)
      for (const id of ids) {
        const card = __hall().cards.find((c) => c.id === `rack:${key}:${id}`)
        if (!card) throw new Error(`${key}: no card ${id} (cards: ${__hall().cards.map((c) => c.id).join(', ')})`)
        if (card.picked) continue
        await aimAt(__fps.where().pos, card.at)
        __fps.interact()
        await sleep(900)
        if (!station().picked.includes(id)) throw new Error(`${key}: ${id} not fitted (${station().picked})`)
      }
      if (__hall().open) { await aimAt(eye, at); __fps.interact(); await sleep(700) } // a multi-part station stays open
      return station().picked
    },
    /** Turn on the spot and list what E would use: id -> [yaw, pitch, spot]. */
    async scan(spots) {
      const seen = {}
      for (const spot of spots) {
        for (let p = -0.6; p <= 0.4; p += 0.2)
          for (let y = 0; y < Math.PI * 2; y += Math.PI / 16) {
            __fps.teleport(spot, y, p)
            await sleep(120)
            const id = __fps.aimed?.id
            if (id && !seen[id]) seen[id] = [y, p, spot]
          }
        if (Object.keys(seen).some((id) => id.startsWith('option:')) && seen.speed) break
      }
      return seen
    },
    async use([y, p, spot]) {
      __fps.teleport(spot, y, p)
      await sleep(300)
      const label = __fps.aimed?.label
      __fps.interact()
      return label
    },
  }
}

mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1290, height: 690 } })
const errors = []
page.on('pageerror', (e) => errors.push(`page error: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console error: ${m.text().slice(0, 300)}`))
await page.addInitScript(hooks)
const at = (step) => console.log(`  ${step}`)
const button = (name) => page.getByRole('button', { name }).first()
let failed = null

try {
  await page.goto(BASE)
  at('download')
  await button(/^Download game$/i).click({ timeout: 30_000 })
  await button(/^Continue to game$/i).click({ timeout: 120_000 })
  at('mission board: start the guided mission')
  await button(/^Start guided mission$/i).click({ timeout: 30_000 })
  await page.waitForFunction(() => window.__hall && window.__fps, null, { timeout: 60_000 })
  await button(/^Skip/).click({ timeout: 10_000 }).catch(() => {}) // the arrival cutscene, if it is still up

  for (const [key, ids] of Object.entries(DESIGN)) at(`station ${key}: ${await page.evaluate(([k, i]) => __e2e.pick(k, i), [key, ids])}`)
  if (!/Design ready/i.test(await page.innerText('body'))) throw new Error('the hall does not say "Design ready" after the reference design')

  at('launch')
  if ((await page.evaluate(({ eye, at }) => __e2e.aimAt(eye, at), LAUNCH_SPOT)) !== 'launch') throw new Error('cannot aim at the launch console')
  await page.evaluate(() => __fps.interact())
  await page.locator('.s3d-launch').getByRole('button', { name: /^Skip$/ }).click({ timeout: 60_000 })
  await page.waitForSelector('.app-world-view canvas', { timeout: 60_000 })

  at('fly: answer each alarm with option A, speed up')
  const deadline = Date.now() + 15 * 60_000
  let alarms = 0
  while (!(await page.locator('dialog[open]').count())) { // the campaign result opens the menu when the mission ends
    if (Date.now() > deadline) throw new Error(`the mission did not end in 15 minutes (${alarms} alarms answered)`)
    if (await page.locator('.st-cutscene').count()) { await page.waitForTimeout(1000); continue } // let cutscenes play
    if (!(await page.locator('.app-world-view canvas').count())) { await page.waitForTimeout(1000); continue }
    const seen = await page.evaluate((spots) => __e2e.scan(spots), ROOM_SPOTS)
    const option = Object.keys(seen).filter((id) => id.startsWith('option:')).sort()[0]
    if (option) {
      at(`alarm ${++alarms}: ${option} "${await page.evaluate((s) => __e2e.use(s), seen[option])}"`)
      await page.screenshot({ path: join(SHOTS, `alarm-${alarms}.png`) })
    } else if (seen.speed) {
      const label = await page.evaluate(([y, p, spot]) => { __fps.teleport(spot, y, p); return new Promise((r) => setTimeout(() => r(__fps.aimed?.label), 300)) }, seen.speed)
      if (label && label !== 'Speed 1×') await page.evaluate((s) => __e2e.use(s), seen.speed) // 1× next means 60× now
    }
    await page.waitForTimeout(2000)
  }
  if (!alarms) throw new Error('no alarm came up in flight')
  const result = await page.locator('dialog[open]').innerText()
  at(`result: ${result.split('\n').filter(Boolean).slice(0, 4).join(' / ')}`)
  if (!/Moon Mapper unlocked/i.test(result)) throw new Error('the win did not unlock Moon Mapper')
} catch (e) {
  failed = e.message.split('\n')[0]
}
await page.screenshot({ path: join(SHOTS, 'last.png') }).catch(() => {})
await browser.close()
if (errors.length) failed = failed ?? errors.join('\n')
console.log(failed ? `FAIL: ${failed}` : 'PASS: guided First Light, first-person, won and unlocked the Moon')
console.log(`screenshots: ${SHOTS}`)
process.exit(failed ? 1 : 0)
