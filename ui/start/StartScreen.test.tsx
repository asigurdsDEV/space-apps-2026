import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { StartScreen } from './StartScreen'
import { scenarios } from '../../data'

it('orders supplied missions by PROGRAM without mutating input and preserves custom missions', () => {
  const custom = { ...scenarios[0], scenario_id: 'custom', title: 'Custom expedition' }
  const supplied = [custom, ...[...scenarios].reverse()]
  const original = [...supplied]
  const html = renderToStaticMarkup(<StartScreen scenarios={supplied} onStart={() => {}} initialStep="mission" />)
  const cards = [...html.matchAll(/data-scenario="(demo|moon|mars|custom)"/g)].map(match => match[1])
  expect(cards).toEqual(['demo', 'moon', 'mars', 'custom'])
  expect(supplied).toEqual(original)
})

it('shows one choice per step: menu, then setup, mission, difficulty', () => {
  const render = (initialStep?: 'setup' | 'mission' | 'difficulty') => renderToStaticMarkup(<StartScreen scenarios={scenarios} onStart={() => {}} initialStep={initialStep} />)
  const menu = render()
  expect(menu).toContain('>Start</button>')
  expect(menu).not.toContain('Play mode')
  const setup = render('setup')
  expect(setup).toContain('Step 1 of 3')
  expect(setup).toContain('value="Mission planner"')
  expect(setup).not.toContain('aria-label="Difficulty"')
  expect(render('mission')).toContain('Step 2 of 3')
  const difficulty = render('difficulty')
  expect(difficulty).toContain('Start mission')
  expect(difficulty).not.toContain('<select')
})
