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

  it('plays the ending when the mission ends', () => {
    const end: SimEvent = { type: 'scenario_ended', tick: 1, t_s: 1, payload: { reason: 'x', summary: { outcome: 'success' } as Summary } }
    expect(renderToStaticMarkup(<StoryLayer screen="flight" events={[end]} scenarioId="demo" />)).toContain(LINES['ending-success'])
  })
})
