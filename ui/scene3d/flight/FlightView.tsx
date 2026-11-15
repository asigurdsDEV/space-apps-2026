import { useEffect, useRef, useState } from 'react'
import type { SimState } from '../../../shared'
import type { HudFocus } from '../../flight-hud/model'
import type { PilotIntent } from '../../pilot-input/model'
import { BODY_NAMES, sceneSpec, type Body } from '../model'
import type { FlightTarget } from './model'
import { createFlightScene, type FlightScene } from './scene'
import './flight.css'

export interface FlightViewProps {
  /** The view reads the picked parts (params) and their catalog rows (entities) to build the craft. It never sends commands. */
  state: Pick<SimState, 'entities' | 'params'>
  /** The latest intent from `<PilotInput onIntent>` (V1). Forward/back and up/down thrust; left/right turn the craft. */
  intent: PilotIntent
  /** The HUD's scan button is held (V2 `onScanStart` / `onScanEnd`). Counts the same as `intent.interact`. */
  scanning?: boolean
  /** The route's targets (V4 `trainingRoute.targets`). Read once, when the scene is made; ids without a place in the scene are left out. */
  targets: readonly FlightTarget[]
  /** Ids of the finished targets. The view keeps no progress of its own. */
  done: readonly string[]
  /**
   * The target in the crosshair, in the HUD's shape, or null. `held_s` counts up to the target's `hold_s` while a scan is
   * held on an in-range target that is still to do, and goes back to 0 when the hold or the aim is lost.
   * When `held_s` reaches `hold_s`, call `interact()` and add the id to `done`.
   */
  onFocus: (focus: HudFocus | null) => void
  /** Ground under the craft, in degrees. */
  onGround?: (lat: number, lon: number) => void
  /** The planet to fly around. Default: the one the mission's orbit goes around. */
  body?: Body
  /** Sizes the view; the default height is in flight.css. */
  className?: string
  /** No cloud drift, spinning targets or camera lag. Default: the system's "reduce motion" setting. */
  reducedMotion?: boolean
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

/** Flight training: the player's own craft, flown around the planet to the route's targets, with a chase camera. */
export function FlightView({ state, intent, scanning = false, targets, done, onFocus, onGround, body, className, reducedMotion }: FlightViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const still = reducedMotion ?? media('(prefers-reduced-motion: reduce)')
  const spec = sceneSpec(state)
  const planet = body ?? spec.body
  // Keyed by value: the app hands over a new state object every sim step, and that must not restart the flight.
  const key = JSON.stringify([planet, spec.craft])
  // The frame loop reads the latest props from here, so a key press never rebuilds the scene.
  const live = useRef({ intent, scanning, done, onFocus, onGround })
  live.current = { intent, scanning, done, onFocus, onGround }

  useEffect(() => {
    let scene: FlightScene | null = null
    try {
      scene = createFlightScene(host.current!, {
        body: planet,
        craft: spec.craft,
        targets,
        reducedMotion: still,
        input: () => live.current,
        onFocus: (focus) => live.current.onFocus(focus),
        onGround: (lat, lon) => live.current.onGround?.(lat, lon),
        onLost: () => setFailed(true),
      })
    } catch {
      setFailed(true) // no WebGL
    }
    return () => scene?.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, still])

  const text = `3D flight training: ${spec.names.bus ?? 'your spacecraft'} flying above ${BODY_NAMES[planet]}, with ${targets.length} targets to find.`
  return (
    <figure className={`s3d-flight${className ? ` ${className}` : ''}`}>
      <div ref={host} className="s3d-flight-canvas" role="img" aria-label={text} />
      {failed && <p className="s3d-flight-fallback">{text} The 3D view needs WebGL, which is turned off in this browser.</p>}
    </figure>
  )
}
