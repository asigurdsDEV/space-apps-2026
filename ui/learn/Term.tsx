import type { ReactNode } from 'react'
import { glossaryEntry } from './glossary'

export interface TermProps {
  /** Glossary id, e.g. `delta-v`. Unknown ids render the children (or the id) with no tooltip. */
  id: string
  /** Visible label. Defaults to the glossary term. */
  children?: ReactNode
}

/**
 * Inline teaching tooltip. Hover or keyboard-focus the word to read the definition.
 * Uses `--game-*` tokens when the shared theme is loaded, with readable fallbacks otherwise.
 */
export function Term({ id, children }: TermProps) {
  const entry = glossaryEntry(id)
  if (!entry) {
    return <span className="learn-term learn-term-missing">{children ?? id}</span>
  }

  const tipId = `learn-tip-${entry.id}`
  return (
    <span className="learn-term">
      <button type="button" className="learn-term-trigger" aria-describedby={tipId}>
        {children ?? entry.term}
      </button>
      <span role="tooltip" id={tipId} className="learn-term-tip">
        <span className="learn-term-tip-title">{entry.term}</span>
        <span className="learn-term-tip-body">{entry.meaning}</span>
      </span>
    </span>
  )
}
