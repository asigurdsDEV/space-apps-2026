import { lazy, Suspense, useState } from 'react'
import type { SimState } from '../../shared'
import { LaunchView, type LaunchViewProps } from '../scene3d'
import { interceptOverride, isSandboxScenario, lightningOverride, lightningStruck, openInterception } from './event'

const InterceptView = lazy(() => import('./InterceptView').then((m) => ({ default: m.InterceptView })))

export interface LaunchGateProps extends LaunchViewProps {
  /** When the fictional film ends in "return to design", the parent resets the simulation. */
  onDesign?: () => void
}

/**
 * Plays the normal launch, or, once per sandbox simulation, the interception film or the lightning strike (each 20%,
 * never both).
 * A failed launch (range safety, "Launch anyway") keeps the normal film. The roll is not repeated
 * while this view stays mounted. Resetting the simulation unmounts it, so the next launch rolls again.
 */
export function LaunchGate({ onDesign, ...props }: LaunchGateProps) {
  const scenario = 'scenario_id' in props.state ? String((props.state as Pick<SimState, 'scenario_id'>).scenario_id) : ''
  const sandbox = isSandboxScenario(scenario)
  const [run] = useState(() => {
    if (!sandbox || props.failed) return openInterception(1, 0.2, false)
    const forced = interceptOverride()
    if (forced !== undefined) return openInterception(1, 0.2, forced)
    return openInterception((Math.random() * 0x7fffffff) | 0)
  })
  // Same roll, the band above the interception's; forced on or off by ?lightning=.
  const [struck] = useState(() => sandbox && !props.failed && !run.triggered && (lightningOverride() ?? lightningStruck(run.seed)))
  if (sandbox && (run.triggered || struck) && !props.failed) {
    return (
      <Suspense fallback={<p className="s3d-intercept-banner">Loading the launch…</p>}>
        <InterceptView event={struck ? 'lightning' : 'intercept'} state={props.state} onDone={props.onDone} onDesign={onDesign} reducedMotion={props.reducedMotion} className={props.className} />
      </Suspense>
    )
  }
  return <LaunchView {...props} />
}
