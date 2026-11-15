// Cutscene pictures for the story frame. Import these from app/; do not import ./canvas
// (that file pulls in three.js). The story frame already skips children under reduced motion.
import { lazy, Suspense } from 'react'
import type { CraftSpec } from '../scene3d/model'
import type { CutsceneCanvasProps } from './timing'
import './cutscenes.css'

export { CUTSCENE_SCENE_MS, type CutsceneSceneId } from './timing'

const Inner = lazy(() => import('./canvas').then((m) => ({ default: m.CutsceneCanvas })))

function Frame(props: CutsceneCanvasProps) {
  return (
    <Suspense fallback={<div className="cs" aria-busy="true" />}>
      <Inner {...props} />
    </Suspense>
  )
}

/** Mission control, played on arrival. */
export function ArrivalScene({ durationMs }: { durationMs?: number }) {
  return <Frame kind="arrival" durationMs={durationMs} />
}

/** Arrival in orbit. Earth has no orbit cutscene; pass the world you are flying to. */
export function OrbitArrivalScene({ body, durationMs, craft }: { body: 'moon' | 'mars'; durationMs?: number; craft?: CraftSpec }) {
  return <Frame kind="orbit" body={body} durationMs={durationMs} craft={craft} />
}

/** Red alarm while an anomaly card is waiting. */
export function AnomalyScene({ durationMs, craft }: { durationMs?: number; craft?: CraftSpec }) {
  return <Frame kind="anomaly" durationMs={durationMs} craft={craft} />
}

/** Data home, or the signal fading out. */
export function EndingScene({ outcome, durationMs, craft }: { outcome: 'success' | 'loss'; durationMs?: number; craft?: CraftSpec }) {
  return <Frame kind={outcome === 'success' ? 'ending-success' : 'ending-loss'} durationMs={durationMs} craft={craft} />
}

/** After launch: the hall doorway, then the walk-in spacecraft. */
export function EnterCraftScene({ durationMs }: { durationMs?: number }) {
  return <Frame kind="enter-craft" durationMs={durationMs} />
}

/** After the ending: back out of the spacecraft into mission control. */
export function ReturnControlScene({ durationMs }: { durationMs?: number }) {
  return <Frame kind="return-control" durationMs={durationMs} />
}
