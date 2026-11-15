import { describe, expect, it } from 'vitest'
import { flyMission, init, step } from '../sim'
import { DIFFICULTIES, getDataset, getDatasets, getScenario, rowsAsObjects, scenarios, type Difficulty } from '.'
import { PRESETS, presetsFor } from './presets'

const datasets = getDatasets()
const LEVELS = Object.keys(DIFFICULTIES) as Difficulty[]
const cases = Object.entries(PRESETS).flatMap(([id, presets]) => presets.flatMap((p) => LEVELS.map((level) => [id, p.design.launch_vehicle, level, p] as const)))

describe('rocket presets', () => {
  it.each(cases)('%s / %s (%s): GO on every console, and it flies to success', (id, _rocket, level, preset) => {
    const config = getScenario(id, level)!
    const commands = Object.entries(preset.design).map(([key, value]) => ({ type: 'set_param' as const, payload: { key, value } }))
    const { state } = step(init(config, datasets), commands, config.dt_s)
    expect(state.issues.filter((i) => i.severity === 'error')).toEqual([])
    if (id !== 'sandbox') expect(flyMission({ ...config, params: { ...config.params, random_failures: false } }, datasets, preset.design)?.outcome).toBe('success')
  })

  it('every rocket in the catalog has a preset, at most one per scenario, all on real scenarios', () => {
    const rockets = rowsAsObjects(getDataset('launch-vehicles')!).map((r) => r.id)
    const used = Object.values(PRESETS).flatMap((list) => list.map((p) => p.design.launch_vehicle))
    expect(new Set(used)).toEqual(new Set(rockets))
    for (const [id, list] of Object.entries(PRESETS)) {
      expect(scenarios.some((s) => s.scenario_id === id)).toBe(true)
      expect(new Set(list.map((p) => p.design.launch_vehicle)).size).toBe(list.length)
    }
  })

  it('finds a scenario’s presets at every difficulty', () => {
    for (const level of LEVELS) expect(presetsFor(getScenario('mars', level)!.scenario_id)).toBe(PRESETS.mars)
    expect(presetsFor('nope')).toEqual([])
  })
})
