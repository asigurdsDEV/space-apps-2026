import { describe, expect, it } from 'vitest'
import { glossaryEntry } from '../learn'
import { HOW_TO_WIN, KEY_TERM_IDS, briefingFacts } from './model'

const facts = (params: Record<string, number | string>, duration_s = 0) =>
  Object.fromEntries(briefingFacts({ params, duration_s }).map((f) => [f.label, f.value]))

describe('briefingFacts', () => {
  it('reads the demo scenario keys from data/', () => {
    expect(facts({ budget_usd: 8_000_000, target_science_score: 30, mission_duration_s: 31_536_000 })).toEqual({
      Budget: '$8 million',
      'Science goal': '30 points',
      'Mission length': '1 year',
    })
  })
  it('falls back to sim names and Config.duration_s', () => {
    expect(facts({ science_goal: 12, mission_days: 90 })).toEqual({ 'Science goal': '12 points', 'Mission length': '90 days' })
    expect(facts({}, 3 * 365 * 86400)).toEqual({ 'Mission length': '3 years' })
  })
  it('skips missing or zero values and shows a deadline only when set', () => {
    expect(facts({ budget_usd: 0, deadline_months: 0, objective_text: 'x' })).toEqual({})
    expect(facts({ budget_usd: 450_000, deadline_months: 18 })).toEqual({ Budget: '$450k', 'Launch deadline': '18 months' })
  })
})

it('has 4–6 key terms and a few win rules, all filled in', () => {
  expect(KEY_TERM_IDS.length).toBeGreaterThanOrEqual(4)
  expect(KEY_TERM_IDS.length).toBeLessThanOrEqual(6)
  // Every key term must exist in the shared glossary, or it would silently disappear.
  expect(KEY_TERM_IDS.every((id) => glossaryEntry(id))).toBe(true)
  expect(HOW_TO_WIN.every((s) => s.length > 20)).toBe(true)
})
