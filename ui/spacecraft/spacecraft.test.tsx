import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Entity, Params, SimState } from '../../shared'
import { SpacecraftDrawing } from './SpacecraftDrawing'

const part = (kind: string, id: string, name: string, props: Params = {}): Entity => ({ id, kind, name, props })

const entities: Entity[] = [
  part('bus', 'cubesat-3u', '3U CubeSat', { class: 'cubesat', dry_mass_kg: 3 }),
  part('bus', 'smallsat', 'SmallSat bus', { class: 'smallsat', dry_mass_kg: 120 }),
  part('power_system', 'solar-small', 'Small solar wings', { type: 'solar', power_w: 30 }),
  part('power_system', 'solar-large', 'Large solar array', { type: 'solar', power_w: 6000 }),
  part('power_system', 'rtg', 'RTG', { type: 'rtg', power_w: 110 }),
  part('power_system', 'battery-small', 'Small battery pack', { type: 'battery', capacity_wh: 40 }),
  part('comms_system', 'uhf-radio', 'UHF radio', { data_rate_bps: 9600 }),
  part('comms_system', 'x-band', 'X-band radio', { data_rate_bps: 50e6 }),
  part('instrument', 'camera', 'Camera'),
  part('instrument', 'magnetometer', 'Magnetometer'),
]

function draw(params: Params): string {
  const state: SimState = {
    contract_version: '0.1',
    scenario_id: 'test',
    tick: 0,
    t_s: 0,
    utc: '2026-11-14T09:00:00Z',
    frame: 'scene',
    status: 'paused',
    entities,
    metrics: {},
    params,
    issues: [],
    rng_state: 1,
  }
  return renderToStaticMarkup(<SpacecraftDrawing state={state} />)
}

const count = (svg: string, cls: string) => svg.split(`class="${cls}"`).length - 1
/** Width of the first rect at or inside the first element with this class. */
const width = (svg: string, cls: string) => Number(svg.split(`class="${cls}"`)[1].match(/width="([\d.]+)"/)?.[1])

const full = { bus: 'smallsat', solar: 'solar-large', battery: 'battery-small', comms: 'x-band', instruments: 'camera,magnetometer' }

describe('SpacecraftDrawing', () => {
  it('shows a dashed outline and "No spacecraft yet" for an empty design', () => {
    const empties: Params[] = [{}, { bus: '', solar: '', battery: '', comms: '', instruments: '' }]
    for (const params of empties) {
      const svg = draw(params)
      expect(svg).toContain('sc-bus--none')
      expect(svg).toContain('No spacecraft yet')
      expect(svg).toContain('aria-label="No spacecraft yet"')
      for (const cls of ['sc-panel', 'sc-rtg', 'sc-battery', 'sc-dish', 'sc-instrument']) expect(count(svg, cls)).toBe(0)
    }
  })

  it('draws every part of a full design and scales to its container', () => {
    const svg = draw(full)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('viewBox="0 0 320 200"')
    expect(svg).not.toMatch(/<svg[^>]* (width|height)=/)
    expect(svg).not.toContain('sc-bus--none')
    expect(svg).not.toContain('No spacecraft yet')
    expect(count(svg, 'sc-bus')).toBe(1)
    expect(count(svg, 'sc-panel')).toBe(2)
    expect(count(svg, 'sc-rtg')).toBe(0)
    expect(count(svg, 'sc-battery')).toBe(1)
    expect(count(svg, 'sc-dish')).toBe(1)
    expect(count(svg, 'sc-instrument')).toBe(2)
  })

  it('draws bigger parts for a bigger bus, more solar power and a faster radio', () => {
    const small = draw({ bus: 'cubesat-3u', solar: 'solar-small', comms: 'uhf-radio' })
    const big = draw(full)
    expect(width(big, 'sc-bus')).toBeGreaterThan(width(small, 'sc-bus'))
    expect(width(big, 'sc-panel')).toBeGreaterThan(width(small, 'sc-panel'))
    const dishRadius = (svg: string) => Number(svg.match(/ A ([\d.]+) /)?.[1])
    expect(dishRadius(big)).toBeGreaterThan(dishRadius(small))
  })

  it('draws an RTG instead of panels', () => {
    const svg = draw({ ...full, solar: 'rtg' })
    expect(count(svg, 'sc-rtg')).toBe(1)
    expect(count(svg, 'sc-panel')).toBe(0)
    expect(svg).toContain('aria-label="Spacecraft: SmallSat bus, RTG, ')
  })

  it('does not draw unknown ids or ids of the wrong kind', () => {
    const svg = draw({ bus: 'nope', solar: 'battery-small', battery: 'rtg', comms: 'camera', instruments: 'camera,nope, ,magnetometer' })
    expect(svg).toContain('sc-bus--none')
    for (const cls of ['sc-panel', 'sc-rtg', 'sc-battery', 'sc-dish']) expect(count(svg, cls)).toBe(0)
    expect(count(svg, 'sc-instrument')).toBe(2)
    expect(svg).toContain('aria-label="Spacecraft: 2 instruments (Camera, Magnetometer)"')
    expect(draw({ bus: 'nope', instruments: 'nope' })).toContain('No spacecraft yet')
  })

  it('names the picked parts in the aria-label', () => {
    expect(draw(full)).toContain(
      'aria-label="Spacecraft: SmallSat bus, Large solar array, Small battery pack, X-band radio, 2 instruments (Camera, Magnetometer)"',
    )
    expect(draw({ bus: 'cubesat-3u', instruments: 'camera' })).toContain('aria-label="Spacecraft: 3U CubeSat, 1 instrument (Camera)"')
  })
})
