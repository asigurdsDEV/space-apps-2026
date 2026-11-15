import { describe, expect, it } from 'vitest'
import { getDatasets } from '../../data'
import { flyMission, init } from '../../sim'
import { withCards } from '../../app/App'
import { awardMission, canStartMission, designGuide, MISSIONS, nextMission, validProgress } from './model'
import type { Params, SimEvent, SimState } from '../../shared'

const state = init(MISSIONS[0]!.config, getDatasets())
const won = { ...state, status: 'ended' } as SimState
const success: SimEvent[] = [{ type: 'scenario_ended', tick: 1, t_s: 86400, payload: { reason: 'success', summary: {} } }]

describe('guided campaign funding', () => {
  it('starts with a forgiving introduction and success unlocks increasingly funded assignments', () => {
    expect(MISSIONS.map((m) => m.config.params.budget_usd)).toEqual([12e6, 300e6, 500e6])
    expect(MISSIONS.map((m) => m.config.scenario_id)).toEqual(['demo-easy', 'moon', 'mars'])
    expect(canStartMission([], 'demo')).toBe(true)
    expect(canStartMission([], 'moon')).toBe(false)
    const progress = awardMission([], 'demo', won, success)
    expect(nextMission(progress)?.id).toBe('moon')
    expect(canStartMission(progress, 'moon')).toBe(true)
    expect(canStartMission(progress, 'mars')).toBe(false)
    expect(canStartMission(progress, 'demo')).toBe(true)
    expect(canStartMission(progress, 'unknown')).toBe(false)
  })

  it('cannot earn funding from a loss, active flight, wrong scenario, skipped assignment or replay', () => {
    const none: string[] = []
    expect(awardMission(none, 'demo', won, [{ type: 'scenario_ended', tick: 1, t_s: 86400, payload: { reason: 'science_shortfall', summary: {} } }])).toBe(none)
    expect(awardMission(none, 'demo', state, success)).toBe(none)
    expect(awardMission(none, 'demo', { ...won, scenario_id: 'demo' }, success)).toBe(none)
    expect(awardMission(none, 'moon', won, success)).toBe(none)
    const earned = ['demo']
    expect(awardMission(earned, 'demo', won, success)).toBe(earned)
    expect(nextMission(['demo', 'moon', 'mars'])).toBeUndefined()
  })

  it('accepts only a contiguous known route when loading browser data', () => {
    expect(validProgress(['demo', 'moon'])).toEqual(['demo', 'moon'])
    for (const bad of [null, { money: 1e12 }, ['moon', 'mars'], ['mars', 'demo', 'moon'], [1], ['demo-hard']]) expect(validProgress(bad)).toEqual([])
    expect(validProgress(['demo', 'mars'])).toEqual(['demo'])
  })

  it('guides the player toward an actionable design fix and then the launch button', () => {
    expect(designGuide(state)).toMatch(/Science/)
    expect(designGuide({ ...state, issues: [{ code: 'over_budget', severity: 'error', resource: 'budget', message: 'Over budget' }] })).toMatch(/cheaper/)
    expect(designGuide({ metrics: { science_expected: 40, science_goal: 30 }, issues: [] })).toMatch(/Launch/)
  })

  it('all funded assignments can be won through the real sim with their actual anomaly rules', () => {
    const designs: Params[] = [
      { bus: 'cubesat-12u', instruments: 'camera-basic,ir-spectrometer', solar: 'solar-deployable-large', comms: 'x-band-transmitter' },
      { bus: 'medium-bus', instruments: 'laser-altimeter,radiation-detector,ir-spectrometer,camera-basic,magnetometer', comms: 'high-gain-dish' },
      { instruments: 'subsurface-radar,ir-spectrometer', comms: 'mars-hga' },
    ]
    for (const [i, { config }] of MISSIONS.entries()) {
      const result = flyMission(withCards(config), getDatasets(config.datasets), { ...config.params, ...designs[i] })
      expect(result?.outcome, config.scenario_id).toBe('success')
    }
  })
})
