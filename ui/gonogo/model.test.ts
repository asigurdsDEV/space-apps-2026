import { describe, it, expect } from 'vitest'
import type { Issue } from '../../shared'
import { canLaunch, consoleFor, poll } from './model'

const issue = (code: string, severity: Issue['severity'], resource = 'design'): Issue => ({ code, severity, resource, message: code })

describe('GO / NO-GO poll', () => {
  it('routes issues by code, then by slot, then by resource', () => {
    expect(consoleFor(issue('orbit_unreachable', 'error', 'mass'))).toBe('plan')
    expect(consoleFor(issue('over_budget', 'error', 'budget'))).toBe('comms')
    expect(consoleFor(issue('bus_too_small', 'error'))).toBe('spacecraft') // resource says design, code wins
    expect(consoleFor(issue('missing_battery', 'error'))).toBe('spacecraft')
    expect(consoleFor(issue('unknown_comms', 'error'))).toBe('comms')
    expect(consoleFor(issue('missing_instrument', 'error'))).toBe('science')
    expect(consoleFor(issue('brand_new_code', 'warning', 'power'))).toBe('spacecraft')
    expect(consoleFor(issue('brand_new_code', 'warning', 'nonsense'))).toBe('plan')
  })

  it('a clean design is GO on every console and can launch', () => {
    const calls = poll([])
    expect(calls.map((c) => [c.label, c.call])).toEqual([['PLAN', 'go'], ['SPACECRAFT', 'go'], ['SCIENCE', 'go'], ['COMMS', 'go']])
    expect(canLaunch(calls)).toBe(true)
  })

  it('warnings give GO with concerns (still launchable); any error is NO-GO (blocked)', () => {
    const concerns = poll([issue('downlink_short', 'warning', 'comms')])
    expect(concerns.find((c) => c.id === 'comms')?.call).toBe('go-concerns')
    expect(canLaunch(concerns)).toBe(true)

    const blocked = poll([issue('downlink_short', 'warning', 'comms'), issue('over_budget', 'error', 'budget')])
    const comms = blocked.find((c) => c.id === 'comms')!
    expect(comms.call).toBe('no-go')
    expect(comms.reasons.map((r) => r.code)).toEqual(['downlink_short', 'over_budget'])
    expect(canLaunch(blocked)).toBe(false)
  })
})
