import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { createWalkTouch, walkingVector } from './walk-touch'
import type { WalkVector } from './walk-touch'
import './walk-touch.css'

export interface WalkTouchControlsProps {
  /** Held [right, forward], magnitude <= 1. Reset to zero when released. */
  onMove: (move: WalkVector) => void
  /** Incremental [right, down] CSS pixels. Apply once, not every frame. */
  onLook: (delta: WalkVector) => void
  onInteract: () => void
  disabled?: boolean
  interactLabel?: string
}

export function WalkTouchControls({ onMove, onLook, onInteract, disabled = false, interactLabel = 'Interact' }: WalkTouchControlsProps) {
  const input = useRef(createWalkTouch())
  const callbacks = useRef({ onMove, onLook, onInteract })
  callbacks.current = { onMove, onLook, onInteract }
  const keys = useRef(new Set<string>())
  const [move, setMove] = useState<WalkVector>([0, 0])
  const help = useId()

  function publish(value: WalkVector) { setMove(value); callbacks.current.onMove(value) }
  function release() { input.current.clear(); keys.current.clear(); publish([0, 0]) }

  useEffect(() => {
    const blur = () => release()
    const hidden = () => { if (document.hidden) release() }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') release() }
    window.addEventListener('blur', blur)
    window.addEventListener('keydown', escape)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', blur)
      window.removeEventListener('keydown', escape)
      document.removeEventListener('visibilitychange', hidden)
      input.current.clear()
      callbacks.current.onMove([0, 0])
    }
  }, [])
  useEffect(() => { if (disabled) release() }, [disabled])

  function start(event: PointerEvent<HTMLDivElement>, pad: 'move' | 'look') {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    const accepted = pad === 'move' ? input.current.startMove(event.pointerId) : input.current.startLook(event.pointerId, event.clientX, event.clientY)
    if (!accepted) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    update(event, pad)
  }
  function update(event: PointerEvent<HTMLDivElement>, pad: 'move' | 'look') {
    if (disabled) return
    if (pad === 'look') {
      const delta = input.current.look(event.pointerId, event.clientX, event.clientY)
      if (delta && (delta[0] || delta[1])) callbacks.current.onLook(delta)
    } else {
      const rect = event.currentTarget.getBoundingClientRect()
      const next = input.current.move(event.pointerId, event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, Math.min(rect.width, rect.height) / 2)
      if (next) publish(next)
    }
  }
  function end(event: PointerEvent<HTMLDivElement>) { if (input.current.release(event.pointerId)) publish([0, 0]) }
  function keyboard(event: KeyboardEvent<HTMLDivElement>, pad: 'move' | 'look', pressed: boolean) {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault(); event.stopPropagation()
    if (pad === 'look') {
      if (pressed) callbacks.current.onLook([event.key === 'ArrowRight' ? 12 : event.key === 'ArrowLeft' ? -12 : 0, event.key === 'ArrowDown' ? 12 : event.key === 'ArrowUp' ? -12 : 0])
      return
    }
    if (pressed) keys.current.add(event.key); else keys.current.delete(event.key)
    publish(walkingVector(Number(keys.current.has('ArrowRight')) - Number(keys.current.has('ArrowLeft')), Number(keys.current.has('ArrowDown')) - Number(keys.current.has('ArrowUp')), 1))
  }

  return <div className="wt-controls" role="group" aria-label="Walking touch controls" aria-describedby={help}>
    <span id={help} className="wt-help">Drag Move to walk and Look to turn. Focus either pad and use arrow keys. Tab reaches Interact. Escape releases movement.</span>
    {(['move', 'look'] as const).map(pad => <div key={pad} className={`wt-pad wt-${pad}`} role="group" aria-label={`${pad === 'move' ? 'Move' : 'Look'} pad`} aria-describedby={help}
      tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
      onPointerDown={event => start(event, pad)} onPointerMove={event => update(event, pad)}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onKeyDown={event => keyboard(event, pad, true)} onKeyUp={event => keyboard(event, pad, false)}
      onBlur={() => { if (keys.current.size) release() }}>
      <span>{pad === 'move' ? 'Move' : 'Look'}</span>
      {pad === 'move' ? <span className="wt-stick" aria-hidden="true" style={{ transform: `translate(${move[0] * 32}px, ${-move[1] * 32}px)` }}>✥</span> : <span aria-hidden="true">↔ ↕</span>}
    </div>)}
    <button className="wt-interact game-button" type="button" disabled={disabled}
      onPointerDown={event => {
        if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
        // Act on press so another held finger does not suppress the native touch click.
        event.preventDefault()
        callbacks.current.onInteract()
      }}
      onClick={event => { if (!disabled && event.detail === 0) callbacks.current.onInteract() }}>{interactLabel}</button>
  </div>
}
