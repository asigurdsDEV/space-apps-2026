import { describe, it, expect } from 'vitest'
import type { Issue } from '../../shared'
import { canLaunch, consoleFor, hasMore, headline, poll, soundFor } from './model'

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

  it('picks one sound for the consoles that just called', () => {
    const calls = poll([issue('power_negative', 'error', 'power'), issue('link_weak', 'warning', 'data')])
    const call = (c: string) => calls.filter((x) => x.call === c)
    expect(soundFor([])).toBeNull()
    expect(soundFor(call('go'))).toBe('go')
    expect(soundFor(call('go-concerns'))).toBe('go') // concerns still say GO
    expect(soundFor(call('no-go'))).toBe('no-go')
    expect(soundFor(calls)).toBe('no-go') // skip: all at once, any NO-GO wins
  })

  it('shows one short line per console: the first sentence of its worst issue, the rest behind ⓘ', () => {
    const msg = (code: string, severity: Issue['severity'], message: string): Issue => ({ code, severity, resource: 'power', message })
    const [, spacecraft] = poll([
      msg('battery_small', 'warning', 'The battery is small.'),
      msg('power_negative', 'error', 'The bus needs 450 W, but the array gives 266.6 W. Pick a bigger power source.'),
    ])
    expect(headline(spacecraft)).toBe('The bus needs 450 W, but the array gives 266.6 W.')
    expect(hasMore(spacecraft)).toBe(true)
    const [plan] = poll([])
    expect(headline(plan)).toBe('')
    expect(hasMore(plan)).toBe(false)
  })

  it('gives every console a short priority (GAME_DESIGN §4.7)', () => {
    for (const c of poll([])) expect(c.priority.split(' ').length).toBeLessThanOrEqual(5)
  })
})
