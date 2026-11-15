import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type { Command, SimState } from '../shared'
import { init, step } from '../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../sim/testing/fixtures'
import { launchCause, tryAgain, WhatWentWrong } from './WhatWentWrong'

const lost = (params: Record<string, string | number>): SimState => {
  let s = init({ ...demoConfig, params: { ...demoConfig.params, ...goodDesign, ...params } }, fixtureDatasets)
  s = step(s, [{ type: 'launch', payload: { override: true } }], 86400).state
  while (s.status !== 'ended') s = step(s, [], 86400).state
  return s
}

it('says which console said NO-GO and why, what happened, and the real practice, with two ways on', () => {
  const html = renderToStaticMarkup(<WhatWentWrong state={lost({ orbit: 'geo' })} campaign onTryAgain={() => {}} onExit={() => {}} onBack={() => {}} />)
  expect(html).toContain('What went wrong')
  expect(html).toContain('PLAN said NO-GO')
  expect(html).toContain('cannot reach Geostationary orbit') // the console's own reason
  expect(html).toContain('Range safety blew it up on purpose')
  expect(html).toContain('payload chart')
  expect(html).toMatch(/<button[^>]*>Try again<\/button><button[^>]*>Mission board<\/button>/)
  expect(html).not.toMatch(/\sopen[=> ]/) // opened with showModal, so it holds the focus
})

it('an in-orbit loss tells that story, and outside the campaign leads to the main menu', () => {
  const html = renderToStaticMarkup(<WhatWentWrong state={lost({ solar: 'solar-body-panels' })} campaign={false} onTryAgain={() => {}} onExit={() => {}} onBack={() => {}} />)
  expect(html).toContain('SPACECRAFT said NO-GO')
  expect(html).toContain('The battery ran flat')
  expect(html).toContain('Main menu')
})

it('the launch cutscene names the cause only for a loss on the way up', () => {
  expect(launchCause('mass_over_limit')).toMatch(/^Too heavy/)
  expect(launchCause('power_negative')).toBeUndefined()
  expect(launchCause(undefined)).toBeUndefined()
})

it('try again resets and fits the same design again', () => {
  const sent: Command[] = []
  tryAgain((c) => sent.push(c), { ...goodDesign, budget_usd: 8e6, solar: 'solar-body-panels' })
  expect(sent[0]).toEqual({ type: 'reset', payload: {} })
  expect(sent).toContainEqual({ type: 'set_param', payload: { key: 'solar', value: 'solar-body-panels' } })
  expect(sent.some((c) => c.type === 'set_param' && c.payload.key === 'budget_usd')).toBe(false) // the money starts again
})
