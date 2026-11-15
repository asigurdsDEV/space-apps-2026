import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import type { DailyEvent } from './dailyEvent'

const LiveEarth = lazy(() => import('../ui/live/LiveEarth'))

interface DailyEventDialogProps {
  event: DailyEvent
  /** The title of the mission this daily flies. */
  mission?: string
  onStart: () => void
  onCancel: () => void
}

/** "15 Nov 2026, 09:00 UTC". */
export function asOfText(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return 'an unknown time'
  return `${at.toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC`
}

/** Before the daily starts: the real event it is built on. A native modal dialog, like the Mission menu: it holds the focus and Esc cancels. */
export function DailyEventDialog({ event, mission, onStart, onCancel }: DailyEventDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (!dialog.current!.open) dialog.current!.showModal()
  }, [])
  // close() before the dialog is unmounted, so the browser gives the focus back to the button that opened it.
  const leave = (then: () => void) => () => {
    dialog.current?.close()
    then()
  }

  return (
    <dialog ref={dialog} className="game-theme app-world-menu app-daily-event" data-theme="dark" aria-labelledby={title}
      onCancel={(e) => { e.preventDefault(); leave(onCancel)() }}>
      <h1 id={title}>Today’s event</h1>
      <h2>{event.title}</h2>
      <p>{event.text}</p>
      {mission && <p>Today’s daily mission is {mission}. This event is its first alarm, when your design can meet it.</p>}
      <p className="game-muted">Source: {event.source}, as of <time dateTime={event.asOf}>{asOfText(event.asOf)}</time>.</p>
      <button type="button" className="game-button" autoFocus onClick={leave(onStart)}>Start daily mission</button>
      <button type="button" className="game-button" onClick={() => setLive(true)}>See it live</button>
      {live && <Suspense fallback={null}><LiveEarth onClose={() => setLive(false)} /></Suspense>}
      <button type="button" className="game-button" onClick={leave(onCancel)}>Cancel</button>
    </dialog>
  )
}
