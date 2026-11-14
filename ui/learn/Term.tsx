import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import { glossaryEntry } from './glossary'

const TIP_WIDTH_PX = 352 /* min(22rem, 70vw) at a typical root font size */

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
  const uid = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const [tipEnd, setTipEnd] = useState(false)
  const entry = glossaryEntry(id)

  const placeTip = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const left = root.getBoundingClientRect().left
    const maxWidth = Math.min(TIP_WIDTH_PX, window.innerWidth * 0.7, window.innerWidth - 16)
    setTipEnd(left + maxWidth > window.innerWidth - 8)
  }, [])

  if (!entry) {
    return <span className="learn-term learn-term-missing">{children ?? id}</span>
  }

  const tipId = `learn-tip-${entry.id}-${uid}`
  const tipClass = tipEnd ? 'learn-term-tip learn-term-tip--end' : 'learn-term-tip'
  return (
    <span ref={rootRef} className="learn-term" onMouseEnter={placeTip}>
      <button type="button" className="learn-term-trigger" aria-describedby={tipId} onFocus={placeTip}>
        {children ?? entry.term}
      </button>
      <span role="tooltip" id={tipId} className={tipClass}>
        <span className="learn-term-tip-title">{entry.term}</span>
        <span className="learn-term-tip-body">{entry.meaning}</span>
      </span>
    </span>
  )
}
