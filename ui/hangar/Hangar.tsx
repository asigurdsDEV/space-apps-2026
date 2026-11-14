// The walkable mission control (decision 005, V6). A view: it walks the camera to `station` and
// reports taps; app/ (or the preview) decides where to go. Loaded lazily from index.tsx.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { SimState } from '../../shared'
import { sceneSpec } from '../scene3d/model'
import { nextStation, prevStation, station as stationInfo, type StationId } from './model'
import { createHangar, type HangarWorld } from './world'

export interface HangarProps {
  /** Where the player should be. Changing it walks the camera there. */
  station: StationId
  /** The player asked to go somewhere (tapped a station, Next / Previous, Enter / → / ←). Without it the walk only follows `station`. */
  onSelect?: (id: StationId) => void
  /** The camera arrived at a station. */
  onArrive?: (id: StationId) => void
  /** The game state, to put the designed spacecraft on the assembly-bay stand. */
  state?: Pick<SimState, 'entities' | 'params'>
  /** Shown on the mission call wall (the scenario title). */
  title?: string
  className?: string
}

const media = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches
const LOOK_STEP = 0.12

export function Hangar({ station, onSelect, onArrive, state, title, className }: HangarProps) {
  const host = useRef<HTMLDivElement>(null)
  const world = useRef<HangarWorld | null>(null)
  const [failed, setFailed] = useState(false)
  const [here, setHere] = useState(station)
  const callbacks = useRef({ onSelect, onArrive })
  callbacks.current = { onSelect, onArrive }
  const craft = useMemo(() => (state ? sceneSpec(state).craft : null), [state?.entities, state?.params])

  useEffect(() => {
    try {
      world.current = createHangar(host.current!, {
        station,
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        onArrive: (id) => {
          setHere(id)
          callbacks.current.onArrive?.(id)
        },
        onPick: (id) => callbacks.current.onSelect?.(id),
      })
    } catch {
      setFailed(true) // no WebGL: the stations still read as text
    }
    return () => {
      world.current?.dispose()
      world.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => world.current?.goTo(station), [station])
  useEffect(() => world.current?.setCraft(craft), [craft])
  useEffect(() => {
    if (title) world.current?.setTitle(title)
  }, [title])

  const info = stationInfo(failed ? station : here)
  const select = onSelect
  const onKey = (e: KeyboardEvent) => {
    const look: Record<string, [number, number]> = { a: [LOOK_STEP, 0], d: [-LOOK_STEP, 0], w: [0, LOOK_STEP], s: [0, -LOOK_STEP] }
    const turn = look[e.key.toLowerCase()]
    if (turn) world.current?.look(...turn)
    else if (select && (e.key === 'ArrowRight' || e.key === 'Enter')) select(nextStation(station))
    else if (select && e.key === 'ArrowLeft') select(prevStation(station))
    else return
    e.preventDefault()
  }

  return (
    <figure className={`hg${className ? ` ${className}` : ''}`}>
      <div
        ref={host}
        className="hg-canvas"
        tabIndex={0}
        role="application"
        aria-roledescription="mission control"
        aria-label={`Mission control. You are at the ${info.name}. ${select ? 'Enter or right arrow: next station. Left arrow: previous. ' : ''}W A S D: look around.`}
        onKeyDown={onKey}
      />
      {failed && <div className="hg-fallback" aria-hidden="true" />}
      <figcaption className="hg-caption">
        <span className="hg-where" aria-live="polite">
          <strong>{info.name}</strong> · {info.task}
        </span>
        {select && (
          <span className="hg-nav">
            <button type="button" className="hg-button" onClick={() => select(prevStation(station))} disabled={station === 'wall'}>
              ◂ Back
            </button>
            <button type="button" className="hg-button" onClick={() => select(nextStation(station))} disabled={station === 'debrief'}>
              Next station ▸
            </button>
          </span>
        )}
      </figcaption>
    </figure>
  )
}
