import { useEffect, useId, useRef, useState } from 'react'
import { rememberTutorial, tutorialDismissed, TUTORIAL_STEPS, type TutorialStepId } from './model'
import './tutorial.css'

export interface BuilderTutorialProps {
  /** Optional focus/scroll callback, invoked after closing the tour. */
  onShowStep?: (step: TutorialStepId) => void
}

export function BuilderTutorial({ onShowStep }: BuilderTutorialProps) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const replay = useRef<HTMLButtonElement>(null)
  const showAfterClose = useRef<(() => void) | null>(null)
  const [dismissed, setDismissed] = useState(tutorialDismissed)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (dismissed) return
    const element = dialog.current!
    const previous = document.activeElement
    element.showModal()
    heading.current?.focus()
    return () => {
      element.close()
      if (showAfterClose.current) {
        showAfterClose.current(); showAfterClose.current = null
      } else if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus()
      else replay.current?.focus()
    }
  }, [dismissed])
  const step = TUTORIAL_STEPS[index]
  function finish(reason: 'completed' | 'skipped') {
    rememberTutorial(reason)
    setDismissed(true)
  }
  return <>
    <button ref={replay} type="button" className="bt-replay" onClick={() => { setIndex(0); setDismissed(false) }}>Builder tips <span aria-hidden="true">↗</span></button>
    {!dismissed && <dialog ref={dialog} className="bt-root" aria-labelledby={`${id}-heading`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); finish('skipped') }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus() }
      }}>
      <div className="bt-heading"><p>Preflight / Quick tour</p><button type="button" className="bt-skip" onClick={() => finish('skipped')}>Skip tips</button></div>
      <div className="bt-progress" aria-hidden="true">{TUTORIAL_STEPS.map((item, position) => <span key={item.id} className={position <= index ? 'bt-progress-done' : ''} />)}</div>
      <div className="bt-copy" aria-live="polite" aria-atomic="true">
        <p className="bt-counter">Tip {index + 1} of {TUTORIAL_STEPS.length}</p>
        <h2 ref={heading} tabIndex={-1} id={`${id}-heading`}>{step.title}</h2>
        <p id={`${id}-description`}>{step.text}</p>
      </div>
      <nav className="bt-actions" aria-label="Builder tips">
        {onShowStep && <button type="button" onClick={() => { showAfterClose.current = () => onShowStep(step.id); finish('skipped') }}>Show me in builder</button>}
        <div className="bt-navigation">
          <button type="button" disabled={index === 0} onClick={() => { setIndex(current => Math.max(0, current - 1)); heading.current?.focus() }}>Back</button>
          <button type="button" className="bt-primary" onClick={() => index === TUTORIAL_STEPS.length - 1 ? finish('completed') : setIndex(current => current + 1)}>
            {index === TUTORIAL_STEPS.length - 1 ? 'Got it' : 'Next tip'}
          </button>
        </div>
      </nav>
      <p className="bt-footer">Press Escape to skip. Reopen with Builder tips anytime.</p>
    </dialog>}
  </>
}
