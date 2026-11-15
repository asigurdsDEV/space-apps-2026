import { useState } from 'react'
import type { Issue } from '../../shared'
import { launchAnywayQuestion } from './model'
import './gonogo.css'

export interface LaunchAnywayProps {
  /** `state.issues` from the sim. */
  issues: Issue[]
  /** Send `launch` with `override: true`. */
  onLaunch: () => void
  /** Co-op: this player does not hold the launch. */
  disabled?: boolean
}

/** Classic view: the plainly secondary way past a NO-GO, asked once. Nothing when no NO-GO can be overruled. */
export function LaunchAnyway({ issues, onLaunch, disabled = false }: LaunchAnywayProps) {
  const question = launchAnywayQuestion(issues)
  // Keyed by the question, so a changed design asks again.
  const [asked, setAsked] = useState<string | null>(null)
  const [back, setBack] = useState(false)
  if (!question) return null
  if (asked === question) {
    return (
      <div className="gng-anyway" role="group" aria-label="Launch anyway">
        <p role="alert">{question}</p>
        <button type="button" className="game-button" autoFocus onClick={() => { setAsked(null); setBack(true) }}>Cancel</button>
        <button type="button" className="game-button" onClick={onLaunch}>Yes, launch anyway</button>
      </div>
    )
  }
  return (
    <div className="gng-anyway">
      <button type="button" className="game-button gng-anyway-start" autoFocus={back} disabled={disabled} onClick={() => setAsked(question)}>
        Launch anyway
      </button>
    </div>
  )
}
