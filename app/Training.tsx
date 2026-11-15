// Survey (was flight training): fly the spacecraft to choose a patch of Earth, then float above it.
// Nothing here sends a command, and the mission's science, score and stars never change.
// `scan` and `partIds` stay for the old route checks; the storm and fire marks are not shown.

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { interact } from '../data/pilot-training'
import type { SimState } from '../shared'
import type { FlightHudProps, Results } from '../ui/flight-hud'
import { PilotInput, type PilotIntent } from '../ui/pilot-input'
import { isEarthScenario } from '../ui/probe/nasa'
import { FlightView } from '../ui/scene3d'

const ProbeExplorer = lazy(() => import('../ui/probe/ProbeExplorer'))

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

const IDLE: PilotIntent = { forward: 0, right: 0, up: 0, brake: false, interact: false }

const bodyOf = (state: Pick<SimState, 'entities'>) =>
  (['earth', 'moon', 'mars'] as const).find((id) => state.entities.some((entity) => entity.id === id)) ?? 'earth'

export interface TrainingProps {
  /** Read for the craft's parts only. */
  state: SimState
  /** The Back button or Esc. */
  onClose: () => void
}

export default function Training({ state, onClose }: TrainingProps) {
  const root = useRef<HTMLElement>(null)
  const where = useRef<HTMLElement>(null)
  const ground = useRef({ lat: 0, lon: 0 })
  const [intent, setIntent] = useState(IDLE)
  const [drop, setDrop] = useState<{ lat: number; lon: number } | null>(null)
  const earth = isEarthScenario(state.entities)

  const focusPad = () => root.current?.querySelector<HTMLElement>('.pi-pad')?.focus({ preventScroll: true })
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (drop) return
    root.current?.scrollIntoView()
    focusPad()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
      if (event.code !== 'KeyQ' || event.repeat || !earth) return
      event.preventDefault()
      setDrop({ ...ground.current })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drop, earth])

  if (drop) {
    return (
      <Suspense fallback={<p className="app-training-loading" aria-busy="true">Loading the ground…</p>}>
        <ProbeExplorer lat={drop.lat} lon={drop.lon} onClose={() => close.current()} />
      </Suspense>
    )
  }

  return (
    <section ref={root} className="app-training" aria-labelledby="app-training-title">
      <header className="app-training-bar">
        <div>
          <h2 id="app-training-title">Survey the planet</h2>
          <p className="game-muted">Practice only: nothing here changes your mission or your score. Fly to a place, then press Q to float above that ground.</p>
        </div>
        <button type="button" className="game-button app-small" onClick={onClose}>
          Back to the mission
        </button>
      </header>
      <div className="app-training-view" onClick={focusPad}>
        <FlightView
          className="app-training-scene"
          state={state}
          body={bodyOf(state)}
          intent={intent}
          targets={[]}
          done={[]}
          onFocus={() => {}}
          onGround={(lat, lon) => {
            ground.current = { lat, lon }
            if (where.current) where.current.textContent = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
          }}
        />
        <p className="game-muted" style={{ position: 'absolute', left: 16, bottom: 16, maxWidth: 420, margin: 0 }}>
          Ground under the craft: <strong ref={where}>—</strong>
          <br />
          {earth
            ? 'No storm or fire marks. W A S D fly, R up, F down. Q floats you above this spot. On the ground, Q returns to the ship.'
            : 'NASA’s elevation grid covers Earth. Fly around, then go back to the mission.'}
        </p>
      </div>
      <PilotInput onIntent={setIntent} onInteract={() => {}} />
    </section>
  )
}
