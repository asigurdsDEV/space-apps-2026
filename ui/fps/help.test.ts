import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { flightHelp, partHelp } from './help'
import { FpsPrompt } from './Prompt'
import type { Decision } from '../../shared'

it('keeps the full catalog description and full anomaly effect outside the short action label', () => {
  expect(partHelp({ id: 'array', kind: 'power_system', name: 'Large array', props: { description: 'More power, but more mass.' } })).toEqual({ title: 'Large array', text: 'More power, but more mass.' })
  const d: Decision = { decision_id: 'd1', card_id: 'storm', console: 'mission-planning', title: 'Storm', body: '', options: [{ id: 'a', label: 'Go to safe mode, edge-on to the wind', effect_text: 'Lose 2 days of science. Drag mostly avoided.' }] }
  const help = flightHelp('option:d1:a', d)!
  const html = renderToStaticMarkup(createElement(FpsPrompt, { locked: true, aimed: { id: 'option:d1:a', at: [0, 1, 0], label: 'Go to safe mode', disabled: "Sam's call", use() {} }, help }))
  expect(html).toContain('Drag mostly avoided')
  expect(html).toContain('Sam&#x27;s call')
  expect(html).toContain('edge-on to the wind')
  expect(flightHelp('option:old:a', d)).toBeUndefined()
})
