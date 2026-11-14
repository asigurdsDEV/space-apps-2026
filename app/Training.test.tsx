// The open flight training, rendered to a string (no browser), and its local progress rules.
// Opening, flying, Esc and Back are clicked through in a real browser instead (no DOM in these tests).

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { routeComplete, trainingRoute } from '../data/pilot-training'
import { simCore } from '../sim'
import { demoConfig, fixtureDatasets } from '../sim/testing/fixtures'
import Training, { partIds, scan, type Progress } from './Training'

const state = simCore.init(demoConfig, fixtureDatasets)

describe('flight training', () => {
  it('opens as the scene box with the HUD over it, the flight pad under it and a way back', () => {
    const html = renderToStaticMarkup(<Training state={state} onClose={() => {}} />)
    expect(html).toContain('Practice only') // labelled as training, not as the mission
    expect(html).toMatch(/<button[^>]*>Back to the mission<\/button>/)
    // The 3D scene is still loading on the first render: its box holds the layout and three.js is not in this chunk.
    expect(html).toMatch(/class="app-training-view">\s*<figure class="s3d-flight app-training-scene" aria-busy="true">/)
    expect(html).toContain('aria-label="Flight HUD"')
    expect(html).toContain(`Next: ${trainingRoute.targets[0]!.label}`)
    for (const target of trainingRoute.targets) expect(html).toContain(target.label)
    expect(html).toContain('Back to the mission</li>') // the HUD's Esc hint
    expect(html).toContain('aria-label="Flight control pad"')
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
