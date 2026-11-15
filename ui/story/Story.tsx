// Pop-outs for the first-person story (decision 005). Pure views: they show what they're given
// and call back; app/ decides when. No 3D here: a cutscene's scene comes in as `children` from ui/scene3d.

import { useEffect, useRef, type ReactNode } from 'react'
import { glossaryEntry } from '../learn'
import { CUTSCENE_MS, LINES, type CutsceneId, type LineId } from './model'
import './story.css'

/** CAPCOM's line, one at a time. Announced politely to screen readers. `text` overrides `line` (live callouts). */
export function CapcomPopout({ line, text, onClose, onHold }: { line?: LineId; text?: string; onClose?: () => void; /** The pointer is over it or focus is in it (true), or left (false): the owner keeps it open meanwhile. */ onHold?: (held: boolean) => void }) {
  return (
    <aside
      className="st-pop st-capcom"
      role="status"
      aria-live="polite"
      aria-label="CAPCOM"
      onMouseEnter={() => onHold?.(true)}
      onMouseLeave={() => onHold?.(false)}
      onFocus={() => onHold?.(true)}
      onBlur={() => onHold?.(false)}
    >
      <span className="st-speaker" aria-hidden="true">CAPCOM</span>
      <p className="st-line">{text ?? (line ? LINES[line] : '')}</p>
      {onClose && (
        <button type="button" className="st-button" onClick={onClose}>
          Got it
        </button>
      )}
    </aside>
  )
}

/** "Did you know?" from the glossary (ui/learn). Nothing when the term is unknown. */
export function FactPopout({ termId, onClose }: { termId: string; onClose: () => void }) {
  const entry = glossaryEntry(termId)
  if (!entry) return null
  return (
    <aside className="st-pop st-fact" aria-label={`Did you know: ${entry.term}`}>
      <span className="st-speaker">Did you know?</span>
      <p className="st-line">
        <strong>{entry.term}:</strong> {entry.meaning}
      </p>
      <button type="button" className="st-button" onClick={onClose}>
        Close
      </button>
    </aside>
  )
}

/** A station's task (builder, poll, mission…) popped out over the first-person room. */
export function TaskPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="st-panel" aria-label={label}>
      {children}
    </section>
  )
}

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export interface CutsceneProps {
  id: CutsceneId
  /** Shown the whole time, as a caption. Usually CAPCOM's line for the beat. */
  caption: string
  /** Called once: when the cutscene ends, on Skip, or on Esc. */
  onDone: () => void
  /** The 3D scene from ui/scene3d. Without it (or with reduced motion) a still is shown. */
  children?: ReactNode
  /** Defaults to CUTSCENE_MS[id] (10 s at most). */
  durationMs?: number
}

/** Full-screen frame for a cutscene: skippable (button, Esc), captioned, still under reduced motion. */
export function Cutscene({ id, caption, onDone, children, durationMs }: CutsceneProps) {
  const done = useRef(false)
  const finish = useRef(onDone)
  finish.current = onDone
  const skip = useRef<HTMLButtonElement>(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    const end = () => {
      if (done.current) return
      done.current = true
      finish.current()
    }
    const timer = setTimeout(end, Math.min(durationMs ?? CUTSCENE_MS[id], 10_000))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && end()
    addEventListener('keydown', onKey)
    skip.current?.focus()
    return () => {
      clearTimeout(timer)
      removeEventListener('keydown', onKey)
    }
  }, [id, durationMs])

  return (
    <div className={`st-cutscene is-${id}`} role="dialog" aria-modal="true" aria-label="Cutscene">
      <div className="st-scene" aria-hidden="true">
        {children && !reduced ? children : <div className="st-still" />}
      </div>
      <p className="st-caption" aria-live="polite">{caption}</p>
      <button
        ref={skip}
        type="button"
        className="st-button st-skip"
        onClick={() => {
          if (done.current) return
          done.current = true
          finish.current()
        }}
      >
        Skip ▸
      </button>
    </div>
  )
}
