import { lazy, Suspense } from 'react'
import type { HangarProps } from './Hangar'
import './hangar.css'

// three.js stays out of the first download: the hall loads when it's on screen (like ui/scene3d).
const Inner = lazy(() => import('./Hangar').then((m) => ({ default: m.Hangar })))

export function Hangar(props: HangarProps) {
  return (
    <Suspense fallback={<figure className={`hg${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { HangarProps } from './Hangar'
export { STATIONS, nextStation, prevStation, station, stationFor, walkMs, walkPose, type HangarScreen, type Station, type StationId } from './model'
