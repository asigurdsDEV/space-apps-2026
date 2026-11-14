import { lazy, Suspense } from 'react'
import type { SpaceViewProps } from './SpaceView'
import './scene3d.css'

// three.js is most of the bundle, so it loads only when a 3D view is on screen.
const Inner = lazy(() => import('./SpaceView').then((m) => ({ default: m.SpaceView })))

/** Same props as before. The black `.s3d` box holds the layout while the 3D code loads. */
export function SpaceView(props: SpaceViewProps) {
  return (
    <Suspense fallback={<figure className={`s3d${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { SpaceViewProps } from './SpaceView'
export { sceneSpec, type SceneSpec } from './model'
export type { ViewMode } from './world'
