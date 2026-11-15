// The only words the first-person view shows on its own (decision 007): a dot in the middle,
// "E · <what it does>" when you face something, and how to start looking around.

import type { Interactable } from './model'

export interface FpsPromptProps {
  aimed?: Interactable
  /** From the controller's `blocked` (e.g. "Spacecraft lead: Sam"). */
  blocked?: string
  /** Mouse look is on (pointer lock). */
  locked: boolean
  /** A touch screen: the E button is on screen, so no key name. */
  touch?: boolean
}

export function FpsPrompt({ aimed, blocked, locked, touch }: FpsPromptProps) {
  const why = aimed?.disabled ?? blocked
  return (
    <div className="fps-overlay" aria-hidden={!aimed && locked}>
      <span className={`fps-dot${aimed ? ' fps-dot--on' : ''}`} />
      <p className="fps-prompt" aria-live="polite">
        {aimed ? (
          why ? (
            <span className="fps-why">{why}</span>
          ) : (
            <>
              {!touch && <kbd>E</kbd>} {aimed.label}
            </>
          )
        ) : null}
      </p>
      {!locked && !touch && (
        <p className="fps-hint">
          Click to look around · <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> walk · <kbd>E</kbd> use
        </p>
      )}
    </div>
  )
}
