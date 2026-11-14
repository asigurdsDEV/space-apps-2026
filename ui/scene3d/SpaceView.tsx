import { useEffect, useMemo, useRef, useState } from 'react'
import { flightOf, pills, type FlyState, type FlyStatus } from './fly'
import { caption, describe, sceneSpec } from './model'
import { createWorld, type QualityChoice, type ViewMode, type World } from './world'
import './scene3d.css'

export interface SpaceViewProps {
  /**
   * The builder's `{ entities, params }`, or a whole SimState unchanged. With a SimState in flight
   * the craft, the planet and the downlink follow `t_s`, `metrics`, `issues` and `status`.
   * The view never sends commands.
   */
  state: FlyState
  /** "spacecraft": close-up of the craft above the planet. "orbit": the planet, the orbit and the craft flying it. */
  mode?: ViewMode
  /** Show the name/orbit caption and the status chips (sunlight, downlink, time-lapse, how it ended). Default true. */
  showCaption?: boolean
  /** Sizes the view; the default height is in scene3d.css. */
  className?: string
  /**
   * Pulses a part in warning orange: a family ('bus' | 'power' | 'comms' | 'instrument'), a catalog
   * id, or an anomaly card's `console`. The whole craft pulses when no part carries that tag.
   */
  highlight?: string | null
  /** The app's pause flag. Without it the view still stops, a moment after `t_s` stops changing. */
  paused?: boolean
  /** Dev and tests: pin the render quality instead of picking by device. */
  quality?: QualityChoice
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches
const NO_STATUS: FlyStatus = { inShadow: false, link: null, rate: 0, timeLapse: false }

export function SpaceView({ state, mode = 'orbit', showCaption = true, className, highlight = null, paused, quality }: SpaceViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const world = useRef<World | null>(null)
  const spec = useMemo(() => sceneSpec(state), [state.entities, state.params])
  const flight = useMemo(() => flightOf(state), [state.entities, state.params, state.t_s, state.status, state.metrics, state.issues])
  const isPaused = paused ?? state.status === 'paused'
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState(NO_STATUS)
  const interactive = !media('(pointer: coarse)')

  // Created once; the effects below push spec, mode, flight and highlight changes into it.
  useEffect(() => {
    try {
      world.current = createWorld(host.current!, spec, {
        mode,
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        interactive,
        onStatus: setStatus,
        quality,
      })
    } catch {
      setFailed(true) // no WebGL
    }
    return () => {
      world.current?.dispose()
      world.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => world.current?.setSpec(spec), [spec])
  useEffect(() => world.current?.setMode(mode), [mode])
  useEffect(() => world.current?.setFlight(flight, isPaused), [flight, isPaused])
  useEffect(() => world.current?.setHighlight(highlight), [highlight])

  const chips = failed ? [] : pills(flight, status, { power: spec.craft.power, body: spec.body }, mode)
  const text = `${describe(spec)}${chips.length ? ` ${chips.map((c) => c.text).join('. ')}.` : ''}`
  return (
    <figure className={`s3d${className ? ` ${className}` : ''}`}>
      <div ref={host} className="s3d-canvas" role="img" aria-label={text} />
      {failed && <p className="s3d-fallback">{text} The 3D view needs WebGL, which is turned off in this browser.</p>}
      {showCaption && (
        <figcaption className="s3d-caption">
          <span>{caption(spec)}</span>
          {chips.map((c) => <span key={c.text} className={`s3d-chip is-${c.tone}`}>{c.text}</span>)}
          {interactive && !failed && <span className="s3d-hint">Drag to look around · scroll to zoom</span>}
        </figcaption>
      )}
    </figure>
  )
}
