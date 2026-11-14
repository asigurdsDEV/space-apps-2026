// Cutscene pictures for the story frame. Import these from app/; do not import ./canvas
// (that file pulls in three.js). The story frame already skips children under reduced motion.
import { lazy, Suspense } from 'react'
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
export function OrbitArrivalScene({ body, durationMs }: { body: 'moon' | 'mars'; durationMs?: number }) {
  return <Frame kind="orbit" body={body} durationMs={durationMs} />
}

/** Red alarm while an anomaly card is waiting. */
export function AnomalyScene({ durationMs }: { durationMs?: number }) {
  return <Frame kind="anomaly" durationMs={durationMs} />
}

/** Data home, or the signal fading out. */
export function EndingScene({ outcome, durationMs }: { outcome: 'success' | 'loss'; durationMs?: number }) {
  return <Frame kind={outcome === 'success' ? 'ending-success' : 'ending-loss'} durationMs={durationMs} />
}
