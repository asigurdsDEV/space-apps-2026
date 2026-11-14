// Locks in the accuracy-audit data fixes (docs/game-design/ACCURACY_AUDIT.md). claude@sarah.

import { describe, expect, it } from 'vitest'
import type { Command, SimState } from '../shared'
import { getDatasets, getScenario, rowsAsObjects } from '../data'
import { init, step } from '../sim'

const table = (id: string) => rowsAsObjects(getDatasets([id])[0] as never)
const n = (v: unknown) => Number(v ?? 0)

describe('physics-consistent catalogs', () => {
  it('every launcher lifts more to the Moon (TLI) than to Mars (TMI): Mars needs more energy', () => {
    for (const lv of table('launch-vehicles')) {
      if (n(lv.payload_tli_kg) > 0 && n(lv.payload_tmi_kg) > 0) expect(n(lv.payload_tli_kg), String(lv.id)).toBeGreaterThan(n(lv.payload_tmi_kg))
    }
  })

  it('a 3U CubeSat stays within the 4 kg CubeSat standard', () => {
    const u3 = table('spacecraft-buses').find((b) => b.id === 'cubesat-3u')!
    expect(n(u3.dry_mass_kg) + n(u3.max_added_mass_kg)).toBeLessThanOrEqual(4)
  })

  it('every bus says what flight computer and pointing it has (brief: onboard computer, attitude control)', () => {
    for (const b of table('spacecraft-buses')) expect(String(b.description), String(b.id)).toMatch(/computer/i)
  })

  it('every part has a build time, so the development schedule counts (brief: Time)', () => {
    for (const id of ['spacecraft-buses', 'instruments', 'power-systems', 'comms-systems']) {
      for (const part of table(id)) expect(n(part.build_months), `${id}/${part.id}`).toBeGreaterThan(0)
    }
  })
})

describe('schedule and sandbox in play', () => {
  const design = (id: string, changes: Record<string, string>) => {
    const config = getScenario(id)!
    let state: SimState = init(config, getDatasets(config.datasets))
    const set: Command[] = Object.entries(changes).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))
    state = step(state, set, config.dt_s).state
    return state
  }

  it('a flagship bus is too slow to build for the Mars launch window', () => {
    const state = design('mars', { bus: 'flagship-bus' })
    expect(state.issues.map((i) => i.code)).toContain('behind_schedule')
  })

  it('Sandbox has no budget, deadline or goal, and its starting design flies to a success', () => {
    const config = getScenario('sandbox')!
    expect([config.params.budget_usd, config.params.target_science_score, config.params.random_failures]).toEqual([0, 0, false])
    let state: SimState = init(config, getDatasets(config.datasets))
    state = step(state, [{ type: 'launch', payload: {} }], config.dt_s).state
    for (let i = 0; state.status !== 'ended' && i < 2000; i++) state = step(state, [], config.dt_s).state
    expect(state.metrics.outcome).toBe('success')
  })
})
