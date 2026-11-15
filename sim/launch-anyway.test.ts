// "Launch anyway": a crew overrules a NO-GO and the mission is lost the way it really would be.
import { describe, expect, it } from 'vitest'
import type { Command, ParamValue, SimState } from '../shared'
import { init, step, summary } from './index'
import { launchAnywayFault, LAUNCH_ANYWAY } from './sim'
import { demoConfig, fixtureDatasets, goodDesign } from './testing/fixtures'

const DAY = 86400
const calm = (params: Record<string, ParamValue>) =>
  init({ ...demoConfig, params: { ...demoConfig.params, ...goodDesign, random_failures: false, ...params } }, fixtureDatasets)
const anyway: Command = { type: 'launch', payload: { override: true } }
const errors = (state: SimState) => state.issues.filter((i) => i.severity === 'error').map((i) => i.code).sort()
function fly(state: SimState, first: Command[], steps = 400) {
  let s = state
  for (let i = 0; i < steps && s.status !== 'ended'; i++) s = step(s, i === 0 ? first : [], DAY).state
  return s
}

describe('launch anyway', () => {
  it('a rocket asked to lift too much is lost on the way up, and range safety ends it', () => {
    const start = calm({ bus: 'medium-bus', budget_usd: 0, deadline_months: 0 })
    expect(errors(start)).toEqual(['mass_over_limit', 'power_negative']) // the launch comes first
    const end = fly(start, [anyway])
    expect(end.status).toBe('ended')
    expect(end.metrics.outcome).toBe('launch_failure')
    expect(end.metrics.fault).toBe('mass_over_limit')
    expect(end.t_s).toBe(0)
    expect(end.metrics.cost_spent_usd).toBe(Number(end.metrics.build_cost_usd) + Number(end.metrics.launch_cost_usd))
    expect(summary(end).why).toContain('Range safety blew it up on purpose')
  })

  it('a rocket that cannot reach the orbit is lost the same way', () => {
    const end = fly(calm({ orbit: 'geo' }), [anyway])
    expect([end.metrics.outcome, end.metrics.fault]).toEqual(['launch_failure', 'orbit_unreachable'])
  })

  it('too little power: the launch works, then the spacecraft dies at once in orbit', () => {
    const start = calm({ solar: 'solar-body-panels' })
    expect(errors(start)).toEqual(['power_negative'])
    const launched = step(start, [anyway], DAY).state
    expect(launched.metrics.phase).toBe('cruise')
    expect(launched.entities.some((e) => e.id === 'spacecraft')).toBe(true)
    const end = fly(launched, [])
    expect([end.metrics.outcome, end.metrics.fault, end.t_s]).toEqual(['spacecraft_failure', 'power_negative', 0])
    expect(end.metrics.science_score).toBe(0)
    expect(summary(end).why).toMatch(/^The spacecraft reached space, but its power source made less power/)
  })

  it('an engine too small for the orbit: lost when the burn into orbit is due', () => {
    const start = calm({ launch_vehicle: 'falcon-9', orbit: 'lunar', budget_usd: 0 })
    expect(errors(start)).toEqual(['delta_v_short'])
    const end = fly(start, [anyway])
    expect([end.metrics.outcome, end.metrics.fault]).toEqual(['spacecraft_failure', 'delta_v_short'])
    expect(end.metrics.mission_day).toBeCloseTo(Number(start.metrics.cruise_days)) // the five-day trip to the Moon
  })

  it('stays refused without the override, or when a problem means nothing could launch', () => {
    for (const command of [{ type: 'launch', payload: {} }, { type: 'launch', payload: { override: false } }] as Command[]) {
      const after = step(calm({ bus: 'medium-bus', budget_usd: 0, deadline_months: 0 }), [command], DAY).state
      expect(after.metrics.phase).toBe('design')
      expect(after.metrics.fault).toBeUndefined()
    }
    // Over budget (money is a hard stop), a part missing, parts that do not fit the bus, not built in time.
    for (const params of [{ launch_vehicle: 'falcon-9' }, { instruments: '' }, { bus: 'cubesat-6u' }, { bus: 'medium-bus', budget_usd: 0 }] as Record<string, ParamValue>[]) {
      const after = step(calm(params), [anyway], DAY).state
      expect(after.metrics.phase).toBe('design')
      expect(after.metrics.cost_spent_usd).toBe(0)
    }
  })

  it('a ready design flies exactly as without the override, and the input is never changed', () => {
    const start = calm({})
    const frozen = JSON.stringify(start)
    const plain = fly(start, [{ type: 'launch', payload: {} }])
    expect(JSON.stringify(fly(start, [anyway]))).toBe(JSON.stringify(plain))
    expect(plain.metrics.fault).toBeUndefined()
    expect(JSON.stringify(start)).toBe(frozen)
  })

  it('picks the problem that strikes first in flight, and none when any error blocks every launch', () => {
    const e = (code: string) => ({ code, severity: 'error' as const, resource: 'design', message: '' })
    expect(launchAnywayFault([])).toBe('')
    expect(launchAnywayFault([e('delta_v_short'), e('power_negative'), e('mass_over_limit')])).toBe('mass_over_limit')
    expect(launchAnywayFault([e('delta_v_short'), e('power_negative')])).toBe('power_negative')
    expect(launchAnywayFault([e('mass_over_limit'), e('over_budget')])).toBe('')
    expect(launchAnywayFault([{ ...e('over_budget'), severity: 'warning' }, e('delta_v_short')])).toBe('delta_v_short')
    expect(Object.keys(LAUNCH_ANYWAY)).toEqual(['orbit_unreachable', 'mass_over_limit', 'power_negative', 'delta_v_short'])
  })
})
