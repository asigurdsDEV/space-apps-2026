import { lazy, Suspense, useState } from 'react'
import type { SimState } from '../../shared'
import { LaunchView, type LaunchViewProps } from '../scene3d'
import { interceptionTriggered, interceptOverride, isSandboxScenario, lightningOverride, lightningStruck } from './event'

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
  // One roll per launch: the interception below 20%, the lightning strike in the next 20%. ?intercept= and ?lightning=
  // force either on (the other is then off) or off (the other still rolls).
  const [event] = useState((): 'intercept' | 'lightning' | null => {
    if (!sandbox || props.failed) return null
    const intercept = interceptOverride()
    const lightning = lightningOverride()
    if (intercept) return 'intercept'
    if (lightning) return 'lightning'
    const seed = (Math.random() * 0x7fffffff) | 0
    if (intercept !== false && interceptionTriggered(seed)) return 'intercept'
    if (lightning !== false && lightningStruck(seed)) return 'lightning'
    return null
  })
  if (event && !props.failed) {
    return (
      <Suspense fallback={<p className="s3d-intercept-banner">Loading the launch…</p>}>
        <InterceptView event={event} state={props.state} onDone={props.onDone} onDesign={onDesign} reducedMotion={props.reducedMotion} className={props.className} />
      </Suspense>
    )
  }
  return <LaunchView {...props} />
}
