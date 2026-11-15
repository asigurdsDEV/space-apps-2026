import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { playSound, SoundToggle } from '../ui/audio'
import { getVolume, setVolume } from '../ui/audio/audio'
import { mouseSensitivity, setMouseSensitivity } from '../ui/fps/controller'

interface WorldMenuProps {
  open: boolean
  disabled: boolean
  onOpenChange: (open: boolean) => void
  onClassic: () => void
  onTraining?: () => void
  onExit: () => void
  online: boolean
  children?: ReactNode
}

/** One deliberate menu; the native dialog contains focus and makes the room inert. */
export function WorldMenu({ open, disabled, onOpenChange, onClassic, onTraining, onExit, online, children }: WorldMenuProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const [full, setFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  const canFull = typeof document !== 'undefined' && !!document.fullscreenEnabled
  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

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
    if (open && !disabled && !el.open) {
      document.exitPointerLock?.()
      el.showModal()
      playSound('click')
    } else if ((!open || disabled) && el.open) {
      el.close()
      if (!disabled) playSound('click') // not when a cutscene takes over: its own sound comes now
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
        {children}
        <button type="button" className="game-button" autoFocus onClick={() => onOpenChange(false)}>Back to game</button>
        {onTraining && <button type="button" className="game-button" onClick={onTraining}>Survey the planet</button>}
        <SoundToggle />
        <label className="app-world-setting">Volume
          <input type="range" min="0" max="100" step="5" defaultValue={Math.round(getVolume() * 100)}
            onChange={(e) => setVolume(Number(e.currentTarget.value) / 100)} />
        </label>
        <label className="app-world-setting">Mouse sensitivity
          <input type="range" min="25" max="300" step="5" defaultValue={Math.round(mouseSensitivity() * 100)}
            onChange={(e) => setMouseSensitivity(Number(e.currentTarget.value) / 100)} />
        </label>
        {canFull && <button type="button" className="game-button" aria-pressed={full}
          onClick={() => void (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}>
          Fullscreen {full ? 'on' : 'off'}</button>}
        <button type="button" className="game-button" onClick={onClassic}>Classic view</button>
        <button type="button" className="game-button" onClick={onExit}>Main menu</button>
        <p className="app-world-controls"><kbd>W A S D</kbd> walk · <kbd>Shift</kbd> run<br />Mouse / arrows look · <kbd>E</kbd> interact</p>
      </dialog>
    </>
  )
}
