import { describe, expect, it } from 'vitest'
import type { TableDataset } from '../../shared'
import { budgetBars, columnLabel, findTable, formatValue, parseIds, statColumns, tableRows, toggleId } from './model'

const table: TableDataset = {
  id: 'instruments',
  source: 'test',
  source_url: '',
  license: 'public domain',
  retrieved_utc: '2026-11-14T00:00:00Z',
  kind: 'table',
  units: { mass_kg: 'kg' },
  data: { columns: ['id', 'name', 'mass_kg'], rows: [['cam', 'Camera', 12], ['spec', 'Spectrometer', null]] },
}

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

describe('tables', () => {
  it('turns rows into objects and finds only table datasets', () => {
    expect(tableRows(table)).toEqual([
      { id: 'cam', name: 'Camera', mass_kg: 12 },
      { id: 'spec', name: 'Spectrometer', mass_kg: null },
    ])
    expect(statColumns(table)).toEqual(['mass_kg'])
    expect(findTable([table], 'instruments')).toBe(table)
    expect(findTable([table], 'missing')).toBeUndefined()
  })
})

describe('budgetBars', () => {
  it('builds bars only for pairs the sim reports, flags overruns', () => {
    const bars = budgetBars({ mass_kg: 1200, mass_limit_kg: 1000, power_w: 50, cost_usd: 1 })
    expect(bars).toHaveLength(1)
    expect(bars[0]).toMatchObject({ resource: 'mass', ratio: 1.2, over: true })
  })
  it('handles a zero limit without NaN', () => {
    expect(budgetBars({ power_w: 0, power_available_w: 0 })[0]).toMatchObject({ ratio: 0, over: false })
    expect(budgetBars({ power_w: 5, power_available_w: 0 })[0]).toMatchObject({ ratio: Infinity, over: true })
  })
})

it('strips unit suffixes from column labels', () => {
  expect(columnLabel('cost_usd')).toBe('cost')
  expect(columnLabel('data_rate_bps')).toBe('data rate')
  expect(columnLabel('power_available_w')).toBe('power available')
})

it('formats money and data rates', () => {
  expect(formatValue(250_000_000, 'USD')).toBe('$250M')
  expect(formatValue(2_500_000, 'bps')).toBe('2.5 Mbps')
  expect(formatValue(1500, 'kg')).toBe('1,500 kg')
})
