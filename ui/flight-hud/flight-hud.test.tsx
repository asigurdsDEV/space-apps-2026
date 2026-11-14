import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { trainingRoute } from '../../data/pilot-training'
import { FlightHud } from './FlightHud'
import { focusLine, formatDistance, nextTarget, scanShare, targetState } from './model'

const [hurricane, wildfire, relay] = trainingRoute.targets

describe('flight HUD model', () => {
  it('takes claude@jamie V4 targets as they are and orders the route', () => {
    expect([hurricane.id, wildfire.id, relay.id]).toEqual(['hurricane', 'wildfire', 'tdrs-relay'])
    expect(targetState(relay, {})).toBe('locked')
    expect(nextTarget(trainingRoute.targets, {})?.id).toBe('hurricane')
    const both = { hurricane: 'done', wildfire: 'partial' } as const
    expect(targetState(relay, both)).toBe('open')
    expect(nextTarget(trainingRoute.targets, both)?.id).toBe('tdrs-relay')
  })

  it('says fly closer, approach, then scanning', () => {
    expect(focusLine(hurricane, { id: 'hurricane', inRange: false, held_s: 0, distance_m: 1_200_000 }, {})).toBe('Fly closer: 1,200 km away.')
    expect(focusLine(hurricane, { id: 'hurricane', inRange: true, held_s: 0 }, {})).toBe(hurricane.feedback.approach)
    expect(focusLine(hurricane, { id: 'hurricane', inRange: true, held_s: 1 }, {})).toBe(hurricane.feedback.scanning)
    expect(focusLine(relay, { id: 'tdrs-relay', inRange: true, held_s: 0 }, {})).toBe(relay.feedback.blocked)
    expect(formatDistance(850)).toBe('850 m')
    expect(scanShare(hurricane, { id: 'hurricane', inRange: true, held_s: 99 })).toBe(1)
  })
})

describe('FlightHud', () => {
  it('shows objectives, the aimed target with a scan bar, the result and controls', () => {
    const html = renderToStaticMarkup(
      <FlightHud
        objective={trainingRoute.intro}
        targets={trainingRoute.targets}
        results={{ hurricane: 'done' }}
        focus={{ id: 'wildfire', inRange: true, held_s: 1 }}
        message={{ text: 'Got it.', outcome: 'done', id: 'hurricane' }}
        onScanStart={() => {}}
        onPause={() => {}}
      />,
    )
    expect(html).toContain(`Next: ${wildfire.label}`)
    expect(html).toContain('(done)')
    expect(html).toContain('(locked)')
    expect(html).toContain(wildfire.feedback.scanning)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('Got it.')
    expect(html).toContain('Did you know? NASA') // fact text (React escapes the apostrophe)
    expect(html).toContain(`href="${hurricane.source_url}"`)
    expect(html).toContain('Hold to scan')
    expect(html).toContain('>Pause</button>')
    expect(html).not.toContain('>Exit</button>') // no callback, no button
  })

  it('shows the completion text when the route is finished', () => {
    const html = renderToStaticMarkup(
      <FlightHud objective="x" targets={trainingRoute.targets} results={{ hurricane: 'done', wildfire: 'done', 'tdrs-relay': 'done' }} completeText={trainingRoute.complete_text} />,
    )
    expect(html).toContain(trainingRoute.complete_text)
  })
})
