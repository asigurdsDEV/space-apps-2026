// The open flight training, rendered to a string (no browser), and its local progress rules.
// Opening, flying, Esc and Back are clicked through in a real browser instead (no DOM in these tests).

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { routeComplete } from '../data/pilot-training'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets } from '../sim/testing/fixtures'
import Training, { partIds, scan, type Progress } from './Training'

const state = simCore.init(demoConfig, fixtureDatasets)

describe('flight training', () => {
  it('opens as the flight used to pick a place, with a way back and no storm or fire marks', () => {
    const html = renderToStaticMarkup(<Training state={state} onClose={() => {}} />)
    expect(html).toContain('Practice only')
    expect(html).toMatch(/<button[^>]*>Back to the mission<\/button>/)
    expect(html).toMatch(/class="app-training-view">\s*<figure class="s3d-flight app-training-scene" aria-busy="true">/)
    expect(html).not.toContain('Hurricane')
    expect(html).not.toContain('Wildfire')
    expect(html).toContain('aria-label="Flight control pad"')
  })

  it('lets a guest follow the host spot and does not give them the flight controls', () => {
    const html = renderToStaticMarkup(
      <Training
        state={state}
        onClose={() => {}}
        survey={{
          host: false,
          seat: 1,
          report() {},
          subscribe(listener) {
            listener({ lat: 36.1, lon: -112.14, placed: true, landed: false }, [])
            return () => {}
          },
        }}
      />,
    )
    expect(html).toContain('Only the host can move the landing spot')
    expect(html).not.toContain('s3d-flight')
    expect(html).not.toContain('Flight control pad')
    expect(html).not.toContain('Walk Taurus-Littrow')
  })

  it('keeps a moon guest off the valley until the host has placed it', () => {
    const moon = {
      ...state,
      entities: [...state.entities.filter((entity) => entity.id !== 'earth'), { id: 'moon', kind: 'body', name: 'Moon', props: {} }],
    }
    const html = renderToStaticMarkup(
      <Training
        state={moon}
        onClose={() => {}}
        survey={{
          host: false,
          seat: 1,
          report() {},
          subscribe(listener) {
            listener({ lat: 0, lon: 0, placed: false, landed: false }, [])
            return () => {}
          },
        }}
      />,
    )
    expect(html).toContain('Only the host can choose the lunar landing spot')
    expect(html).not.toContain('Walk Taurus-Littrow')
    expect(html).not.toContain('Flight control pad')
  })

  it('reads the player’s part ids from the design', () => {
    const parts = partIds({ params: { bus: 'cubesat-6u', instruments: 'camera-basic,ir-spectrometer', budget_usd: 5 } })
    expect(parts).toEqual(['cubesat-6u', 'camera-basic', 'ir-spectrometer'])
  })

  it('keeps the route’s progress: done with the right instrument, partly done without, the relay only after both', () => {
    const parts = ['camera-basic']
    let progress: Progress = { results: {}, message: null }
    progress = scan(progress, 'tdrs-relay', parts)
    expect(progress.results).toEqual({}) // too early does not count
    expect(progress.message).toMatchObject({ outcome: 'blocked', id: 'tdrs-relay' })
    progress = scan(progress, 'hurricane', parts)
    progress = scan(progress, 'wildfire', parts)
    expect(progress.results).toEqual({ hurricane: 'done', wildfire: 'partial' })
    expect(progress.message).toMatchObject({ outcome: 'partial', id: 'wildfire' })
    expect(routeComplete(Object.keys(progress.results))).toBe(false)
    progress = scan(progress, 'tdrs-relay', parts)
    expect(routeComplete(Object.keys(progress.results))).toBe(true)
    expect(scan(progress, 'no-such-target', parts)).toBe(progress)
  })
})
