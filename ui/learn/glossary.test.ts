import { describe, expect, it } from 'vitest'
import { GLOSSARY, REQUIRED_TERM_IDS, glossaryEntry } from './glossary'

describe('glossary', () => {
  it('includes every term the board named', () => {
    for (const id of REQUIRED_TERM_IDS) {
      const entry = glossaryEntry(id)
      expect(entry?.id).toBe(id)
      expect(entry?.term.length).toBeGreaterThan(0)
      expect(entry?.meaning.length).toBeGreaterThan(40)
    }
  })

  it('uses unique kebab-case ids', () => {
    const ids = GLOSSARY.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true)
  })

  it('returns undefined for an unknown id', () => {
    expect(glossaryEntry('not-a-term')).toBeUndefined()
  })
})
