import { useId, useState } from 'react'
import { rememberTutorial, tutorialDismissed, TUTORIAL_STEPS, type TutorialStepId } from './model'
import './tutorial.css'

export interface BuilderTutorialProps {
  /** Screen owner can scroll/focus the relevant section; the tour does not query others' DOM. */
  onShowStep?: (step: TutorialStepId) => void
}

export function BuilderTutorial({ onShowStep }: BuilderTutorialProps) {
  const id = useId()
  const [dismissed, setDismissed] = useState(tutorialDismissed)
  const [index, setIndex] = useState(0)
  if (dismissed) return null
  const step = TUTORIAL_STEPS[index]
  function finish(reason: 'completed' | 'skipped') {
    rememberTutorial(reason)
    setDismissed(true)
  }
  return (
    <aside className="bt-root" aria-labelledby={`${id}-heading`}>
      <div className="bt-heading"><p>Builder quick tour</p><button type="button" className="bt-skip" onClick={() => finish('skipped')}>Skip tips</button></div>
      <div className="bt-copy" aria-live="polite" aria-atomic="true">
        <p className="bt-counter">Tip {index + 1} of {TUTORIAL_STEPS.length}</p>
        <h2 id={`${id}-heading`}>{step.title}</h2>
        <p>{step.text}</p>
      </div>
      <nav className="bt-actions" aria-label="Builder tips">
        {onShowStep && <button type="button" onClick={() => onShowStep(step.id)}>Show me</button>}
        <div className="bt-navigation">
          <button type="button" disabled={index === 0} onClick={() => setIndex(current => Math.max(0, current - 1))}>Back</button>
          <button type="button" className="bt-primary" onClick={() => index === TUTORIAL_STEPS.length - 1 ? finish('completed') : setIndex(current => current + 1)}>
            {index === TUTORIAL_STEPS.length - 1 ? 'Got it' : 'Next tip'}
          </button>
        </div>
      </nav>
    </aside>
  )
}
