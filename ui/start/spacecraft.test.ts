import { expect, it } from 'vitest'
import { catalogs, scenarios } from '../../data'
import { catalogEntities } from '../../sim/parts'
import { spacecraftRows } from './spacecraft'

it('lists the starting design part by part, with each part\'s catalog description', () => {
  const demo = scenarios.find(s => s.scenario_id === 'demo')!
  const rows = spacecraftRows(demo.params, catalogEntities(catalogs))
  expect(rows.map(r => r.label)).toEqual(['Orbit', 'Rocket', 'Spacecraft bus', 'Power', 'Battery', 'Radio', 'Instruments'])
  expect(rows.every(r => r.name && r.detail.length > 10)).toBe(true)
})

it('skips picks the catalog does not have', () => {
  expect(spacecraftRows({ bus: 'no-such-bus', orbit: '' }, [])).toEqual([])
})
