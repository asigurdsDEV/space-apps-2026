// The walk-in spacecraft (decision 007). three.js stays out of the first download: the room loads when it's on screen.
import { lazy, Suspense } from 'react'
import type { SpacecraftRoomProps } from './SpacecraftRoom'
import '../fps/fps.css'
import './interior.css'

const Inner = lazy(() => import('./SpacecraftRoom').then((m) => ({ default: m.SpacecraftRoom })))

export function SpacecraftRoom(props: SpacecraftRoomProps) {
  return (
    <Suspense fallback={<div className={`sc${props.className ? ` ${props.className}` : ''}`} aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

export type { SpacecraftRoomProps } from './SpacecraftRoom'
