import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SimState } from '../../shared'
import { SharePanel } from './SharePanel'
import { decodeDesign, deleteDesign, designFromHash, encodeDesign, listDesigns, loadCommands, saveDesign } from './share'

const design = {
  launch_vehicle: 'falcon-9',
  orbit: 'leo-500',
  bus: 'smallsat',
  solar: 'solar-2kw',
  battery: 'li-ion-50',
  comms: 'x-band',
  instruments: 'camera,spectrometer',
}

const unset = { launch_vehicle: '', orbit: '', bus: '', solar: '', battery: '', comms: '', instruments: '' }

const state: SimState = {
  contract_version: '0.1',
  scenario_id: 'test',
  tick: 0,
  t_s: 0,
  utc: '2026-11-14T00:00:00Z',
  frame: 'body-centered',
  status: 'paused',
  entities: [
    { id: 'falcon-9', kind: 'launch_vehicle', name: 'Falcon 9', props: {} },
    { id: 'camera', kind: 'instrument', name: 'Wide Camera', props: {} },
  ],
  metrics: { mass_kg: 820, cost_usd: 95e6, power_w: 410, science_per_day: 12 },
  params: { ...design, seed: 7, random_failures: true },
  issues: [{ code: 'mass_over_limit', severity: 'error', resource: 'mass', message: 'Too heavy.' }],
  rng_state: 1,
}

function fakeStorage(initial?: string) {
  const items = new Map<string, string>()
  const storage = {
    getItem: (key: string) => items.get(key) ?? initial ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  }
  vi.stubGlobal('localStorage', storage)
  return storage
}

afterEach(() => vi.unstubAllGlobals())

describe('share link', () => {
  it('round-trips the seven choices exactly and leaves other params out', () => {
    expect(decodeDesign(encodeDesign(state.params))).toEqual(design)
    expect(decodeDesign('#' + encodeDesign({ ...design, instruments: '' }))).toEqual({ ...design, instruments: '' })
    expect(encodeDesign(state.params)).not.toContain('seed')
  })

  it('rejects unknown keys', () => {
    expect(decodeDesign('#orbit=leo-500&seed=1&__proto__=x&constructor=y&budget_usd=9')).toEqual({ orbit: 'leo-500' })
  })

  it('rejects values with bad characters', () => {
    for (const bad of ['LEO', 'a b', '<script>', 'a%20b', "a'b", 'a/b', 'a.b', 'a_b'])
      expect(decodeDesign(`orbit=${bad}&bus=smallsat`), bad).toEqual({ bus: 'smallsat' })
  })

  it('rejects values that are not a part id, and lists for single-choice keys', () => {
    for (const bad of [',', '-', ',,,', 'a,,b', '-a-', 'a-', 'leo,geo'])
      expect(decodeDesign(`orbit=${bad}&bus=smallsat`), bad).toEqual({ bus: 'smallsat' })
    for (const bad of [',', 'a,,b', 'a,', '-a', 'a--b'])
      expect(decodeDesign(`instruments=${bad}&bus=smallsat`), bad).toEqual({ bus: 'smallsat' })
    expect(decodeDesign('instruments=camera,gamma-ray-2')).toEqual({ instruments: 'camera,gamma-ray-2' })
  })

  it('a link carries all seven keys, so a slot that is not picked is cleared on arrival', () => {
    const { battery: _battery, solar: _solar, ...partial } = design
    const hash = encodeDesign({ ...partial, solar: 5 })
    expect(decodeDesign(hash)).toEqual({ ...design, battery: '', solar: '' })
    expect(designFromHash(hash)).toHaveLength(7)
    expect(designFromHash(hash)).toContainEqual({ type: 'set_param', payload: { key: 'battery', value: '' } })
  })

  it('rejects oversized input and never throws', () => {
    expect(decodeDesign('orbit=' + 'a'.repeat(257))).toEqual({})
    expect(decodeDesign('bus=smallsat&x=' + 'a'.repeat(3000))).toEqual({})
    const longest = Object.fromEntries(Object.keys(design).map((key) => [key, 'a'.repeat(256)]))
    expect(decodeDesign(encodeDesign(longest))).toEqual(longest)
    for (const junk of ['', '#', '%', '%E0%A4%A', '&&==&', '=', 'room', undefined, null, 5])
      expect(decodeDesign(junk as string)).toEqual({})
  })

  it('turns a hash into one set_param per choice', () => {
    expect(designFromHash('#orbit=leo-500&instruments=camera,spectrometer&evil=1')).toEqual([
      { type: 'set_param', payload: { key: 'orbit', value: 'leo-500' } },
      { type: 'set_param', payload: { key: 'instruments', value: 'camera,spectrometer' } },
    ])
    expect(designFromHash('#room=abc')).toEqual([])
  })
})

describe('saved designs', () => {
  it('saves, lists and deletes', () => {
    fakeStorage()
    expect(listDesigns()).toEqual([])
    saveDesign(' First ', state)
    saveDesign('Second', { ...state, issues: [], params: { ...design, orbit: 'geo' } })
    expect(listDesigns()).toEqual([
      { name: 'First', design, mass_kg: 820, cost_usd: 95e6, power_w: 410, science_per_day: 12, has_error: true },
      { name: 'Second', design: { ...design, orbit: 'geo' }, mass_kg: 820, cost_usd: 95e6, power_w: 410, science_per_day: 12, has_error: false },
    ])
    expect(deleteDesign('Second')?.map((d) => d.name)).toEqual(['First'])
    expect(saveDesign('   ', state)).toBeNull()
    expect(listDesigns().map((d) => d.name)).toEqual(['First'])
  })

  it('says when a save replaced a design, and keeps that design in its place', () => {
    fakeStorage()
    expect(saveDesign('First', state)?.replaced).toBe(false)
    expect(saveDesign('Second', state)?.replaced).toBe(false)
    const result = saveDesign(' First ', { ...state, metrics: { mass_kg: 1 } })
    expect(result?.replaced).toBe(true)
    expect(result?.designs.map((d) => [d.name, d.mass_kg])).toEqual([['First', 1], ['Second', 820]])
  })

  it('reports a failed overwrite and a failed delete instead of showing the old list as success', () => {
    const storage = fakeStorage()
    saveDesign('A', state)
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(saveDesign('A', { ...state, metrics: { mass_kg: 999 } })).toBeNull()
    expect(deleteDesign('A')).toBeNull()
    expect(listDesigns().map((d) => [d.name, d.mass_kg])).toEqual([['A', 820]])
  })

  it('falls back to an empty list when storage is missing, full or corrupted', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(listDesigns()).toEqual([])
    expect(saveDesign('A', state)).toBeNull()
    expect(deleteDesign('A')).toBeNull()

    const full = fakeStorage()
    full.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(saveDesign('A', state)).toBeNull()
    expect(listDesigns()).toEqual([])

    for (const garbage of ['{not json', '"text"', '{"a":1}', 'null', '[null, 3, {"name": 5}, {"design": {}}]']) {
      fakeStorage(garbage)
      expect(listDesigns(), garbage).toEqual([])
    }
  })

  it('keeps only safe fields from a stored entry, with every unset or bad choice as ""', () => {
    fakeStorage(JSON.stringify([{ name: 'X', design: { orbit: 'geo', bus: '<b>', hack: 'y' }, mass_kg: 'heavy', has_error: 'yes' }]))
    expect(listDesigns()).toEqual([
      { name: 'X', design: { ...unset, orbit: 'geo' }, mass_kg: 0, cost_usd: 0, power_w: 0, science_per_day: 0, has_error: false },
    ])
  })

  it('Load sends all seven choices, clearing a slot the saved design had not picked', () => {
    fakeStorage()
    const { battery: _battery, solar: _solar, ...partial } = design
    saveDesign('Mine', { ...state, params: partial })
    const [saved] = listDesigns()
    expect(saved.design).toEqual({ ...design, battery: '', solar: '' })
    expect(loadCommands(saved.design)).toEqual(
      Object.entries({ ...design, battery: '', solar: '' }).map(([key, value]) => ({ type: 'set_param', payload: { key, value } })),
    )
  })
})

describe('SharePanel', () => {
  it('renders labelled controls and a compare table for two saved designs', () => {
    fakeStorage()
    saveDesign('Cheap', state)
    saveDesign('Big', { ...state, issues: [], metrics: { mass_kg: 2400, cost_usd: 3e8 } })
    saveDesign('A  B', state)
    const html = renderToStaticMarkup(<SharePanel state={state} send={() => {}} />)
    expect(html).toContain('>Copy link</button>')
    expect(html).toContain('>Save design</button>')
    expect(html).toMatch(/<label for="sh-name">/)
    expect(html).toContain('aria-label="Load Cheap"')
    expect(html).toContain('aria-label="Delete Big"')
    expect(html).toMatch(/<th scope="col">Cheap<\/th><th scope="col">Big<\/th>/)
    expect(html).toMatch(/<th scope="row">Launch vehicle<\/th><td>Falcon 9<\/td>/)
    expect(html).toContain('Wide Camera, spectrometer')
    // without a value attribute the browser collapses the two spaces and the pick finds nothing
    expect(html).toContain('<option value="A  B"')
    expect(html).toMatch(/<th scope="row">Mass<\/th><td>820 kg<\/td><td>2,400 kg<\/td>/)
  })

  it('renders with no storage at all', () => {
    vi.stubGlobal('localStorage', undefined)
    const html = renderToStaticMarkup(<SharePanel state={state} send={() => {}} />)
    expect(html).toContain('No saved designs yet')
    expect(html).not.toContain('<table')
  })
})
