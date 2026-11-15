import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const played: string[] = []
vi.mock('./audio', () => ({ playSound: (name: string) => played.push(name) }))
vi.mock('./ambience', () => ({ alarm: () => played.push('alarm') }))
const { radio, story } = await import('./moments')

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  played.length = 0
})

it('opens and closes a radio line with the voice loop tones, a beat late, once each', () => {
  radio('a')
  radio('a')
  expect(played).toEqual([])
  vi.advanceTimersByTime(250)
  radio('b') // one line replacing another: a single key-up
  vi.advanceTimersByTime(250)
  radio(null)
  radio(null)
  vi.advanceTimersByTime(250)
  expect(played).toEqual(['radio-in', 'radio-in', 'radio-out'])
})

it('starts the alarm and the stingers with their cutscenes, once, with no radio tone over them', () => {
  story('anomaly', 'anomaly-d1', 'anomaly-d1')
  story('anomaly', 'anomaly-d1', 'anomaly-d1') // re-render
  story(undefined, 'anomaly-d1', 'anomaly-d1') // cutscene over, same line stays
  story('ending-loss', 'ending', 'ending')
  vi.advanceTimersByTime(500)
  expect(played).toEqual(['alarm', 'failure'])
  story(undefined, 'ending', null)
  vi.advanceTimersByTime(250)
  expect(played.at(-1)).toBe('radio-out')
  story('anomaly', 'anomaly-d1', 'anomaly-d1') // the same mission flown again
  expect(played.at(-1)).toBe('alarm')
})
