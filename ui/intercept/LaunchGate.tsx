import { lazy, Suspense, useState } from 'react'
import type { SimState } from '../../shared'
import { LaunchView, type LaunchViewProps } from '../scene3d'
import { interceptOverride, isSandboxScenario, openInterception } from './event'

const InterceptView = lazy(() => import('./InterceptView').then((m) => ({ default: m.InterceptView })))

export interface LaunchGateProps extends LaunchViewProps {
  /** When the fictional film ends in "return to design", the parent resets the simulation. */
  onDesign?: () => void
}

/**
 * Plays the normal launch, or, once per sandbox simulation, the interception film.
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
  if (sandbox && run.triggered && !props.failed) {
    return (
      <Suspense fallback={<p className="s3d-intercept-banner">Interception warning. Loading the film…</p>}>
        <InterceptView state={props.state} onDone={props.onDone} onDesign={onDesign} reducedMotion={props.reducedMotion} className={props.className} />
      </Suspense>
    )
  }
  return <LaunchView {...props} />
}
