import { describe, expect, it } from 'vitest'
import { rememberTutorial, tutorialDismissed, TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY } from './model'
function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
describe('builder tips persistence', () => {
  it('shows first-time tips and remembers completion across readers', () => {
    const saved = storage(); expect(tutorialDismissed(saved)).toBe(false)
    expect(rememberTutorial('completed', saved)).toBe(true)
    expect(tutorialDismissed(saved)).toBe(true)
    expect(saved.getItem(TUTORIAL_STORAGE_KEY)).toBe('completed')
  })
  it('remembers Skip without marking the tour complete', () => {
    const saved = storage(); rememberTutorial('skipped', saved)
    expect(tutorialDismissed(saved)).toBe(true)
    expect(saved.getItem(TUTORIAL_STORAGE_KEY)).toBe('skipped')
  })
  it('does not hide tips for malformed or unrecognized saved preferences', () => {
    const saved = storage(); saved.setItem(TUTORIAL_STORAGE_KEY, '{broken')
    expect(tutorialDismissed(saved)).toBe(false)
  })
  it('contains blocked reads and quota/write errors', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota') } }
    expect(tutorialDismissed(blocked)).toBe(false)
    expect(rememberTutorial('completed', blocked)).toBe(false)
  })
  it('has four stable targets in the teaching order', () => {
    expect(TUTORIAL_STEPS.map(step => step.id)).toEqual(['orbit', 'budgets', 'issues', 'launch'])
  })
})
