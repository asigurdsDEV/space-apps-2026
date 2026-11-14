import { describe, expect, it } from 'vitest'
import type { Entity } from '../../shared'
import { DEFAULT_SLOTS, budgetBars, columnLabel, formatValue, parseIds, slotColumns, slotParts, toggleId, unitOf } from './model'

const part = (id: string, kind: string, props: Entity['props'] = {}): Entity => ({ id, kind, name: id, props })
const slot = (key: string) => DEFAULT_SLOTS.find((s) => s.key === key)!

describe('multi slot values', () => {
  it('parses comma lists and ignores blanks/non-strings', () => {
    expect(parseIds('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(parseIds('')).toEqual([])
    expect(parseIds(undefined)).toEqual([])
    expect(parseIds(3)).toEqual([])
  })
  it('toggles ids on and off', () => {
    expect(toggleId(undefined, 'cam')).toBe('cam')
    expect(toggleId('cam', 'spec')).toBe('cam,spec')
    expect(toggleId('cam,spec', 'cam')).toBe('spec')
    expect(toggleId('cam', 'cam')).toBe('')
  })
})

describe('slots read the sim entities', () => {
  const entities = [
    part('solar-a', 'power_system', { type: 'solar' }),
    part('rtg-a', 'power_system', { type: 'rtg' }),
    part('batt-a', 'power_system', { type: 'battery' }),
    part('sso', 'orbit', { launch_capacity_column: 'payload_sso_kg' }),
    part('earth', 'body'),
  ]
  it('splits power systems into power source and battery by type', () => {
    expect(slotParts(entities, slot('solar')).map((e) => e.id)).toEqual(['solar-a', 'rtg-a'])
    expect(slotParts(entities, slot('battery')).map((e) => e.id)).toEqual(['batt-a'])
  })
  it('shows the launcher payload for the picked orbit', () => {
    expect(slotColumns(slot('launch_vehicle'), { entities, params: { orbit: 'sso' } })[0]).toBe('payload_sso_kg')
    expect(slotColumns(slot('launch_vehicle'), { entities, params: {} })[0]).toBe('payload_leo_kg')
  })
  it('uses data/README param keys', () => {
    expect(DEFAULT_SLOTS.map((s) => s.key).sort()).toEqual(['battery', 'bus', 'comms', 'instruments', 'launch_vehicle', 'orbit', 'solar'])
  })
})

describe('budgetBars', () => {
  it('builds bars only for pairs the sim reports, flags overruns', () => {
    const bars = budgetBars({ mass_kg: 1200, mass_limit_kg: 1000, power_w: 50, cost_usd: 1 })
    expect(bars).toHaveLength(1)
    expect(bars[0]).toMatchObject({ label: 'Launch mass', ratio: 1.2, bad: true })
  })
  it('handles a zero limit without NaN, and hides optional bars with no limit', () => {
    expect(budgetBars({ power_w: 0, power_available_w: 0 })[0]).toMatchObject({ ratio: 0, bad: false })
    expect(budgetBars({ mass_kg: 5, mass_limit_kg: 0 })[0]).toMatchObject({ ratio: Infinity, bad: true })
    expect(budgetBars({ schedule_months: 3, deadline_months: 0 })).toEqual([])
  })
  it('treats science as a goal: short of it is bad', () => {
    const [short] = budgetBars({ science_per_day: 0.05, mission_days: 365, science_goal: 30 })
    expect(short).toMatchObject({ label: 'Science (projected)', goal: true, bad: true })
    expect(short.used).toBeCloseTo(18.25)
    expect(budgetBars({ science_per_day: 0.1, mission_days: 365, science_goal: 30 })[0].bad).toBe(false)
  })
})

it('labels and units come from column names', () => {
  expect(columnLabel('cost_usd')).toBe('cost')
  expect(columnLabel('eclipse_fraction')).toBe('In shadow')
  expect(unitOf('eclipse_fraction')).toBe('%')
  expect(unitOf('contact_s_per_day')).toBe('s/day')
  expect(unitOf('delta_v_required_ms')).toBe('m/s')
  expect(unitOf('capacity_wh')).toBe('Wh')
  expect(unitOf('power_w')).toBe('W')
  expect(unitOf('name')).toBe('')
})

it('formats values students can read', () => {
  expect(formatValue(250_000_000, 'USD')).toBe('$250M')
  expect(formatValue(450_000, 'USD')).toBe('$450k')
  expect(formatValue(2_500_000, 'bps')).toBe('2.5 Mbps')
  expect(formatValue(500_000, 'm')).toBe('500 km')
  expect(formatValue(0.35, '%')).toBe('35%')
  expect(formatValue(2400, 's/day')).toBe('40 min/day')
  expect(formatValue(5 * 365 * 86400, 's')).toBe('5 years')
  expect(formatValue(1500, 'kg')).toBe('1,500 kg')
})
