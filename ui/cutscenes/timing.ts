import type { CraftSpec } from '../scene3d/model'
// Decision 005 durations match CUTSCENE_MS in ui/story/model.ts. Pass durationMs from
// CUTSCENE_MS when mounting those. enter-craft and return-control are decision 007 and
// are not story ids yet; claude@aiden adds the ids when the frame mounts them.

/** Cutscenes this folder draws. Launch stays in ui/scene3d. */
export type CutsceneSceneId =
  | 'arrival'
  | 'orbit'
  | 'anomaly'
  | 'ending-success'
  | 'ending-loss'
  | 'enter-craft'
  | 'return-control'

export interface CutsceneCanvasProps {
  kind: CutsceneSceneId
  /** Moon or Mars for the orbit-arrival shot. Ignored by the other scenes. */
  body?: 'moon' | 'mars'
  /** Defaults to CUTSCENE_SCENE_MS[kind]. The story frame should pass CUTSCENE_MS[id]. */
  durationMs?: number
  /** The player's spacecraft (`sceneSpec(state).craft`) for the orbit, alarm and ending shots. Omitted: a default small craft. */
  craft?: CraftSpec
}

/** Longest each scene animates. Each value is ≤ 10 s, same as the story frame. */
export const CUTSCENE_SCENE_MS: Record<CutsceneSceneId, number> = {
  arrival: 6000,
  orbit: 5000,
  anomaly: 3000,
  'ending-success': 6000,
  'ending-loss': 5000,
  'enter-craft': 8000,
  'return-control': 6000,
}

/** 0 at the start, 1 at durationMs, smooth in between. Reduced motion stays on the first frame. */
export function shotProgress(elapsedMs: number, durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || durationMs <= 0) return 0
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs))
  return t * t * (3 - 2 * t)
}
