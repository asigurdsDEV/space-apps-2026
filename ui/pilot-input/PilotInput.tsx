import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { createPilotInput, PILOT_CONTROLS } from './model'
import type { PilotAction, PilotIntent } from './model'
import './pilot-input.css'

export interface PilotInputProps {
  onIntent: (intent: PilotIntent) => void
  onInteract: () => void
  /** Parent pauses/exits training or opens a modal. */
  disabled?: boolean
}

export function PilotInput({ onIntent, onInteract, disabled = false }: PilotInputProps) {
  const root = useRef<HTMLDivElement>(null)
  const input = useRef(createPilotInput())
  const keys = useRef(new Set<string>())
  const callbacks = useRef({ onIntent, onInteract })
  callbacks.current = { onIntent, onInteract }
  const [intent, setIntent] = useState<PilotIntent>(input.current.intent)
  const [focused, setFocused] = useState(false)
  const helpId = useId()

  function publish() {
    const next = input.current.intent()
    setIntent(next)
    callbacks.current.onIntent(next)
  }

  function releaseAll() {
    input.current.clear()
    keys.current.clear()
    publish()
    setFocused(false)
  }

  useEffect(() => {
    const onBlur = () => releaseAll()
    const onVisibility = () => { if (document.hidden) releaseAll() }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      input.current.clear()
      keys.current.clear()
      callbacks.current.onIntent(input.current.intent())
    }
  }, [])

  useEffect(() => { if (disabled) releaseAll() }, [disabled])

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      releaseAll()
      if (event.target instanceof HTMLElement) event.target.blur()
      return
    }
    if (disabled || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return
    const target = event.target
    // Native buttons keep Enter/Space semantics; shortcuts belong to the flight pad.
    const buttonAction = target instanceof HTMLButtonElement ? target.dataset.pilotAction as PilotAction | undefined : undefined
    const buttonKey = buttonAction && (event.code === 'Space' || event.code === 'Enter')
    if (target !== root.current && !buttonKey) return
    const action = buttonKey ? buttonAction : PILOT_CONTROLS.find(control => control.code === event.code)?.action
    if (!action) return
    event.preventDefault()
    if (event.repeat || keys.current.has(event.code)) return
    setFocused(true)
    keys.current.add(event.code)
    input.current.press(`key:${event.code}`, action)
    publish()
    if (action === 'interact') callbacks.current.onInteract()
  }

  function keyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (!keys.current.delete(event.code)) return
    event.preventDefault()
    input.current.release(`key:${event.code}`)
    publish()
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, action: PilotAction) {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    root.current?.focus({ preventScroll: true })
    setFocused(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    input.current.press(`pointer:${event.pointerId}`, action)
    publish()
    if (action === 'interact') callbacks.current.onInteract()
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    input.current.release(`pointer:${event.pointerId}`)
    publish()
  }

  return <section className="pi-root game-panel" aria-label="Flight input">
    <div className="pi-heading"><strong>Flight controls</strong><span>{disabled ? 'Paused' : focused ? 'Controls focused' : 'Controls released'}</span></div>
    <p id={helpId} className="pi-help">Focus the flight pad to use W/S forward/back, A/D left/right, R/F up/down, Space brake and E interact. Hold the buttons on touch. Escape releases controls; Tab leaves normally.</p>
    <div ref={root} className="pi-pad" role="group" aria-label="Flight control pad" aria-describedby={helpId}
      tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
      onFocus={() => { if (!disabled) setFocused(true) }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) releaseAll() }}
      onKeyDown={keyDown} onKeyUp={keyUp}>
      <div className="pi-buttons">
        {PILOT_CONTROLS.map(control => <button key={control.action} type="button" className="game-button pi-hold"
          disabled={disabled} data-pilot-action={control.action}
          onPointerDown={event => pointerDown(event, control.action)} onPointerUp={pointerUp}
          onClick={event => { if (control.action === 'interact' && event.detail === 0) callbacks.current.onInteract() }}
          onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}>
          {control.label} <kbd>{control.key}</kbd>
        </button>)}
      </div>
    </div>
    <div className="pi-footer">
      <button type="button" className="game-button" disabled={disabled} onClick={() => root.current?.focus()}>Enable keyboard controls</button>
      <button type="button" className="game-button" onClick={releaseAll}>Release controls</button>
    </div>
    <output className="pi-intent" aria-label="Movement intent">Forward {intent.forward} · Right {intent.right} · Up {intent.up} · Brake {intent.brake ? 'on' : 'off'} · Interact {intent.interact ? 'held' : 'off'}</output>
  </section>
}
