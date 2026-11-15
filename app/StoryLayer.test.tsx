import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { SimEvent, Summary } from '../shared'
import { LINES } from '../ui/story'
import { StoryLayer } from './StoryLayer'

describe('StoryLayer', () => {
  it('opens a mission with the arrival cutscene, captioned with CAPCOM\'s call', () => {
    const html = renderToStaticMarkup(<StoryLayer screen="briefing" scenarioId="moon-hard" />)
    expect(html).toContain('st-cutscene')
    expect(html).toContain(LINES['call-moon'])
    expect(html).toContain('class="cs"') // ui/cutscenes' scene is inside the frame
  })

  it('has CAPCOM speak on screens without a cutscene', () => {
    const html = renderToStaticMarkup(<StoryLayer screen="design" scenarioId="demo" />)
    expect(html).toContain('st-capcom')
    expect(html).not.toContain('st-cutscene')
  })

  it('keeps first-person radio as a subtitle without a dismiss menu', () => {
    const html = renderToStaticMarkup(<StoryLayer immersive screen="design" scenarioId="demo" />)
    expect(html).toContain('app-world-radio')
    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain('<button')
  })

  it('keeps live part feedback in the same first-person radio without a second pop-out', () => {
    const html = renderToStaticMarkup(<StoryLayer immersive screen="design" scenarioId="demo"
      callout={{ key: 'fit-1', text: 'Copy, Flight. Magnetometer added.' }} />)
    expect(html).toContain('app-world-radio')
    expect(html).toContain('Magnetometer added')
    expect(html).not.toContain('st-pop')
    expect(html).not.toContain('<button')
  })

  it('plays the ending when the mission ends', () => {
    const end: SimEvent = { type: 'scenario_ended', tick: 1, t_s: 1, payload: { reason: 'x', summary: { outcome: 'success' } as Summary } }
    expect(renderToStaticMarkup(<StoryLayer screen="flight" events={[end]} scenarioId="demo" />)).toContain(LINES['ending-success'])
  })
})

// Timers need a DOM to mount in; the hold is covered by reading the wiring: the pop-out must offer the hooks.
describe('CAPCOM pop-out', () => {
  it('reports hover and focus so the layer can keep it open', async () => {
    const { CapcomPopout } = await import('../ui/story')
    const holds: boolean[] = []
    const el = CapcomPopout({ line: 'call-moon', onHold: (h) => holds.push(h) }) as { props: Record<string, () => void> }
    el.props.onMouseEnter!()
    el.props.onFocus!()
    el.props.onBlur!()
    el.props.onMouseLeave!()
    expect(holds).toEqual([true, true, false, false])
  })
})
