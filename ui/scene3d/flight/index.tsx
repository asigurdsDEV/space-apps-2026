import { lazy, Suspense } from 'react'
import type { FlightViewProps } from './FlightView'
import './flight.css'

// three.js is most of the bundle, so the flight loads only when it is shown (same as ../index.tsx).
const Inner = lazy(() => import('./FlightView').then((m) => ({ default: m.FlightView })))

/** Flight training (decision 006). The black `.s3d-flight` box holds the layout while the 3D code loads. */
export function FlightView(props: FlightViewProps) {
  return (
    <Suspense fallback={<figure className={`s3d-flight${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { FlightViewProps } from './FlightView'
export type { FlightTarget } from './model'
