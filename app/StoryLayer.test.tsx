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
  })

  it('has CAPCOM speak on screens without a cutscene', () => {
    const html = renderToStaticMarkup(<StoryLayer screen="design" scenarioId="demo" />)
    expect(html).toContain('st-capcom')
    expect(html).not.toContain('st-cutscene')
  })

  it('plays the ending when the mission ends', () => {
    const end: SimEvent = { type: 'scenario_ended', tick: 1, t_s: 1, payload: { reason: 'x', summary: { outcome: 'success' } as Summary } }
    expect(renderToStaticMarkup(<StoryLayer screen="flight" events={[end]} scenarioId="demo" />)).toContain(LINES['ending-success'])
  })
})
