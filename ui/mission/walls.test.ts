import { describe, expect, it } from 'vitest'
import type { Issue } from '../../shared'
import { getScenario } from '../../data'
import { CONSOLES } from '../gonogo'
import { CONSOLE_LINE_MAX, FIX_MAX, callWall, consoleLine, debriefWall } from './walls'

const issue = (code: string, severity: 'error' | 'warning', resource: string, message = 'A long explanation. With more.'): Issue => ({ code, severity, resource, message })

describe('call wall', () => {
  it('is the mission name and three numbers', () => {
    expect(callWall(getScenario('demo')!)).toEqual({
      title: 'First Light',
      numbers: [['Budget', '$8M'], ['Science goal', '30 pts'], ['Mission', '1 year']],
    })
    expect(callWall(getScenario('mars')!).numbers[2]).toEqual(['Mission', '3 years'])
    expect(callWall({ title: 'Sandbox: no limits', duration_s: 86400 * 30, params: { budget_usd: 0, target_science_score: 0 } }).numbers).toEqual([
      ['Budget', 'No limit'], ['Science goal', 'Free play'], ['Mission', '30 days'],
    ])
  })
})

describe('console lines', () => {
  it('says GO, GO with a concern, or NO-GO in a few words', () => {
    expect(consoleLine([], 'plan')).toBe('GO · All checks good')
    expect(consoleLine([issue('mass_over_limit', 'error', 'mass')], 'plan')).toBe('NO-GO · Too heavy for the rocket')
    expect(consoleLine([issue('power_short', 'warning', 'power')], 'spacecraft')).toBe('GO · Power is tight')
    expect(consoleLine([issue('mass_over_limit', 'error', 'mass'), issue('orbit_unreachable', 'error', 'mass')], 'plan')).toBe('NO-GO · Too heavy for the rocket (+1 more)')
    expect(consoleLine([issue('mass_over_limit', 'error', 'mass')], 'comms')).toBe('GO · All checks good')
  })

  it('never runs past 60 characters, even for an unknown code with a long message', () => {
    const long = issue('something_new', 'error', 'design', 'This is a very long first sentence that goes on and on past any sensible wall width. Second.')
    const codes = ['missing_launch_vehicle', 'missing_comms', 'unknown_bus', 'orbit_unreachable', 'added_mass_over_bus', 'too_many_instruments', 'delta_v_short', 'power_negative', 'over_budget', 'behind_schedule', 'mass_margin_low', 'off_best_orbit', 'science_short', 'battery_small', 'link_weak', 'downlink_short', 'bus_life_short', 'orbit_life_short']
    const all = [long, ...codes.map((c) => issue(c, 'error', 'design')), ...codes.map((c) => issue(c, 'warning', 'design'))]
    for (const { id } of CONSOLES) {
      expect(consoleLine(all, id).length, id).toBeLessThanOrEqual(CONSOLE_LINE_MAX)
      expect(consoleLine([long], id).length).toBeLessThanOrEqual(CONSOLE_LINE_MAX)
    }
    expect(consoleLine([long], 'plan')).toMatch(/^NO-GO · This is a very long.*…$/)
  })
})

describe('debrief wall', () => {
  it('shows the grade, one line and the best fix that beats the score', () => {
    const summary = { outcome: 'science_shortfall', score: 26, grade: 'F' }
    expect(debriefWall(summary)).toEqual({ grade: 'F', line: 'Science goal missed · 26 pts' })
    const fixes = [{ change: 'Add the Magnetometer', score: 37 }, { change: '3 ground stations instead of 1', score: 88 }, { change: 'worse', score: 10 }]
    expect(debriefWall(summary, fixes).fix).toBe('3 ground stations instead of 1')
    const long = [{ change: 'A very long part name that would never fit on the debrief wall at all', score: 90 }]
    expect(debriefWall(summary, long).fix!.length).toBeLessThanOrEqual(FIX_MAX)
  })
})

import { LINES } from '../story'

describe('CAPCOM words budget (decision 007)', () => {
  it('every line is at most 90 characters', () => {
    for (const [id, line] of Object.entries(LINES)) expect(line.length, id).toBeLessThanOrEqual(90)
  })
})
