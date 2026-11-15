import { useEffect, useId, useRef } from 'react'
import { SoundToggle } from '../ui/audio'

interface WorldMenuProps {
  open: boolean
  disabled: boolean
  onOpenChange: (open: boolean) => void
  onClassic: () => void
  onExit: () => void
  online: boolean
}

/** One deliberate menu; the native dialog contains focus and makes the room inert. */
export function WorldMenu({ open, disabled, onOpenChange, onClassic, onExit, online }: WorldMenuProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || disabled) return
      e.preventDefault()
      onOpenChange(!open)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, disabled, onOpenChange])

  useEffect(() => {
    const el = dialog.current!
    if (open && !el.open) {
      document.exitPointerLock?.()
      el.showModal()
    } else if (!open && el.open) {
      el.close()
      document.querySelector<HTMLElement>(disabled ? '.st-skip' : '.mc-canvas, .sc-canvas')?.focus()
    }
  }, [open, disabled])

  return (
    <>
      <button type="button" className="game-button app-world-menu-button" hidden={disabled || open}
        aria-haspopup="dialog" onClick={() => onOpenChange(true)}>Menu <kbd>Esc</kbd></button>
      <dialog ref={dialog} className="game-theme app-world-menu" data-theme="dark" aria-labelledby={title}
        onCancel={(e) => { e.preventDefault(); onOpenChange(false) }}>
        <h1 id={title}>Mission menu</h1>
        <p className="game-muted">{online ? 'Your crew’s mission keeps running.' : 'Take a breath. Your mission is held.'}</p>
        <button type="button" className="game-button" autoFocus onClick={() => onOpenChange(false)}>Back to game</button>
        <SoundToggle />
        <button type="button" className="game-button" onClick={onClassic}>Classic view</button>
        <button type="button" className="game-button" onClick={onExit}>Main menu</button>
        <p className="app-world-controls"><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> run<br />Mouse / arrows look · <kbd>E</kbd> interact</p>
      </dialog>
    </>
  )
}
