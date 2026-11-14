import { describe, expect, it } from 'vitest'
import { CATALOG_IDS, getPart } from '../index'
import { interact, routeComplete, trainingRoute } from './index'

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const { targets } = trainingRoute

describe('pilot training route', () => {
  it('has three targets with unique kebab ids, real instruments and a sourced fact', () => {
    expect(targets).toHaveLength(3)
    expect(new Set(targets.map((t) => t.id)).size).toBe(3)
    for (const t of targets) {
      expect(t.id).toMatch(KEBAB)
      expect(['observe', 'relay']).toContain(t.kind)
      expect(t.hold_s).toBeGreaterThan(0)
      for (const id of t.instruments) expect(getPart(CATALOG_IDS.instruments, id), `${t.id}/${id}`).toBeDefined()
      for (const id of t.requires) expect(targets.map((x) => x.id), t.id).toContain(id)
      expect(t.source_url).toMatch(/^https:\/\/\S+$/) // GAME_DESIGN.md §4.4: no URL, no number
      expect(t.fact.length).toBeGreaterThan(20)
      for (const k of ['approach', 'scanning', 'done'] as const) expect(t.feedback[k], `${t.id}.${k}`).toBeTruthy()
      if (t.kind === 'observe') expect(t.instruments.length && t.feedback.partial, t.id).toBeTruthy()
      if (t.requires.length) expect(t.feedback.blocked, t.id).toBeTruthy()
    }
  })

  it('needs two observations and a relay, with the relay last', () => {
    expect(targets.filter((t) => t.kind === 'observe')).toHaveLength(2)
    const relay = targets.find((t) => t.kind === 'relay')!
    expect(relay.requires.sort()).toEqual(targets.filter((t) => t.kind === 'observe').map((t) => t.id).sort())
  })

  it('blocks the relay until both observations are done', () => {
    expect(interact('tdrs-relay', [], [])?.outcome).toBe('blocked')
    expect(interact('tdrs-relay', ['hurricane'], [])?.outcome).toBe('blocked')
    expect(interact('tdrs-relay', ['hurricane', 'wildfire'], [])).toMatchObject({ outcome: 'done' })
    expect(interact('nope', [], [])).toBeNull()
  })

  it('the First Light starting design (camera only) finishes, with a hint for the fire', () => {
    const parts = ['cubesat-6u', 'camera-basic', 's-band-patch']
    expect(interact('hurricane', [], parts)?.outcome).toBe('done')
    expect(interact('wildfire', ['hurricane'], parts)).toMatchObject({ outcome: 'partial', text: expect.stringMatching(/infrared/i) })
    expect(routeComplete(['hurricane', 'wildfire'])).toBe(false)
    expect(routeComplete(['wildfire', 'hurricane', 'tdrs-relay'])).toBe(true)
  })
})
