import { lazy, Suspense } from 'react'
import type { LaunchViewProps } from './LaunchView'
import './launch.css'

// three.js is most of the bundle, so the launch loads only when it is shown (same as ../index.tsx).
const Inner = lazy(() => import('./LaunchView').then((m) => ({ default: m.LaunchView })))

/** The launch cinematic between Build and Fly. The black `.s3d-launch` box holds the layout while the 3D code loads. */
export function LaunchView(props: LaunchViewProps) {
  return (
    <Suspense fallback={<figure className={`s3d-launch${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { LaunchViewProps } from './LaunchView'
export { formatMissionTime, launchTimeline, missionTime, stageAt, stageProgress, type LaunchStage, type LaunchTimeline, type StageId } from './timeline'
export { rocketSpec, type RocketSpec } from './vehicles'
