// Survey (was flight training): fly the spacecraft to choose a patch of Earth, then float above it.
// Nothing here sends a command, and the mission's science, score and stars never change.
// `scan` and `partIds` stay for the old route checks; the storm and fire marks are not shown.

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { interact } from '../data/pilot-training'
import type { SimState } from '../shared'
import type { FlightHudProps, Results } from '../ui/flight-hud'
import { PilotInput, type PilotIntent } from '../ui/pilot-input'
import type { CrewPose } from '../ui/crew/crew'
import { isEarthScenario } from '../ui/probe/nasa'
import { FlightView } from '../ui/scene3d'
import { insidePatch, TAURUS_LITTROW } from '../ui/terrain/grid'
import type { SurveyBody, SurveyReport, SurveySpot } from './session'

const ProbeExplorer = lazy(() => import('../ui/probe/ProbeExplorer'))
const LunarExplorer = lazy(() => import('../ui/terrain/LunarExplorer'))

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

export interface SurveyLink {
  /** The host flies the landing spot. A guest follows it. */
  host: boolean
  seat: number
  report: (report: SurveyReport) => void
  subscribe: (listener: (spot: SurveySpot, crew: readonly SurveyBody[]) => void) => () => void
}

export interface TrainingProps {
  /** Read for the craft's parts only. */
  state: SimState
  /** The Back button or Esc. */
  onClose: () => void
  /** Online: one landing spot, shared by the crew. Solo leaves this out. */
  survey?: SurveyLink
  /** Moon hatch: open the lunar ground immediately, the way Earth opens its surface. */
  startOnSurface?: boolean
}

const EMPTY_SPOT: SurveySpot = { lat: 0, lon: 0, placed: false, landed: false }

export default function Training({ state, onClose, survey, startOnSurface = false }: TrainingProps) {
  const root = useRef<HTMLElement>(null)
  const where = useRef<HTMLElement>(null)
  const earth = isEarthScenario(state.entities)
  const moon = bodyOf(state) === 'moon'
  const ground = useRef(moon ? { ...TAURUS_LITTROW } : { lat: 0, lon: 0 })
  const link = useRef(survey)
  link.current = survey
  const [intent, setIntent] = useState(IDLE)
  const [drop, setDrop] = useState<{ lat: number; lon: number } | null>(null)
  const [spot, setSpot] = useState<SurveySpot>(EMPTY_SPOT)
  const [crew, setCrew] = useState<readonly CrewPose[]>([])
  const spotNow = useRef(spot)
  const crewNow = useRef(crew)
  spotNow.current = spot
  crewNow.current = crew
  const guest = !!survey && !survey.host
  // The host's hatch opens the valley. A guest waits until that spot exists.
  const [onMoon, setOnMoon] = useState(startOnSurface && moon && !guest)

  const focusPad = () => root.current?.querySelector<HTMLElement>('.pi-pad')?.focus({ preventScroll: true })
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const current = link.current
    if (!current) return
    return current.subscribe((next, bodies) => {
      setSpot(next)
      setCrew(bodies)
    })
  }, [survey?.subscribe])
  useEffect(() => () => {
    const here = ground.current
    link.current?.report({ down: false, x: 0, z: 0, yaw: 0, lat: here.lat, lon: here.lon })
  }, [])
  const locked = () => {
    const here = spotNow.current
    return here.placed && (here.landed || crewNow.current.length > 0)
  }
  const descendMoon = () => {
    if (guest) {
      const here = spotNow.current
      if (!here.placed) return
      ground.current = { lat: here.lat, lon: here.lon }
    } else if (locked()) {
      const here = spotNow.current
      ground.current = { lat: here.lat, lon: here.lon }
    } else if (!insidePatch(ground.current.lat, ground.current.lon)) {
      ground.current = { ...TAURUS_LITTROW }
    }
    setOnMoon(true)
  }
  const descendMoonRef = useRef(descendMoon)
  descendMoonRef.current = descendMoon
  useEffect(() => {
    if (drop || onMoon) return
    root.current?.scrollIntoView()
    focusPad()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current()
      if (event.code !== 'KeyQ' || event.repeat) return
      if (moon) {
        event.preventDefault()
        descendMoonRef.current()
        return
      }
      if (!earth) return
      if (guest) {
        const here = spotNow.current
        if (!here.placed) return
        event.preventDefault()
        ground.current = { lat: here.lat, lon: here.lon }
        setDrop({ lat: here.lat, lon: here.lon })
        return
      }
      event.preventDefault()
      if (locked()) {
        const here = spotNow.current
        ground.current = { lat: here.lat, lon: here.lon }
        setDrop({ lat: here.lat, lon: here.lon })
        return
      }
      setDrop({ ...ground.current })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drop, earth, guest, moon, onMoon])
  // A guest who already chose the hatch follows once the host has a spot.
  useEffect(() => {
    if (!startOnSurface || !guest || !moon || onMoon || !spot.placed) return
    ground.current = { lat: spot.lat, lon: spot.lon }
    setOnMoon(true)
  }, [startOnSurface, guest, moon, onMoon, spot.placed, spot.lat, spot.lon])
  // Leave the ship as soon as they drop, before the ground has loaded.
  useEffect(() => {
    if (!drop && !onMoon) return
    const seat = Math.min(link.current?.seat ?? 0, 3)
    const here = onMoon ? ground.current : drop!
    link.current?.report({ down: true, x: seat * 1.6, z: 4, yaw: 0, lat: here.lat, lon: here.lon })
  }, [drop, onMoon])

  if (onMoon) {
    return (
      <Suspense fallback={<p className="app-training-loading" aria-busy="true">Loading the ground…</p>}>
        <LunarExplorer
          leaveLabel={startOnSurface ? 'Return to the ship' : 'Back to orbit'}
          lat={ground.current.lat}
          lon={ground.current.lon}
          seat={survey?.seat ?? 0}
          crew={crew}
          onMove={(pose) => link.current?.report({ ...pose, down: true, lat: ground.current.lat, lon: ground.current.lon })}
          onClose={() => {
            const here = ground.current
            link.current?.report({ down: false, x: 0, z: 0, yaw: 0, lat: here.lat, lon: here.lon })
            if (startOnSurface) close.current()
            else setOnMoon(false)
          }}
        />
      </Suspense>
    )
  }

  if (drop) {
    return (
      <Suspense fallback={<p className="app-training-loading" aria-busy="true">Loading the ground…</p>}>
        <ProbeExplorer
          lat={drop.lat}
          lon={drop.lon}
          seat={survey?.seat ?? 0}
          crew={crew}
          onMove={(pose) => link.current?.report({ ...pose, down: true, lat: drop.lat, lon: drop.lon })}
          onClose={() => close.current()}
        />
      </Suspense>
    )
  }

  if (guest) {
    return (
      <section ref={root} className="app-training" aria-labelledby="app-training-title">
        <header className="app-training-bar">
          <div>
            <h2 id="app-training-title">Survey the planet</h2>
            <p className="game-muted">
              {spot.placed
                ? moon
                  ? `The host's landing spot is ${spot.lat.toFixed(2)}°, ${spot.lon.toFixed(2)}°. Press Q to walk there. Only the host can move the spot${spot.landed ? ', and it stays put while someone is on the ground' : ''}.`
                  : `The host's landing spot is ${spot.lat.toFixed(2)}°, ${spot.lon.toFixed(2)}°. Press Q to float down there. Only the host can move the spot.`
                : moon
                  ? 'Only the host can choose the lunar landing spot. This waits until they open Taurus-Littrow.'
                  : 'Only the host can move the landing spot. This waits until they fly to one.'}
            </p>
          </div>
          {moon && spot.placed && (
            <button type="button" className="game-button app-small" onClick={descendMoon}>
              Walk Taurus-Littrow
            </button>
          )}
          <button type="button" className="game-button app-small" onClick={onClose}>
            Back to the mission
          </button>
        </header>
      </section>
    )
  }
  const spotHeld = spot.placed && (spot.landed || crew.length > 0)

  return (
    <section ref={root} className="app-training" aria-labelledby="app-training-title">
      <header className="app-training-bar">
        <div>
          <h2 id="app-training-title">Survey the planet</h2>
          <p className="game-muted">
            {survey
              ? spotHeld
                ? 'Someone is on the ground, so the landing spot stays where it is. You can still go down to them.'
                : moon
                  ? 'You choose the landing spot. Fly over Taurus-Littrow, or open the valley. Once anyone is down, the spot stays put and their suit leaves the ship.'
                  : 'You choose the landing spot for the crew. Fly, then press Q. Anyone who follows floats there with you, and their suit leaves the ship.'
              : 'Practice only: nothing here changes your mission or your score. Fly to a place, then press Q to float above that ground.'}
          </p>
        </div>
        {moon && (
          <button type="button" className="game-button app-small" onClick={descendMoon}>
            Walk Taurus-Littrow
          </button>
        )}
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
            if (where.current) where.current.textContent = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
            if (locked()) return
            if (moon && !insidePatch(lat, lon)) return
            ground.current = { lat, lon }
            link.current?.report({ down: false, x: 0, z: 0, yaw: 0, lat, lon })
          }}
        />
        <p className="game-muted" style={{ position: 'absolute', left: 16, bottom: 16, maxWidth: 420, margin: 0 }}>
          Ground under the craft: <strong ref={where}>—</strong>
          <br />
          {moon
            ? 'Walk Taurus-Littrow opens the Apollo 17 ground from SLDEM2015. This orbit view is still here when you come back. Q on the ground returns to orbit.'
            : earth
              ? 'No storm or fire marks. W A S D fly, R up, F down. Q floats you above this spot. On the ground, Q returns to the ship.'
              : 'NASA’s elevation grid covers Earth. Fly around, then go back to the mission.'}
        </p>
      </div>
      <PilotInput onIntent={setIntent} onInteract={() => {}} />
    </section>
  )
}
