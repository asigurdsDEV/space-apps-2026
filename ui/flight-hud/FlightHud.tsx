// V2 flight HUD: an overlay for the 3D flight scene (V7 mounts it over the scene).
// Pure view: everything comes in as props, actions go out as callbacks. Only its own buttons take clicks.

import './flight-hud.css'
import {
  DEFAULT_HINTS,
  focusLine,
  nextTarget,
  scanShare,
  targetState,
  type ControlHint,
  type HudFocus,
  type HudTarget,
  type Results,
} from './model'

export interface FlightHudProps {
  /** Route intro or current objective, e.g. trainingRoute.intro. */
  objective: string
  targets: readonly HudTarget[]
  /** Outcome of each finished target, from `interact()`. */
  results: Results
  /** The target in the crosshair, from the scene. Null when aiming at nothing. */
  focus?: HudFocus | null
  /** The text `interact()` just returned, and for which target (its real fact is shown once it's finished). */
  message?: { text: string; outcome: 'done' | 'partial' | 'blocked'; id?: string } | null
  /** Route finished: show this text (trainingRoute.complete_text). */
  completeText?: string | null
  /** Control hints from V1 (ui/pilot-input). Defaults to placeholder labels. */
  hints?: readonly ControlHint[]
  onPause?: () => void
  onRecenter?: () => void
  onExit?: () => void
  /** Touch: press and hold to scan/transmit (same as holding the key). */
  onScanStart?: () => void
  onScanEnd?: () => void
}

const STATE_ICON = { done: '✓', partial: '◐', open: '○', locked: '🔒' } as const
const STATE_TEXT = { done: 'done', partial: 'done, partly', open: 'to do', locked: 'locked' } as const

export function FlightHud(props: FlightHudProps) {
  const { objective, targets, results, focus, message, completeText, hints = DEFAULT_HINTS } = props
  const next = nextTarget(targets, results)
  const aimed = focus ? targets.find((t) => t.id === focus.id) : undefined
  const finished = aimed ? targetState(aimed, results) : undefined
  const scanning = !!aimed && !!focus && focus.inRange && finished === 'open'
  const learned = message && message.outcome !== 'blocked' ? targets.find((t) => t.id === message.id) : undefined

  return (
    <div className="fh" aria-label="Flight HUD">
      <section className="fh-panel fh-goals" aria-label="Objectives">
        <p className="fh-objective">{completeText ?? (next ? `Next: ${next.label}` : objective)}</p>
        <ol className="fh-targets">
          {targets.map((t) => {
            const s = targetState(t, results)
            return (
              <li key={t.id} className={`fh-target fh-target--${s}${next?.id === t.id ? ' is-next' : ''}`}>
                <span aria-hidden="true">{STATE_ICON[s]}</span> {t.label}
                <span className="fh-sr"> ({STATE_TEXT[s]})</span>
              </li>
            )
          })}
        </ol>
      </section>

      {aimed && focus && (
        <section className="fh-panel fh-focus" aria-label={`Target: ${aimed.label}`}>
          <p className="fh-focus__name">
            {aimed.kind === 'relay' ? '📡' : '🎯'} {aimed.label}
          </p>
          <p className="fh-focus__line">{finished === 'done' || finished === 'partial' ? 'Already done.' : focusLine(aimed, focus, results)}</p>
          {scanning && (
            <div
              className="fh-scan"
              role="progressbar"
              aria-label={aimed.kind === 'relay' ? 'Transmitting' : 'Scanning'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(scanShare(aimed, focus) * 100)}
            >
              <div className="fh-scan__fill" style={{ width: `${scanShare(aimed, focus) * 100}%` }} />
            </div>
          )}
        </section>
      )}

      {(message || completeText) && (
        <p className={`fh-panel fh-message fh-message--${completeText ? 'done' : message!.outcome}`} role="status" aria-live="polite">
          {completeText ?? message!.text}
          {!completeText && learned && (
            <span className="fh-fact">
              Did you know? {learned.fact}{' '}
              <a href={learned.source_url} target="_blank" rel="noreferrer">
                Source
              </a>
            </span>
          )}
        </p>
      )}

      <section className="fh-panel fh-controls" aria-label="Controls">
        <ul className="fh-hints">
          {hints.map((h) => (
            <li key={h.action}>
              <kbd>{h.keys}</kbd> {h.action}
            </li>
          ))}
        </ul>
        <div className="fh-buttons">
          {props.onScanStart && (
            <button
              type="button"
              className="fh-scan-btn"
              disabled={!scanning}
              onPointerDown={props.onScanStart}
              onPointerUp={props.onScanEnd}
              onPointerLeave={props.onScanEnd}
              onPointerCancel={props.onScanEnd}
            >
              {aimed?.kind === 'relay' ? 'Hold to transmit' : 'Hold to scan'}
            </button>
          )}
          {props.onRecenter && (
            <button type="button" onClick={props.onRecenter}>
              Recenter
            </button>
          )}
          {props.onPause && (
            <button type="button" onClick={props.onPause}>
              Pause
            </button>
          )}
          {props.onExit && (
            <button type="button" onClick={props.onExit}>
              Exit
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
