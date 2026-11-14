import { useEffect, useMemo, useRef, useState } from 'react'
import type { Issue } from '../../shared'
import { playSound } from '../audio'
import { canLaunch, poll, soundFor, type Call } from './model'
import './gonogo.css'

export interface GoNoGoPollProps {
  /** `state.issues` from the sim, after the last design step. */
  issues: Issue[]
  /** Send the `launch` command. Only reachable when no console is NO-GO. */
  onLaunch: () => void
  /** Back to the builder to fix things. */
  onBack: () => void
  /** Pause between console calls, in ms. */
  stepMs?: number
}

const CALL_TEXT: Record<Call, string> = { go: 'GO', 'go-concerns': 'GO, with concerns', 'no-go': 'NO-GO' }

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function GoNoGoPoll({ issues, onLaunch, onBack, stepMs = 700 }: GoNoGoPollProps) {
  const calls = useMemo(() => poll(issues), [issues])
  const [shown, setShown] = useState(() => (reducedMotion() ? calls.length : 0))

  useEffect(() => setShown(reducedMotion() ? calls.length : 0), [calls])
  useEffect(() => {
    if (shown >= calls.length) return
    const t = setTimeout(() => setShown((n) => n + 1), stepMs)
    return () => clearTimeout(t)
  }, [shown, calls.length, stepMs])

  // Sound for each console as it calls (ui/audio handles mute and reduced motion).
  const heard = useRef(0)
  useEffect(() => {
    const sound = soundFor(calls.slice(heard.current, shown))
    heard.current = shown
    if (sound) playSound(sound)
  }, [shown, calls])

  const done = shown >= calls.length
  const go = canLaunch(calls)
  const blockers = calls.filter((c) => c.call === 'no-go').map((c) => c.label)

  return (
    <section className="gng game-panel" aria-labelledby="gng-title">
      <p className="game-eyebrow">Flight director</p>
      <h2 id="gng-title">GO / NO-GO poll</h2>
      <p className="game-muted">Every console must be GO before launch. Each one checks part of your design.</p>

      <ol className="gng-consoles">
        {calls.map((c, i) => {
          const visible = i < shown
          return (
            <li key={c.id} className={`gng-console gng-${visible ? c.call : 'waiting'}`} aria-live="polite">
              <span className="gng-name">{c.label}</span>
              <strong className="gng-call">{visible ? CALL_TEXT[c.call] : 'Standing by…'}</strong>
              {visible && c.reasons.length > 0 && (
                <ul className="gng-reasons">
                  {c.reasons.map((r) => (
                    <li key={r.code}>{r.message}</li>
                  ))}
                </ul>
              )}
              {visible && c.call === 'go' && <p className="gng-reasons">All checks good.</p>}
            </li>
          )
        })}
      </ol>

      {!done && (
        <button type="button" className="game-button" onClick={() => setShown(calls.length)}>
          Skip the poll
        </button>
      )}
      {done && (
        <div className="gng-actions">
          <button type="button" className="game-button" onClick={onBack}>
            Back to design
          </button>
          <button type="button" className="game-button game-button--primary" disabled={!go} onClick={onLaunch}>
            Launch
          </button>
          <p className="gng-verdict" role="status">
            {!go
              ? `Launch is on hold: ${blockers.join(', ')} ${blockers.length > 1 ? 'are' : 'is'} NO-GO.`
              : calls.every((c) => c.call === 'go')
                ? 'All consoles GO. You are clear for launch.'
                : 'No console is NO-GO, so you are clear for launch. Read the concerns first.'}
          </p>
        </div>
      )}
    </section>
  )
}
