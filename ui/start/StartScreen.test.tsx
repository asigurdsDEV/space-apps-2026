import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { StartScreen } from './StartScreen'
import { scenarios } from '../../data'

it('orders supplied missions by PROGRAM without mutating input and preserves custom missions', () => {
  const custom = { ...scenarios[0], scenario_id: 'custom', title: 'Custom expedition' }
  const supplied = [custom, ...[...scenarios].reverse()]
  const original = [...supplied]
  const html = renderToStaticMarkup(<StartScreen scenarios={supplied} onStart={() => {}} />)
  const options = [...html.matchAll(/<option value="(demo|moon|mars|custom)"/g)].map(match => match[1])
  expect(options).toEqual(['demo', 'moon', 'mars', 'custom'])
  expect(supplied).toEqual(original)
  expect(html).toContain('value="Mission planner"')
})
