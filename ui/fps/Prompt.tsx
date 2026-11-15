// First-person controls and contextual inspection help (decisions 007 and 010).

import { useState } from 'react'
import { WalkTouchControls } from '../pilot-input'
import { currentFps } from './controller'
import type { Interactable } from './model'
import type { InspectionHelp } from './help'

const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export interface FpsPromptProps {
  aimed?: Interactable
  /** From the controller's `blocked` (e.g. "Spacecraft lead: Sam"). */
  blocked?: string
  /** Mouse look is on (pointer lock). */
  locked: boolean
  /** A touch screen: the E button is on screen, so no key name. */
  touch?: boolean
  help?: InspectionHelp
  objective?: string
}

export function FpsPrompt({ aimed, blocked, locked, touch: touchProp, help, objective }: FpsPromptProps) {
  // A phone or tablet: codex@aiden's thumb pads walk, look and use (the prompt is only shown while the room takes input).
  const [touchScreen] = useState(coarse)
  const touch = touchProp ?? touchScreen
  const why = aimed?.disabled ?? blocked
  return (
    <div className={`fps-overlay${touch ? ' fps-overlay--touch' : ''}`}>
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
      {help && <aside className="fps-help" role="note" aria-label="What this does"><strong>{help.title}</strong><p>{help.text}</p></aside>}
      {!locked && !touch && (
        <p className="fps-hint">
          Click to look around · <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> walk · <kbd>E</kbd> use
          {objective && <span className="fps-objective">{objective}</span>}
        </p>
      )}
      {touch && (
        <>
          {objective && <p className="fps-hint">{objective}</p>}
          <div className="fps-touch">
            <WalkTouchControls
              onMove={([right, forward]) => currentFps()?.setMove(forward, right)}
              onLook={([dx, dy]) => currentFps()?.addLook(dx, dy)}
              onInteract={() => currentFps()?.interact()}
              interactLabel="Use"
            />
          </div>
        </>
      )}
    </div>
  )
}
