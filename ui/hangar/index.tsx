import { lazy, Suspense } from 'react'
import type { HangarProps } from './Hangar'
import type { MissionControlProps } from './MissionControl'
import '../fps/fps.css'
import './hangar.css'

// three.js stays out of the first download: the hall loads when it's on screen (like ui/scene3d).
const Inner = lazy(() => import('./Hangar').then((m) => ({ default: m.Hangar })))
const InnerControl = lazy(() => import('./MissionControl').then((m) => ({ default: m.MissionControl })))

/** Mission control you play in, first-person (decision 007). */
export function MissionControl(props: MissionControlProps) {
  return (
    <Suspense fallback={<div className={`mc${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <InnerControl {...props} />
    </Suspense>
  )
}

export function Hangar(props: HangarProps) {
  return (
    <Suspense fallback={<figure className={`hg${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { HangarProps } from './Hangar'
export type { MissionControlProps } from './MissionControl'
export type { Debrief } from './layout'
export { STATIONS, nextStation, prevStation, station, stationFor, walkMs, walkPose, type HangarScreen, type Station, type StationId } from './model'
