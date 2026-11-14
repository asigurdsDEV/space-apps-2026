import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Term } from './Term'
import { ANOMALY_TERM_IDS, AUDIT_TERM_IDS, GLOSSARY, REQUIRED_TERM_IDS, glossaryEntry } from './glossary'

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

  it('matches the cited DSN and reaction-wheel caveats', () => {
    expect(glossaryEntry('deep-space-network')?.meaning).toMatch(/launch or landing/)
    expect(glossaryEntry('deep-space-network')?.meaning).toMatch(/launch/)
    expect(glossaryEntry('reaction-wheel')?.meaning).not.toMatch(/If a wheel stops, the pointing gets coarse/)
    expect(glossaryEntry('reaction-wheel')?.meaning).toMatch(/Kepler/)
  })

  it('includes the audit terms for power and coverage', () => {
    for (const id of AUDIT_TERM_IDS) {
      const entry = glossaryEntry(id)
      expect(entry?.id).toBe(id)
      expect(entry?.meaning.length).toBeGreaterThan(40)
    }
    expect(glossaryEntry('solar-flux')?.meaning).toMatch(/43%/)
    expect(glossaryEntry('rtg')?.meaning).toMatch(/plutonium/)
    expect(glossaryEntry('coverage')?.meaning).toMatch(/80%/)
  })

  it('includes the anomaly-card terms', () => {
    for (const id of ANOMALY_TERM_IDS) {
      const entry = glossaryEntry(id)
      expect(entry?.id).toBe(id)
      expect(entry?.meaning.length).toBeGreaterThan(40)
    }
  })

  it('gives each use of the same term its own tooltip id', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        createElement(Term, { id: 'drag' }),
        createElement(Term, { id: 'drag' }),
      ),
    )
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every((id) => id.startsWith('learn-tip-drag-'))).toBe(true)
  })
})
