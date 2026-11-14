// Flight training (decision 006): ui/scene3d's FlightView with the V2 HUD over it and the V1 pad feeding it.
// The route's progress is React state in here and nowhere else: nothing sends a command, and the mission's
// science, score and stars never change. Loaded only when the player opens it (see App.tsx).

import { useEffect, useRef, useState } from 'react'
import { interact, routeComplete, trainingRoute } from '../data/pilot-training'
import type { SimState } from '../shared'
import { DEFAULT_HINTS, FlightHud, type FlightHudProps, type HudFocus, type Results } from '../ui/flight-hud'
import { PilotInput, type PilotIntent } from '../ui/pilot-input'
import { FlightView } from '../ui/scene3d'

export interface Progress {
  results: Results
  message: FlightHudProps['message']
}

/** Every part id of the player's design (the picks are strings; instruments are a comma list). */
export const partIds = (state: Pick<SimState, 'params'>): string[] =>
  Object.values(state.params).flatMap((value) => (typeof value === 'string' ? value.split(',') : []))

/** The player finished (or, for a locked target, tried) target `id`: the HUD message, and the result unless it was too early. */
export function scan(progress: Progress, id: string, parts: readonly string[]): Progress {
  const result = interact(id, Object.keys(progress.results), parts)
  if (!result) return progress
  const { outcome } = result
  return { results: outcome === 'blocked' ? progress.results : { ...progress.results, [id]: outcome }, message: { ...result, id } }
}

// The route is written for Earth (a hurricane, a wildfire), whatever planet the mission goes to.
const BODY = (['earth', 'moon', 'mars'] as const).find((body) => body === trainingRoute.body)
const IDLE: PilotIntent = { forward: 0, right: 0, up: 0, brake: false, interact: false }
// In here Esc leaves the training, so the HUD's last hint says so.
const HINTS = [...DEFAULT_HINTS.slice(0, -1), { keys: 'Esc', action: 'Back to the mission' }]
const MESSAGE_MS = 12_000

export interface TrainingProps {
  /** Read for the craft's parts only. */
  state: SimState
  /** The Back button or Esc. */
  onClose: () => void
}

export default function Training({ state, onClose }: TrainingProps) {
  const root = useRef<HTMLElement>(null)
  const [intent, setIntent] = useState(IDLE)
  const [scanHeld, setScanHeld] = useState(false)
  const [focus, setFocus] = useState<HudFocus | null>(null)
  const [progress, setProgress] = useState<Progress>({ results: {}, message: null })
  const parts = partIds(state)
  const done = Object.keys(progress.results)

  // V1's keys only work while its pad has the focus, and it has no prop for that.
  const focusPad = () => root.current?.querySelector<HTMLElement>('.pi-pad')?.focus({ preventScroll: true })
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    // The app's panel starts well down the page; the scene and the pad only fit the window from the training's own top.
    root.current?.scrollIntoView()
    focusPad()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // A result steps aside after a while: on a phone its panel sits over the craft.
  useEffect(() => {
    if (!progress.message) return
    const timer = setTimeout(() => setProgress((p) => ({ ...p, message: null })), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [progress.message])

  const onFocus = (next: HudFocus | null) => {
    setFocus(next)
    const target = trainingRoute.targets.find((t) => t.id === next?.id)
    if (!next || !target || next.held_s < target.hold_s) return
    setScanHeld(false)
    setProgress((p) => scan(p, next.id, parts))
  }
  // The view only counts a hold on a target that is still to do, so "too early" is said on the press instead.
  const press = () => {
    if (focus?.inRange && interact(focus.id, done, parts)?.outcome === 'blocked') setProgress((p) => scan(p, focus.id, parts))
  }

  return (
    <section ref={root} className="app-training" aria-labelledby="app-training-title">
      <header className="app-training-bar">
        <div>
          <h2 id="app-training-title">Flight training</h2>
          <p className="game-muted">Practice only: nothing here changes your mission or your score.</p>
        </div>
        <button type="button" className="game-button app-small" onClick={onClose}>
          Back to the mission
        </button>
      </header>
      {/* A click on the scene gives the keys back to the pad. */}
      <div className="app-training-view" onClick={focusPad}>
        <FlightView className="app-training-scene" state={state} body={BODY} intent={intent} scanning={scanHeld} targets={trainingRoute.targets} done={done} onFocus={onFocus} />
        <FlightHud
          objective={trainingRoute.intro}
          targets={trainingRoute.targets}
          results={progress.results}
          focus={focus}
          message={progress.message}
          completeText={routeComplete(done) ? trainingRoute.complete_text : null}
          hints={HINTS}
          onScanStart={() => setScanHeld(true)}
          onScanEnd={() => setScanHeld(false)}
          scanHeld={scanHeld}
        />
      </div>
      <PilotInput onIntent={setIntent} onInteract={press} />
    </section>
  )
}
