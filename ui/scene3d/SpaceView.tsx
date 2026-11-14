import { useEffect, useMemo, useRef, useState } from 'react'
import type { SimState } from '../../shared'
import { cruiseCaption, cruiseDays } from './cruise'
import { caption, describe, sceneSpec } from './model'
import { createWorld, type ViewMode, type World } from './world'
import './scene3d.css'

export interface SpaceViewProps {
  /** The view reads the picked parts (params) and their catalog rows (entities). It never sends commands. */
  state: Pick<SimState, 'entities' | 'params'>
  /**
   * "spacecraft": close-up of the craft above the planet. "orbit": the planet, the orbit and the craft flying it.
   * "cruise": Earth → the Moon or Mars on the transfer arc (an Earth orbit shows "orbit" instead).
   */
  mode?: ViewMode
  /** Cruise mode only: 0–1 along the trip, e.g. `cruiseProgress(t_s, days)`. Omitted: the craft loops along the arc. */
  progress?: number
  /** Show the name/orbit caption (and sunlight/shadow in orbit mode). Default true. */
  showCaption?: boolean
  /** Sizes the view; the default height is in scene3d.css. */
  className?: string
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

export function SpaceView({ state, mode = 'orbit', progress, showCaption = true, className }: SpaceViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const world = useRef<World | null>(null)
  const spec = useMemo(() => sceneSpec(state), [state.entities, state.params])
  const [failed, setFailed] = useState(false)
  const [inShadow, setInShadow] = useState(false)
  const interactive = !media('(pointer: coarse)')

  // Created once; the two effects below push spec and mode changes into it.
  useEffect(() => {
    try {
      world.current = createWorld(host.current!, spec, {
        mode,
        reducedMotion: media('(prefers-reduced-motion: reduce)'),
        interactive,
        onShadow: setInShadow,
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
  useEffect(() => world.current?.setProgress(progress ?? null), [progress])

  const text = describe(spec)
  const cruising = mode === 'cruise' && spec.body !== 'earth'
  return (
    <figure className={`s3d${className ? ` ${className}` : ''}`}>
      <div ref={host} className="s3d-canvas" role="img" aria-label={text} />
      {failed && <p className="s3d-fallback">{text} The 3D view needs WebGL, which is turned off in this browser.</p>}
      {showCaption && (
        <figcaption className="s3d-caption">
          <span>{cruising && spec.body !== 'earth' ? cruiseCaption(spec.body, cruiseDays(state), progress) : caption(spec)}</span>
          {(mode === 'orbit' || (mode === 'cruise' && !cruising)) && !failed && (
            <span className={`s3d-sun${inShadow ? ' is-shadow' : ''}`}>{inShadow ? 'In shadow: running on battery' : 'In sunlight'}</span>
          )}
          {interactive && !failed && <span className="s3d-hint">Drag to look around · scroll to zoom</span>}
        </figcaption>
      )}
    </figure>
  )
}
